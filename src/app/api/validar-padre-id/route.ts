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

  // 2. ¿El id es de un estudiante con teléfono registrado? (Fase 10.E.15: tel en Usuarios)
  // Es estudiante registrado si existe en Estudiantes Y su fila Usuarios tiene teléfono.
  const { data: estRow } = await supabase
    .from("Estudiantes")
    .select("id")
    .eq("id", id)
    .limit(1);
  if (estRow && estRow.length > 0) {
    const { data: usrConTel } = await supabase
      .from("Usuarios")
      .select("id")
      .eq("id", id)
      .not("numero_de_telefono", "is", null)
      .limit(1);
    if (usrConTel && usrConTel.length > 0) {
      return NextResponse.json({
        ya_registrado: true,
        mensaje: "Ya alguien se registró con esta identificación como estudiante. Comunícate con la institución.",
      });
    }
  }

  return NextResponse.json({ ya_registrado: false });
}
