import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const perfil = request.nextUrl.searchParams.get("perfil") || "Estudiante";

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  // Look up the student in the Estudiantes table
  const { data: estudiante, error } = await supabase
    .from("Estudiantes")
    .select("id_estudiantil, nombre_estudiante, apellidos_estudiante, nivel_estudiante, grado_estudiante, salon_estudiante")
    .eq("id_estudiantil", id)
    .single();

  if (error || !estudiante) {
    return NextResponse.json({ existe: false, ya_registrado: false });
  }

  let ya_registrado = false;
  let mensaje = "";

  if (perfil === "Estudiante") {
    // Check the id isn't already taken by another student
    const { data: existing } = await supabase
      .from("Perfiles_Generales")
      .select("numero_de_telefono")
      .eq("estudiante_id", id)
      .limit(1);

    if (existing && existing.length > 0) {
      ya_registrado = true;
      mensaje = "Ya alguien se registró con esta identificación. Comunícate con la institución.";
    }

    // Check the id isn't already used as a parent identification
    if (!ya_registrado) {
      const { data: existingPadre } = await supabase
        .from("Perfiles_Generales")
        .select("numero_de_telefono")
        .eq("padre_id", id)
        .not("padre_id", "is", null)
        .limit(1);

      if (existingPadre && existingPadre.length > 0) {
        ya_registrado = true;
        mensaje = "Ya alguien se registró con esta identificación como padre de familia. Comunícate con la institución.";
      }
    }
  }

  return NextResponse.json({
    existe: true,
    ya_registrado,
    mensaje,
    estudiante: {
      nombre: estudiante.nombre_estudiante,
      apellidos: estudiante.apellidos_estudiante,
      nivel: estudiante.nivel_estudiante,
      grado: estudiante.grado_estudiante,
      salon: estudiante.salon_estudiante,
    },
  });
}
