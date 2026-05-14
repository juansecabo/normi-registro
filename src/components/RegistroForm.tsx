"use client";

import { useState, useEffect, useCallback } from "react";
import { ProgressBar } from "./ProgressBar";
import { PasoIdEstudiante } from "./PasoIdEstudiante";
import { PasoConfirmarIdentidad } from "./PasoConfirmarIdentidad";
import { PasoCredenciales } from "./PasoCredenciales";
import { PasoResumen } from "./PasoResumen";
import { PasoExito } from "./PasoExito";
import { PasoYaRegistrado } from "./PasoYaRegistrado";

interface EstudianteInfo {
  id: string;
  nombre: string;
  apellidos: string;
  nivel: string;
  grado: string;
  salon: string;
}

type NumEstudiantes = "1 (uno)" | "2 (dos)" | "3 (tres)" | "4 (cuatro)";

interface FormState {
  perfil?: "Estudiante" | "Padre de familia";
  estudiante?: EstudianteInfo;
  contrasena?: string;
  padreId?: string;
  padreNombre?: string;
  padreEstudiantes: EstudianteInfo[];
}

type PageStatus = "loading" | "already_registered" | "padre_greeting" | "student_flow" | "not_acudiente" | "success";

function numToLabel(n: number): NumEstudiantes {
  if (n === 1) return "1 (uno)";
  if (n === 2) return "2 (dos)";
  if (n === 3) return "3 (tres)";
  return "4 (cuatro)";
}

