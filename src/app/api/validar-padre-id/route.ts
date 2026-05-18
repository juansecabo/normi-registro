import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Valida que una identificación de padre no esté ya en uso por otro perfil.
 * Fase 10: usa Acudientes + Estudiantes; fallback PG legacy.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  // 1. ¿El id ya está como acudiente_id en Acudientes? (modelo nuevo)
  const { data: existingAcud } = await supabase
    .from("Acudientes")
    .select("acudiente_id")
    .eq("acudiente_id", id)
    .limit(1);

  if (existingAcud && existingAcud.length > 0) {
    return NextResponse.json({
      ya_registrado: true,
      mensaje: "Ya alguien se registró con esta identificación. Comunícate con la institución.",
    });
  }

  // 2. ¿El id es de un estudiante con teléfono registrado? (modelo nuevo)
  const { data: estudianteConTel } = await supabase
    .from("Estudiantes")
    .select("id_estudiantil")
    .eq("id_estudiantil", id)
    .not("numero_de_telefono", "is", null)
    .limit(1);

  if (estudianteConTel && estudianteConTel.length > 0) {
    return NextResponse.json({
      ya_registrado: true,
      mensaje: "Ya alguien se registró con esta identificación como estudiante. Comunícate con la institución.",
    });
  }

  // 3. Fallback legacy: Perfiles_Generales
  const { data: existingPadre } = await supabase
    .from("Perfiles_Generales")
    .select("numero_de_telefono")
    .eq("padre_id", id)
    .not("padre_id", "is", null)
    .limit(1);

  if (existingPadre && existingPadre.length > 0) {
    return NextResponse.json({
      ya_registrado: true,
      mensaje: "Ya alguien se registró con esta identificación. Comunícate con la institución.",
    });
  }

  const { data: existingEstudiante } = await supabase
    .from("Perfiles_Generales")
    .select("numero_de_telefono")
    .eq("estudiante_id", id)
    .limit(1);

  if (existingEstudiante && existingEstudiante.length > 0) {
    return NextResponse.json({
      ya_registrado: true,
      mensaje: "Ya alguien se registró con esta identificación como estudiante. Comunícate con la institución.",
    });
  }

  return NextResponse.json({ ya_registrado: false });
}
