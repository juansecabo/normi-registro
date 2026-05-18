import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Guarda el perfil de registro de un usuario nuevo.
 * Fase 10: escribe en Usuarios (identidad global) + Estudiantes (si es estudiante)
 * o Acudientes (si es acudiente). Mantiene dual-write a Perfiles_Generales por
 * compat (el trigger DB también sincroniza, pero hacemos explícito).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, perfil, ...campos } = body;
  // `id` aquí es el numero_de_telefono (es así como llega del flujo de registro)
  const numero_de_telefono = id;

  if (!numero_de_telefono || !perfil) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // 1. Validaciones de duplicación según perfil
  const allIds: string[] = [];
  if (perfil === "Estudiante") {
    if (!campos.estudiante_id) {
      return NextResponse.json({ error: "Falta el id estudiantil" }, { status: 400 });
    }
    allIds.push(String(campos.estudiante_id));
  } else if (perfil === "Padre de familia") {
    if (!campos.padre_nombre || !campos.padre_numero_de_estudiantes) {
      return NextResponse.json({ error: "Faltan datos del padre" }, { status: 400 });
    }
    if (campos.padre_id) allIds.push(String(campos.padre_id));
    const numMap: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3, "4 (cuatro)": 4 };
    const num = numMap[campos.padre_numero_de_estudiantes] || 0;
    for (let i = 1; i <= num; i++) {
      const idKey = `padre_estudiante${i}_id`;
      if (!campos[idKey]) {
        return NextResponse.json({ error: `Falta el id del estudiante ${i}` }, { status: 400 });
      }
      allIds.push(String(campos[idKey]));
    }
  }

  // Duplicados en el mismo submit
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    return NextResponse.json({ error: "No puedes registrar el mismo id para más de un estudiante" }, { status: 400 });
  }

  // Validar que los ids de estudiantes existen en Estudiantes
  const studentIds: string[] = perfil === "Estudiante"
    ? [String(campos.estudiante_id)]
    : allIds.filter(x => x !== String(campos.padre_id));
  for (const idEst of studentIds) {
    const { data: est } = await supabase
      .from("Estudiantes")
      .select("id_estudiantil")
      .eq("id_estudiantil", idEst)
      .single();
    if (!est) {
      return NextResponse.json({ error: `Documento ${idEst} no encontrado` }, { status: 400 });
    }
  }

  // Cross-validation: el padre_id/estudiante_id no debe estar usado en otro perfil
  if (perfil === "Padre de familia" && campos.padre_id) {
    // Verificar contra Acudientes (modelo nuevo)
    const { data: dupAcud } = await supabase
      .from("Acudientes")
      .select("acudiente_id")
      .eq("acudiente_id", String(campos.padre_id))
      .limit(1);
    if (dupAcud && dupAcud.length > 0) {
      return NextResponse.json({
        error: "Ya alguien se registró con esta identificación. Comunícate con la institución.",
      }, { status: 409 });
    }
    // Verificar que no esté usado como estudiante con teléfono
    const { data: estCon } = await supabase
      .from("Estudiantes")
      .select("id_estudiantil")
      .eq("id_estudiantil", String(campos.padre_id))
      .not("numero_de_telefono", "is", null)
      .limit(1);
    if (estCon && estCon.length > 0) {
      return NextResponse.json({
        error: "Ya alguien se registró con esta identificación como estudiante. Comunícate con la institución.",
      }, { status: 409 });
    }
  }

  if (perfil === "Estudiante" && campos.estudiante_id) {
    const { data: estDup } = await supabase
      .from("Estudiantes")
      .select("id_estudiantil")
      .eq("id_estudiantil", String(campos.estudiante_id))
      .not("numero_de_telefono", "is", null)
      .limit(1);
    if (estDup && estDup.length > 0) {
      return NextResponse.json({
        error: "Ya alguien se registró con esta identificación. Comunícate con la institución.",
      }, { status: 409 });
    }
    const { data: acudDup } = await supabase
      .from("Acudientes")
      .select("acudiente_id")
      .eq("acudiente_id", String(campos.estudiante_id))
      .limit(1);
    if (acudDup && acudDup.length > 0) {
      return NextResponse.json({
        error: "Ya alguien se registró con esta identificación como padre de familia. Comunícate con la institución.",
      }, { status: 409 });
    }
  }

  // 2. Determinar el id_usuario y obtener colegio_id del estudiante de referencia
  const userId = perfil === "Estudiante" ? String(campos.estudiante_id) : String(campos.padre_id);

  // Obtener colegio_id desde el primer estudiante referenciado
  const refStudentId = studentIds[0];
  const { data: refEst } = await supabase
    .from("Estudiantes")
    .select("colegio_id, nombre_estudiante, apellidos_estudiante")
    .eq("id_estudiantil", refStudentId)
    .single();
  if (!refEst) {
    return NextResponse.json({ error: "No se pudo determinar el colegio del estudiante" }, { status: 400 });
  }
  const colegio_id = refEst.colegio_id;

  // 3. Escribir en Usuarios (identidad global)
  const usuarioNombres = perfil === "Estudiante"
    ? refEst.nombre_estudiante
    : (campos.padre_nombre || "").split(" ").slice(0, -2).join(" ") || campos.padre_nombre;
  const usuarioApellidos = perfil === "Estudiante"
    ? refEst.apellidos_estudiante
    : (campos.padre_nombre || "").split(" ").slice(-2).join(" ");

  const usuarioPayload: any = {
    id: userId,
    nombres: usuarioNombres,
    apellidos: usuarioApellidos,
    numero_de_telefono,
  };
  if (campos.contrasena) usuarioPayload.contrasena = campos.contrasena;

  const { error: usuarioError } = await supabase
    .from("Usuarios")
    .upsert(usuarioPayload, { onConflict: "id" });
  if (usuarioError) {
    return NextResponse.json({ error: `Error guardando usuario: ${usuarioError.message}` }, { status: 500 });
  }

  // 4. Escribir en tabla operativa
  if (perfil === "Estudiante") {
    // Update Estudiantes con su teléfono
    const { error: estError } = await supabase
      .from("Estudiantes")
      .update({ numero_de_telefono })
      .eq("id_estudiantil", String(campos.estudiante_id))
      .eq("colegio_id", colegio_id);
    if (estError) {
      return NextResponse.json({ error: `Error actualizando estudiante: ${estError.message}` }, { status: 500 });
    }
  } else if (perfil === "Padre de familia") {
    // Insertar en Acudientes
    const numMap: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3, "4 (cuatro)": 4 };
    const numH = numMap[campos.padre_numero_de_estudiantes] || 0;
    const acudPayload: any = {
      acudiente_id: userId,
      colegio_id,
      numero_de_acudidos: campos.padre_numero_de_estudiantes,
    };
    for (let i = 1; i <= numH; i++) {
      acudPayload[`acudido${i}_id`] = campos[`padre_estudiante${i}_id`] ? Number(campos[`padre_estudiante${i}_id`]) : null;
    }
    const { error: acudError } = await supabase
      .from("Acudientes")
      .upsert(acudPayload, { onConflict: "acudiente_id,colegio_id" });
    if (acudError) {
      return NextResponse.json({ error: `Error guardando acudiente: ${acudError.message}` }, { status: 500 });
    }
  }

  // 5. Dual-write a Perfiles_Generales por compat (trigger también lo cubre pero hacemos explícito)
  const pgUpdateData: Record<string, string | number | null> = { perfil };
  if (campos.contrasena) pgUpdateData.contrasena = campos.contrasena;
  if (perfil === "Estudiante") {
    pgUpdateData.estudiante_id = campos.estudiante_id;
  } else if (perfil === "Padre de familia") {
    pgUpdateData.padre_nombre = campos.padre_nombre;
    pgUpdateData.padre_numero_de_estudiantes = campos.padre_numero_de_estudiantes;
    if (campos.padre_id) pgUpdateData.padre_id = campos.padre_id;
    const numMap: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3, "4 (cuatro)": 4 };
    const num = numMap[campos.padre_numero_de_estudiantes] || 0;
    for (let i = 1; i <= num; i++) {
      pgUpdateData[`padre_estudiante${i}_id`] = campos[`padre_estudiante${i}_id`];
    }
  }

  // Si la fila ya existe en PG (por teléfono), update; si no, insert
  const { data: existingPg } = await supabase
    .from("Perfiles_Generales")
    .select("numero_de_telefono")
    .eq("numero_de_telefono", numero_de_telefono)
    .single();

  if (existingPg) {
    await supabase
      .from("Perfiles_Generales")
      .update(pgUpdateData)
      .eq("numero_de_telefono", numero_de_telefono);
  } else {
    await supabase
      .from("Perfiles_Generales")
      .insert({ numero_de_telefono, colegio_id, ...pgUpdateData });
  }

  return NextResponse.json({ ok: true });
}
