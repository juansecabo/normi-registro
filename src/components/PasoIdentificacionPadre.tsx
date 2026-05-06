"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  initialValue?: string;
  onContinue: (id: string) => void;
  onBack: () => void;
}

export function PasoIdentificacionPadre({ initialValue = "", onContinue, onBack }: Props) {
  const [id, setId] = useState(initialValue);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!id.trim()) {
      setError("Ingresa tu número de identificación");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/validar-padre-id?id=${encodeURIComponent(id.trim())}`);
      const data = await res.json();

      if (data.ya_registrado) {
        setError(data.mensaje || "Esta identificación ya está registrada. Comunícate con la institución.");
        return;
      }

      onContinue(id.trim());
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        Número de identificación
      </h2>
      <p className="text-muted-foreground text-center mb-2">
        Ingresa tu número de documento de identidad
      </p>
      <p className="text-xs text-muted-foreground text-center mb-8">
        Si tu documento tiene letras, escribe solo los números
      </p>
      <div className="space-y-4 max-w-sm mx-auto">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Ej: 1103127132"
          value={id}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setId(val);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          error={error}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Atrás
          </Button>
          <Button onClick={handleContinue} disabled={loading} className="flex-1">
            {loading ? "Validando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
