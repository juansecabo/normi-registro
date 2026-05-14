"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface EstudianteData {
  nombre: string;
  apellidos: string;
  nivel: string;
  grado: string;
  salon: string;
}

interface Props {
  label?: string;
  subtitle?: string;
  perfil?: "Estudiante" | "Padre de familia";
  idsYaUsados?: string[];
  hideBack?: boolean;
  onValidado: (id: string, estudiante: EstudianteData) => void;
  onBack: () => void;
}

export function PasoIdEstudiante({ label, subtitle, perfil = "Estudiante", idsYaUsados = [], hideBack, onValidado, onBack }: Props) {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleValidar = async () => {
    if (!id.trim()) {
      setError("Ingresa el número de documento");
      return;
    }

    if (idsYaUsados.includes(id.trim())) {
      setError("Ya ingresaste este documento para otro estudiante. Cada estudiante debe tener un número diferente.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/validar-id?id=${encodeURIComponent(id.trim())}&perfil=${encodeURIComponent(perfil)}`);
      const data = await res.json();

      if (!data.existe) {
        setError("Número de documento no encontrado. Verifica e intenta de nuevo.");
        return;
      }

      if (data.ya_registrado) {
        setError(data.mensaje || "Este documento ya está registrado. Comunícate con la institución.");
        return;
      }

      onValidado(id.trim(), data.estudiante);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        {label || "Número de identificación"}
      </h2>
      <p className="text-muted-foreground text-center mb-2">
        {subtitle || "Ingresa el número de documento con el que te matriculaste"}
      </p>
      <p className="text-xs text-muted-foreground text-center mb-8">
        {perfil === "Padre de familia"
          ? "Si su documento tiene letras, escribe solo los números"
          : "Si tu documento tiene letras, escribe solo los números"}
      </p>
      <div className="space-y-4 max-w-sm mx-auto">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ej: 1103127132"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleValidar()}
          error={error}
        />
        <div className="flex gap-3">
          {!hideBack && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Atrás
            </Button>
          )}
          <Button onClick={handleValidar} disabled={loading} className={hideBack ? "w-full" : "flex-1"}>
            {loading ? "Validando..." : "Validar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
