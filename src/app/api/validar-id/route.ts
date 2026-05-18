import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Valida que un id estudiantil exista en Estudiantes y no esté ya en uso por otro perfil.
 * Fase 10: usa Estudiantes + Acudientes + Usuarios; fallback PG legacy.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const perfil = request.nextUrl.searchParams.get("perfil") || "Estudiante";

  if (!id) {
    return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
  }

  const { data: estudiante, error } = await supabase
    .from("Estudiantes")
    .select("id_estudiantil, nombres, apellidos, nivel, grado, salon, numero_de_telefono")
    .eq("id_estudiantil", id)
    .single();

  if (error || !estudiante) {
    return NextResponse.json({ existe: false, ya_registrado: false });
  }

  let ya_registrado = false;
  let mensaje = "";

  if (perfil === "Estudiante") {
    // 1. ¿El estudiante ya tiene un teléfono registrado en Estudiantes? (modelo nuevo)
    if (estudiante.numero_de_telefono) {
      ya_registrado = true;
      mensaje = "Ya alguien se registró con esta identificación. Comunícate con la institución.";
    }

    // 2. ¿El id está usado como id? (modelo nuevo)
    if (!ya_registrado) {
      const { data: existingAcud } = await supabase
        .from("Acudientes")
        .select("id")
        .eq("id", id)
        .limit(1);
      if (existingAcud && existingAcud.length > 0) {
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
      nombre: estudiante.nombres,
      apellidos: estudiante.apellidos,
      nivel: estudiante.nivel,
      grado: estudiante.grado,
      salon: estudiante.salon,
    },
  });
}
