import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica si un teléfono ya está registrado en el sistema.
 * Fase 10: usa Usuarios (global), Estudiantes y Acudientes en lugar de Perfiles_Generales.
 */
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Falta el parámetro phone" }, { status: 400 });
  }

  const phoneLocal = phone.startsWith("57") ? phone.slice(2) : phone;

  // 1. Check Usuarios (modelo nuevo, global): si el teléfono ya está y tiene contraseña, está registrado.
  const { data: usuario } = await supabase
    .from("Usuarios")
    .select("id, contrasena, numero_de_telefono")
    .eq("numero_de_telefono", phone)
    .maybeSingle();

  if (usuario && usuario.contrasena) {
    return NextResponse.json({ yaRegistrado: true });
  }

  // También con phoneLocal por si el teléfono se guardó sin código país
  if (!usuario) {
    const { data: usuarioLocal } = await supabase
      .from("Usuarios")
      .select("id, contrasena")
      .eq("numero_de_telefono", phoneLocal)
      .maybeSingle();
    if (usuarioLocal && usuarioLocal.contrasena) {
      return NextResponse.json({ yaRegistrado: true });
    }
  }

  // 2. Fallback legacy: Perfiles_Generales (mientras dure la transición)
  const { data: perfilLegacy } = await supabase
    .from("Perfiles_Generales")
    .select("perfil, contrasena, estudiante_id, padre_id")
    .eq("numero_de_telefono", phone)
    .maybeSingle();

  if (perfilLegacy && perfilLegacy.contrasena) {
    return NextResponse.json({ yaRegistrado: true });
  }

  // 3. ¿Es acudiente de algún estudiante? Buscar en Estudiantes.telefono_acudiente
  const selectCols = "id_estudiantil, nombre_estudiante, apellidos_estudiante, nivel_estudiante, grado_estudiante, salon_estudiante, nombre_acudiente, telefono_acudiente, nombre_acudiente2, telefono_acudiente2, nombre_acudiente3, telefono_acudiente3";
  const [r1, r2, r3] = await Promise.all([
    supabase.from("Estudiantes").select(selectCols).contains("telefono_acudiente", [phoneLocal]),
    supabase.from("Estudiantes").select(selectCols).contains("telefono_acudiente2", [phoneLocal]),
    supabase.from("Estudiantes").select(selectCols).contains("telefono_acudiente3", [phoneLocal]),
  ]);

  const porEstudiante = new Map<number, { row: any; slot: 1 | 2 | 3 }>();
  for (const row of r1.data || []) if (!porEstudiante.has(row.id_estudiantil)) porEstudiante.set(row.id_estudiantil, { row, slot: 1 });
  for (const row of r2.data || []) if (!porEstudiante.has(row.id_estudiantil)) porEstudiante.set(row.id_estudiantil, { row, slot: 2 });
  for (const row of r3.data || []) if (!porEstudiante.has(row.id_estudiantil)) porEstudiante.set(row.id_estudiantil, { row, slot: 3 });

  const matches = Array.from(porEstudiante.values());

  if (matches.length > 0) {
    const first = matches[0];
    const nombreAcudiente =
      (first.slot === 1 ? first.row.nombre_acudiente :
       first.slot === 2 ? first.row.nombre_acudiente2 :
       first.row.nombre_acudiente3) || "";
    const estudiantes = matches.map(m => m.row);
    const gradoOrden: Record<string, number> = {
      "Prejardín": 0, "Pre-Jardín": 1, "Jardín": 2, "Transición": 3,
      "Primero": 4, "Segundo": 5, "Tercero": 6, "Cuarto": 7, "Quinto": 8,
      "Sexto": 9, "Séptimo": 10, "Octavo": 11, "Noveno": 12,
      "Décimo": 13, "Undécimo": 14,
    };
    const hijos = estudiantes.map((e: any) => ({
      id: String(e.id_estudiantil),
      nombre: e.nombre_estudiante,
      apellidos: e.apellidos_estudiante,
      nivel: e.nivel_estudiante,
      grado: e.grado_estudiante,
      salon: e.salon_estudiante,
    })).sort((a: any, b: any) => {
      const ga = gradoOrden[a.grado] ?? 99;
      const gb = gradoOrden[b.grado] ?? 99;
      if (ga !== gb) return ga - gb;
      return (a.salon || "").localeCompare(b.salon || "");
    });

    return NextResponse.json({
      yaRegistrado: false,
      esPadre: true,
      nombreAcudiente,
      estudiantes: hijos,
    });
  }

  // 4. No es acudiente, asume estudiante
  return NextResponse.json({
    yaRegistrado: false,
    esPadre: false,
  });
}
