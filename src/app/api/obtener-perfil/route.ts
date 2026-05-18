import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Obtiene el perfil actual de un usuario por su teléfono.
 * Fase 10: lee de Usuarios + Estudiantes + Acudientes con fallback a Perfiles_Generales.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  // 1. Buscar primero en Usuarios por teléfono (modelo nuevo)
  const { data: usuario } = await supabase
    .from("Usuarios")
    .select("id, nombres, apellidos, contrasena, numero_de_telefono")
    .eq("numero_de_telefono", id)
    .maybeSingle();

  if (usuario) {
    // Verificar si es estudiante o acudiente
    const [estRes, acudRes] = await Promise.all([
      supabase.from("Estudiantes")
        .select("id_estudiantil, nombre_estudiante, apellidos_estudiante, nivel_estudiante, grado_estudiante, salon_estudiante")
        .eq("id_estudiantil", parseInt(usuario.id))
        .maybeSingle(),
      supabase.from("Acudientes")
        .select("acudiente_id, numero_de_acudidos, acudido1_id, acudido2_id, acudido3_id, acudido4_id")
        .eq("acudiente_id", usuario.id)
        .maybeSingle(),
    ]);

    if (estRes.data) {
      // Es estudiante
      return NextResponse.json({
        existe: true,
        ya_registrado: !!usuario.contrasena,
        datos_actuales: {
          perfil: "Estudiante",
          numero_de_telefono: id,
          estudiante_id: estRes.data.id_estudiantil,
          estudiante_nombre: estRes.data.nombre_estudiante,
          estudiante_apellidos: estRes.data.apellidos_estudiante,
          estudiante_nivel: estRes.data.nivel_estudiante,
          estudiante_grado: estRes.data.grado_estudiante,
          estudiante_salon: estRes.data.salon_estudiante,
          contrasena: usuario.contrasena,
        },
      });
    }

    if (acudRes.data) {
      // Es acudiente — armar formato compatible con el flujo de registro
      const a = acudRes.data;
      const numHijos = ["1 (uno)", "2 (dos)", "3 (tres)", "4 (cuatro)"].indexOf(a.numero_de_acudidos || "") + 1;
      const datos: any = {
        perfil: "Padre de familia",
        numero_de_telefono: id,
        padre_id: usuario.id,
        padre_nombre: `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim(),
        padre_numero_de_estudiantes: a.numero_de_acudidos,
        contrasena: usuario.contrasena,
      };
      const hijoIds = [a.acudido1_id, a.acudido2_id, a.acudido3_id, a.acudido4_id].filter(Boolean);
      if (hijoIds.length > 0) {
        const { data: estsData } = await supabase
          .from("Estudiantes")
          .select("id_estudiantil, nombre_estudiante, apellidos_estudiante, nivel_estudiante, grado_estudiante, salon_estudiante")
          .in("id_estudiantil", hijoIds);
        for (let i = 0; i < hijoIds.length; i++) {
          const e = (estsData || []).find((x: any) => x.id_estudiantil === hijoIds[i]);
          if (!e) continue;
          datos[`padre_estudiante${i + 1}_id`] = e.id_estudiantil;
          datos[`padre_estudiante${i + 1}_nombre`] = e.nombre_estudiante;
          datos[`padre_estudiante${i + 1}_apellidos`] = e.apellidos_estudiante;
          datos[`padre_estudiante${i + 1}_nivel`] = e.nivel_estudiante;
          datos[`padre_estudiante${i + 1}_grado`] = e.grado_estudiante;
          datos[`padre_estudiante${i + 1}_salon`] = e.salon_estudiante;
        }
      }
      const required = numHijos > 0 ? numHijos : 0;
      const ya_registrado = required > 0 && !!usuario.contrasena && hijoIds.length >= required;
      return NextResponse.json({
        existe: true,
        ya_registrado,
        datos_actuales: datos,
      });
    }

    // Usuario existe pero no es estudiante ni acudiente (caso raro: solo interno o sin rol asignado)
    return NextResponse.json({
      existe: true,
      ya_registrado: !!usuario.contrasena,
      datos_actuales: { numero_de_telefono: id, contrasena: usuario.contrasena },
    });
  }

  // 2. Fallback legacy: Perfiles_Generales
  const { data, error } = await supabase
    .from("Perfiles_Generales")
    .select("*")
    .eq("numero_de_telefono", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ existe: false, ya_registrado: false });
  }

  let ya_registrado = false;
  if (data.perfil === "Estudiante") {
    ya_registrado = !!data.estudiante_id && !!data.contrasena;
  } else if (data.perfil === "Padre de familia") {
    const numMap: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3, "4 (cuatro)": 4 };
    const required = numMap[data.padre_numero_de_estudiantes] || 0;
    if (required > 0 && data.padre_nombre && data.contrasena && data.padre_id) {
      const ids = [data.padre_estudiante1_id, data.padre_estudiante2_id, data.padre_estudiante3_id, data.padre_estudiante4_id];
      ya_registrado = ids.slice(0, required).every((c: string | null) => !!c);
    }
  }

  return NextResponse.json({
    existe: true,
    ya_registrado,
    datos_actuales: data,
  });
}