export function RegistroForm({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ padreEstudiantes: [] });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [nombreAcudiente, setNombreAcudiente] = useState("");
  const [hijosDetectados, setHijosDetectados] = useState<EstudianteInfo[]>([]);

  const [pendingEstudiante, setPendingEstudiante] = useState<EstudianteInfo | null>(null);

  const checkPhone = useCallback(async () => {
    try {
      const res = await fetch(`/api/verificar-telefono?phone=${encodeURIComponent(contactId)}`);
      const data = await res.json();

      if (data.yaRegistrado) {
        setStatus("already_registered");
        return;
      }

      if (data.esPadre) {
        setNombreAcudiente(data.nombreAcudiente || "");
        setHijosDetectados(data.estudiantes || []);
        setForm({
          perfil: "Padre de familia",
          padreNombre: data.nombreAcudiente || "",
          padreEstudiantes: data.estudiantes || [],
        });
        setStatus("padre_greeting");
        setStep(1);
      } else {
        setForm((prev) => ({ ...prev, perfil: "Estudiante" }));
        setStatus("student_flow");
        setStep(1);
      }
    } catch {
      // If check fails, default to student flow
      setForm((prev) => ({ ...prev, perfil: "Estudiante" }));
      setStatus("student_flow");
      setStep(1);
    }
  }, [contactId]);

  useEffect(() => { checkPhone(); }, [checkPhone]);

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const body: Record<string, string | undefined> = {
        id: contactId,
        perfil: form.perfil,
        contrasena: form.contrasena,
      };
      if (form.perfil === "Estudiante" && form.estudiante) {
        body.estudiante_id = form.estudiante.id;
      } else if (form.perfil === "Padre de familia") {
        body.padre_id = form.padreId;
        body.padre_nombre = form.padreNombre;
        const n = form.padreEstudiantes.length;
        body.padre_numero_de_estudiantes = numToLabel(n);
        form.padreEstudiantes.forEach((est, i) => {
          body[`padre_estudiante${i + 1}_id`] = est.id;
        });
      }
      const res = await fetch("/api/guardar-perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Error al guardar. Intenta de nuevo.");
        return;
      }
      setStatus("success");
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // === STATUS SCREENS ===
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "already_registered") return <PasoYaRegistrado />;

  if (status === "not_acudiente") {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Comunícate con el colegio</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Si la información no es correcta o no eres acudiente, por favor comunícate con la institución para resolver tu situación.
        </p>
        <button
          onClick={() => { setStatus("padre_greeting"); setStep(1); }}
          className="py-3 px-6 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors cursor-pointer"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  if (status === "success") return (
    <PasoExito
      perfil={form.perfil}
      padreNombre={form.padreNombre}
      padreNumEstudiantes={numToLabel(form.padreEstudiantes.length)}
    />
  );

  // =============================================
  // PARENT FLOW (automatic - phone found in telefono_acudiente)
  // Steps: 1-Greeting+Confirm, 2-ID, 3-Password, 4-Summary
  // =============================================
  if (status === "padre_greeting") {
    // Step 1: Greeting with student list
    if (step === 1) {
      return (
        <>
          <ProgressBar currentStep={1} totalSteps={4} />
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Hola, {nombreAcudiente}
              </h2>
              <p className="text-muted-foreground text-sm">
                Detecté que eres acudiente de {hijosDetectados.length === 1 ? "el siguiente estudiante" : "los siguientes estudiantes"}:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {hijosDetectados.map((est, i) => (
                <div key={i} className="bg-accent/50 rounded-lg p-3 border border-border">
                  <p className="font-semibold text-foreground">{est.nombre} {est.apellidos}</p>
                  <p className="text-sm text-muted-foreground">{est.grado} {est.salon} — {est.nivel}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center mb-6">
              ¿Esta información es correcta?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStatus("not_acudiente")}
                className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors cursor-pointer"
              >
                {hijosDetectados.length === 1 ? "No es mi estudiante" : "No son mis estudiantes"}
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Sí, confirmo
              </button>
            </div>
          </div>
        </>
      );
    }

    // Step 2: Parent ID
    if (step === 2) {
      return (
        <>
          <ProgressBar currentStep={2} totalSteps={4} />
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-foreground text-center mb-2">Tu documento de identidad</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Ingresa tu número de cédula</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (form.padreId && form.padreId.length >= 5) {
                setStep(3);
              }
            }}>
              <input
                type="text"
                inputMode="numeric"
                value={form.padreId || ""}
                onChange={(e) => setForm({ ...form, padreId: e.target.value.replace(/\D/g, "") })}
                placeholder="Ej: 1103127132"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={!form.padreId || form.padreId.length < 5}
                  className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </form>
          </div>
        </>
      );
    }

    // Step 3: Password
    if (step === 3) {
      return (
        <>
          <ProgressBar currentStep={3} totalSteps={4} />
          <PasoCredenciales
            onContinue={(contrasena) => {
              setForm({ ...form, contrasena });
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        </>
      );
    }

    // Step 4: Summary
    if (step === 4) {
      return (
        <>
          <ProgressBar currentStep={4} totalSteps={4} />
          <PasoResumen
            perfil="Padre de familia"
            padreNombre={form.padreNombre}
            padreId={form.padreId}
            contrasena={form.contrasena}
            padreNumEstudiantes={numToLabel(form.padreEstudiantes.length)}
            padreEstudiantes={form.padreEstudiantes}
            credentialStep={3}
            identificationStep={2}
            onEdit={(targetStep) => setStep(targetStep)}
            onSubmit={handleSubmit}
            loading={submitLoading}
            error={submitError}
          />
        </>
      );
    }
  }

  // =============================================
  // STUDENT FLOW (automatic - phone NOT in telefono_acudiente)
  // Steps: 1-ID, 2-Confirm, 3-Password, 4-Summary
  // =============================================
  if (status === "student_flow") {
    if (step === 1) {
      return (
        <>
          <ProgressBar currentStep={1} totalSteps={4} />
          <div className="text-center mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Esta plataforma de registro es solo para estudiantes. Si eres acudiente, comunícate con la institución.
            </p>
          </div>
          <PasoIdEstudiante
            perfil="Estudiante"
            onValidado={(id, est) => {
              setPendingEstudiante({ id, ...est });
              setStep(2);
            }}
            onBack={() => {}}
            hideBack
          />
        </>
      );
    }

    if (step === 2 && pendingEstudiante) {
      return (
        <>
          <ProgressBar currentStep={2} totalSteps={4} />
          <PasoConfirmarIdentidad
            nombre={pendingEstudiante.nombre}
            apellidos={pendingEstudiante.apellidos}
            nivel={pendingEstudiante.nivel}
            grado={pendingEstudiante.grado}
            salon={pendingEstudiante.salon}
            onConfirm={() => {
              setForm({ ...form, estudiante: pendingEstudiante });
              setPendingEstudiante(null);
              setStep(3);
            }}
            onDeny={() => { setPendingEstudiante(null); setStep(1); }}
          />
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <ProgressBar currentStep={3} totalSteps={4} />
          <PasoCredenciales
            onContinue={(contrasena) => {
              setForm({ ...form, contrasena });
              setStep(4);
            }}
            onBack={() => setStep(1)}
          />
        </>
      );
    }

    if (step === 4 && form.estudiante) {
      return (
        <>
          <ProgressBar currentStep={4} totalSteps={4} />
          <PasoResumen
            perfil="Estudiante"
            estudiante={form.estudiante}
            contrasena={form.contrasena}
            credentialStep={3}
            onEdit={(targetStep) => setStep(targetStep)}
            onSubmit={handleSubmit}
            loading={submitLoading}
            error={submitError}
          />
        </>
      );
    }
  }

  // Fallback - loading
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
