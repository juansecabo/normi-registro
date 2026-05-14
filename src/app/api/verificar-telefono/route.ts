import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Falta el parámetro phone" }, { status: 400 });
  }

  // Strip country code (57) if present
  const phoneLocal = phone.startsWith("57") ? phone.slice(2) : phone;

  // 1. Check if already registered in Perfiles_Generales
  const { data: perfil } = await supabase
    .from("Perfiles_Generales")
    .select("perfil, contrasena, estudiante_id, padre_id")
    .eq("numero_de_telefono", phone)
    .maybeSingle();

  if (perfil && perfil.contrasena) {
    return NextResponse.json({ yaRegistrado: true });
  }

  // Also check with local phone (without 57)
  if (!perfil) {
    const { data: perfilLocal } = await supabase
      .from("Perfiles_Generales")
      .select("perfil, contrasena")
      .eq("numero_de_telefono", phoneLocal)
      .maybeSingle();

    if (perfilLocal && perfilLocal.contrasena) {
      return NextResponse.json({ yaRegistrado: true });
    }
  }

  // 2. Check if phone exists in any of Estudiantes.telefono_acudiente{,2,3}
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
    // It's a parent - get acudiente name from the slot that matched in the first student
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

  // 3. Not a parent - assume student
  return NextResponse.json({
    yaRegistrado: false,
    esPadre: false,
  });
}
