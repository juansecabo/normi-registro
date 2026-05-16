"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RegistroForm } from "@/components/RegistroForm";
import Image from "next/image";

function RegistroContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Link inválido</h2>
        <p className="text-muted-foreground">
          Este enlace de registro no es válido. Escríbele a Normi por WhatsApp para recibir un enlace nuevo.
        </p>
      </div>
    );
  }

  return <RegistroForm contactId={id} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-accent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Normi - only on desktop, to the right */}
      <div className="hidden lg:block fixed bottom-0 right-12 pointer-events-none z-0">
        <Image
          src="/normi_2.webp"
          alt=""
          width={480}
          height={480}
          className="opacity-80 select-none"
          style={{ objectFit: "contain" }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header with escudo */}
        <div className="text-center mb-6 animate-fade-in">
          <Image
            src="/escudo.webp"
            alt="Escudo Escuela Normal Superior de Corozal"
            width={110}
            height={110}
            className="mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Registro de Normi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escuela Normal Superior de Corozal
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl shadow-soft border border-border p-6 sm:p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            }
          >
            <RegistroContent />
          </Suspense>
        </div>

        {/* Footer - Cailico */}
        <div className="text-center mt-8 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-2">Infraestructura creada por</p>
          <a href="https://cailico.com" target="_blank" rel="noopener noreferrer" className="inline-block">
            <Image
              src="/cailico.webp"
              alt="Cailico"
              width={90}
              height={30}
              className="mx-auto"
              style={{ objectFit: "contain" }}
            />
          </a>
          <a
            href="https://cailico.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            cailico.com
          </a>
        </div>
      </div>
    </main>
  );
}
