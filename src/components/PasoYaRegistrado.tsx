"use client";

import { Button } from "./ui/button";
import Image from "next/image";

export function PasoYaRegistrado() {
  return (
    <div className="animate-fade-in text-center py-4">
      <Image
        src="/normi_1.webp"
        alt="Normi"
        width={100}
        height={100}
        className="mx-auto mb-4 rounded-full"
        style={{ objectFit: "cover", width: 100, height: 100 }}
      />
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Ya estás registrado
      </h2>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
        Tu perfil ya fue completado anteriormente. ¡Puedes volver a WhatsApp y chatear conmigo!
      </p>
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
