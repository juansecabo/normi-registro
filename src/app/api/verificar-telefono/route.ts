import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifica si un teléfono ya está registrado en el sistema.
 * Usa Usuarios (global), Estudiantes y Acudientes.
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

  // 2. ¿Es acudiente de algún estudiante? Fase 10.E.17: ya no leemos
  // Estudiantes.acudienteN_telefono (legacy). Buscamos el usuario por teléfono
  // y, si tiene fila en Acudientes, listamos sus acudidos.
  const { data: usuarioAcud } = await supabase
    .from("Usuarios")
    .select("id, nombres, apellidos, numero_de_telefono")
    .or(`numero_de_telefono.eq.${phone},numero_de_telefono.eq.${phoneLocal}`)
    .maybeSingle();

  if (usuarioAcud) {
    const { data: acudRow } = await supabase
      .from("Acudientes")
      .select("id, acudido1_id, acudido2_id, acudido3_id, acudido4_id")
      .eq("id", usuarioAcud.id)
      .maybeSingle();

    if (acudRow) {
      const hijoIds = [acudRow.acudido1_id, acudRow.acudido2_id, acudRow.acudido3_id, acudRow.acudido4_id]
        .filter((x: any) => x != null);

      if (hijoIds.length > 0) {
        const { data: estsData } = await supabase
          .from("Estudiantes")
          .select("id, nombres, apellidos, nivel, grado, salon")
          .in("id", hijoIds);

        const gradoOrden: Record<string, number> = {
          "Prejardín": 0, "Pre-Jardín": 1, "Jardín": 2, "Transición": 3,
          "Primero": 4, "Segundo": 5, "Tercero": 6, "Cuarto": 7, "Quinto": 8,
          "Sexto": 9, "Séptimo": 10, "Octavo": 11, "Noveno": 12,
          "Décimo": 13, "Undécimo": 14,
        };
        const hijos = (estsData || []).map((e: any) => ({
          id: String(e.id),
          nombre: e.nombres,
          apellidos: e.apellidos,
          nivel: e.nivel,
          grado: e.grado,
          salon: e.salon,
        })).sort((a: any, b: any) => {
          const ga = gradoOrden[a.grado] ?? 99;
          const gb = gradoOrden[b.grado] ?? 99;
          if (ga !== gb) return ga - gb;
          return (a.salon || "").localeCompare(b.salon || "");
        });

        const nombreAcudiente = `${usuarioAcud.nombres || ""} ${usuarioAcud.apellidos || ""}`.trim();

        return NextResponse.json({
          yaRegistrado: false,
          esPadre: true,
          nombreAcudiente,
          estudiantes: hijos,
        });
      }
    }
  }

  // 3. No es acudiente, asume estudiante
  return NextResponse.json({
    yaRegistrado: false,
    esPadre: false,
  });
}
