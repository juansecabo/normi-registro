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

  // 1. ¿El id ya está como id en Acudientes? (modelo nuevo)
  const { data: existingAcud } = await supabase
    .from("Acudientes")
    .select("id")
    .eq("id", id)
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

  return NextResponse.json({ ya_registrado: false });
}
