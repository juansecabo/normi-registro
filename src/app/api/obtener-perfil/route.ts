import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Obtiene el perfil actual de un usuario por su teléfono.
 * Lee de Usuarios + Estudiantes + Acudientes.
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
        .select("id, nombres, apellidos, nivel, grado, salon")
        .eq("id", parseInt(usuario.id))
        .maybeSingle(),
      supabase.from("Acudientes")
        .select("id, acudido1_id, acudido2_id, acudido3_id, acudido4_id")
        .eq("id", usuario.id)
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
          estudiante_id: estRes.data.id,
          estudiante_nombre: estRes.data.nombres,
          estudiante_apellidos: estRes.data.apellidos,
          estudiante_nivel: estRes.data.nivel,
          estudiante_grado: estRes.data.grado,
          estudiante_salon: estRes.data.salon,
          contrasena: usuario.contrasena,
        },
      });
    }

    if (acudRes.data) {
      // Es acudiente — armar formato compatible con el flujo de registro
      const a = acudRes.data;
      const hijoIds = [a.acudido1_id, a.acudido2_id, a.acudido3_id, a.acudido4_id].filter(Boolean);
      // Derivamos el conteo desde los slots, no leemos columna cache.
      const NUM_LABELS = ["", "1 (uno)", "2 (dos)", "3 (tres)", "4 (cuatro)"];
      const datos: any = {
        perfil: "Padre de familia",
        numero_de_telefono: id,
        padre_id: usuario.id,
        padre_nombre: `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim(),
        padre_numero_de_estudiantes: NUM_LABELS[hijoIds.length] || null,
        contrasena: usuario.contrasena,
      };
      if (hijoIds.length > 0) {
        const { data: estsData } = await supabase
          .from("Estudiantes")
          .select("id, nombres, apellidos, nivel, grado, salon")
          .in("id", hijoIds);
        for (let i = 0; i < hijoIds.length; i++) {
          const e = (estsData || []).find((x: any) => x.id === hijoIds[i]);
          if (!e) continue;
          datos[`padre_estudiante${i + 1}_id`] = e.id;
          datos[`padre_estudiante${i + 1}_nombre`] = e.nombres;
          datos[`padre_estudiante${i + 1}_apellidos`] = e.apellidos;
          datos[`padre_estudiante${i + 1}_nivel`] = e.nivel;
          datos[`padre_estudiante${i + 1}_grado`] = e.grado;
          datos[`padre_estudiante${i + 1}_salon`] = e.salon;
        }
      }
      const required = hijoIds.length;
      const ya_registrado = required > 0 && !!usuario.contrasena;
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

  return NextResponse.json({ existe: false, ya_registrado: false });
}
