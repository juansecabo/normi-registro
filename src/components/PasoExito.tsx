"use client";

import { Button } from "./ui/button";
import Image from "next/image";

interface Props {
  perfil?: "Estudiante" | "Padre de familia";
  padreNombre?: string;
  padreNumEstudiantes?: string;
}

export function PasoExito({ perfil, padreNombre, padreNumEstudiantes }: Props) {
  const numMap: Record<string, string> = {
    "1 (uno)": "1",
    "2 (dos)": "2",
    "3 (tres)": "3",
    "4 (cuatro)": "4",
  };
  const numDisplay = padreNumEstudiantes ? numMap[padreNumEstudiantes] || padreNumEstudiantes : "";

  return (
    <div className="animate-scale-in text-center py-4">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">
        ¡Registro completado!
      </h2>

      {perfil === "Padre de familia" && padreNombre && (
        <p className="text-foreground font-medium mb-4 max-w-sm mx-auto">
          ¡Excelente, {padreNombre}! Ya configuraste tu perfil como Padre de familia
          con {numDisplay} estudiante{numDisplay !== "1" ? "s" : ""} dentro de nuestra institución.
        </p>
      )}

      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        Ya puedes volver a WhatsApp y chatear conmigo. ¡Te espero!
      </p>

      <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
        También puedes acceder a la plataforma en{" "}
        <a href="https://notasnormi.com" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
          notasnormi.com
        </a>{" "}
        con tu identificación y contraseña.
      </p>

      <Image
        src="/normi_1.webp"
        alt="Normi"
        width={80}
        height={80}
        className="mx-auto mb-6 rounded-full"
        style={{ objectFit: "cover", width: 80, height: 80 }}
      />

      <a
        href="https://wa.me/573002883078"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="lg">
          Volver a WhatsApp
        </Button>
      </a>
    </div>
  );
}
