import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  // Check if already used as parent identification
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

  // Check if already used as student identification
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
