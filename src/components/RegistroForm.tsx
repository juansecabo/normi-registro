"use client";

import { useState, useEffect, useCallback } from "react";
import { ProgressBar } from "./ProgressBar";
import { PasoSeleccionPerfil } from "./PasoSeleccionPerfil";
import { PasoIdEstudiante } from "./PasoIdEstudiante";
import { PasoConfirmarIdentidad } from "./PasoConfirmarIdentidad";
import { PasoNombrePadre } from "./PasoNombrePadre";
import { PasoIdentificacionPadre } from "./PasoIdentificacionPadre";
import { PasoNumeroEstudiantes } from "./PasoNumeroEstudiantes";
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

type Perfil = "Estudiante" | "Padre de familia";
type NumEstudiantes = "1 (uno)" | "2 (dos)" | "3 (tres)";

interface FormState {
  perfil?: Perfil;
  estudiante?: EstudianteInfo;
  contrasena?: string;
  padreId?: string;
  padreNombre?: string;
  padreNumEstudiantes?: NumEstudiantes;
  padreEstudiantes: EstudianteInfo[];
}

type PageStatus = "loading" | "invalid" | "already_registered" | "form" | "success";

const NUM_MAP: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3 };

export function RegistroForm({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ padreEstudiantes: [] });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingFromSummary, setEditingFromSummary] = useState(false);

  const [pendingEstudiante, setPendingEstudiante] = useState<EstudianteInfo | null>(null);
  const [pendingPadreEstudiante, setPendingPadreEstudiante] = useState<EstudianteInfo | null>(null);

  const checkProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/obtener-perfil?id=${encodeURIComponent(contactId)}`);
      const data = await res.json();
      if (!data.existe) { setStatus("invalid"); return; }
      if (data.ya_registrado) { setStatus("already_registered"); return; }
      setStatus("form");
    } catch {
      setStatus("invalid");
    }
  }, [contactId]);

  useEffect(() => { checkProfile(); }, [checkProfile]);

  const getParentN = () => form.padreNumEstudiantes ? NUM_MAP[form.padreNumEstudiantes] : 0;

  // Parent flow: 1-Profile, 2-Name, 3-ID, 4-NumStudents, 5..students, passwordStep, summaryStep
  const getParentPasswordStep = () => 5 + getParentN() * 2;
  const getParentSummaryStep = () => 6 + getParentN() * 2;

  // Student: 5 steps. Parent: 6 + N*2
  const getTotalSteps = () => {
    if (!form.perfil) return 1;
    if (form.perfil === "Estudiante") return 5;
    const n = getParentN() || 1;
    return 6 + n * 2;
  };

  const getIdsYaUsados = (excludeIndex?: number) => {
    return form.padreEstudiantes
      .filter((_, i) => i !== excludeIndex)
      .map((e) => e.id);
  };

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
        body.padre_numero_de_estudiantes = form.padreNumEstudiantes;
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

  const handleEdit = (targetStep: number) => {
    setEditingFromSummary(true);
    setStep(targetStep);
  };

  const returnToSummary = () => {
    setEditingFromSummary(false);
    if (form.perfil === "Estudiante") {
      setStep(5);
    } else {
      setStep(getParentSummaryStep());
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

  if (status === "invalid") {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Link inválido</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Este enlace de registro no es válido. Escríbele a Normy por WhatsApp para recibir un enlace nuevo.
        </p>
      </div>
    );
  }

  if (status === "already_registered") return <PasoYaRegistrado />;
  if (status === "success") return (
    <PasoExito perfil={form.perfil} padreNombre={form.padreNombre} padreNumEstudiantes={form.padreNumEstudiantes} />
  );

  // === STEP 1: Profile selection ===
  if (step === 1) {
    return (
      <PasoSeleccionPerfil
        onSelect={(perfil) => {
          setForm({ ...form, perfil, estudiante: undefined, padreEstudiantes: [], contrasena: undefined, padreId: undefined });
          setPendingEstudiante(null);
          setPendingPadreEstudiante(null);
          setEditingFromSummary(false);
          setStep(2);
        }}
      />
    );
  }

  // =============================================
  // STUDENT FLOW: 1-Profile, 2-Code, 3-Confirm, 4-Password, 5-Summary
  // =============================================
  if (form.perfil === "Estudiante") {
    if (step === 2) {
      return (
        <>
          <ProgressBar currentStep={2} totalSteps={5} />
          <PasoIdEstudiante
            perfil="Estudiante"
            onValidado={(id, est) => {
              setPendingEstudiante({ id, ...est });
              setStep(3);
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else {
                setForm({ ...form, perfil: undefined, estudiante: undefined });
                setPendingEstudiante(null);
                setStep(1);
              }
            }}
          />
        </>
      );
    }

    if (step === 3 && pendingEstudiante) {
      return (
        <>
          <ProgressBar currentStep={3} totalSteps={5} />
          <PasoConfirmarIdentidad
            nombre={pendingEstudiante.nombre}
            apellidos={pendingEstudiante.apellidos}
            nivel={pendingEstudiante.nivel}
            grado={pendingEstudiante.grado}
            salon={pendingEstudiante.salon}
            onConfirm={() => {
              setForm({ ...form, estudiante: pendingEstudiante });
              setPendingEstudiante(null);
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(4); }
            }}
            onDeny={() => { setPendingEstudiante(null); setStep(2); }}
          />
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <ProgressBar currentStep={4} totalSteps={5} />
          <PasoCredenciales
            onContinue={(contrasena) => {
              setForm({ ...form, contrasena });
              setEditingFromSummary(false);
              setStep(5);
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(2); }
            }}
          />
        </>
      );
    }

    if (step === 5 && form.estudiante) {
      return (
        <>
          <ProgressBar currentStep={5} totalSteps={5} />
          <PasoResumen
            perfil="Estudiante"
            estudiante={form.estudiante}
            contrasena={form.contrasena}
            credentialStep={4}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
            loading={submitLoading}
            error={submitError}
          />
        </>
      );
    }
  }

  // =============================================
  // PARENT FLOW: 1-Profile, 2-Name, 3-ID, 4-NumStudents, 5..students, passwordStep, summaryStep
  // =============================================
  if (form.perfil === "Padre de familia") {
    const totalStudents = getParentN();
    const passwordStep = getParentPasswordStep();
    const summaryStep = getParentSummaryStep();

    // Step 2: Name
    if (step === 2) {
      return (
        <>
          <ProgressBar currentStep={2} totalSteps={getTotalSteps()} />
          <PasoNombrePadre
            initialValue={form.padreNombre}
            onContinue={(nombre) => {
              setForm({ ...form, padreNombre: nombre });
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(3); }
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else { setForm({ ...form, perfil: undefined }); setStep(1); }
            }}
          />
        </>
      );
    }

    // Step 3: Identification
    if (step === 3) {
      return (
        <>
          <ProgressBar currentStep={3} totalSteps={getTotalSteps()} />
          <PasoIdentificacionPadre
            initialValue={form.padreId}
            onContinue={(id) => {
              setForm({ ...form, padreId: id });
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(4); }
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(2); }
            }}
          />
        </>
      );
    }

    // Step 4: Number of students
    if (step === 4) {
      return (
        <>
          <ProgressBar currentStep={4} totalSteps={getTotalSteps()} />
          <PasoNumeroEstudiantes
            onSelect={(num) => {
              if (editingFromSummary && num === form.padreNumEstudiantes) {
                returnToSummary();
              } else {
                setForm({ ...form, padreNumEstudiantes: num, padreEstudiantes: [] });
                setEditingFromSummary(false);
                setStep(5);
              }
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(3); }
            }}
          />
        </>
      );
    }

    // Steps 5 to 5+N*2-1: Students
    if (step >= 5 && step < 5 + totalStudents * 2) {
      const studentIndex = Math.floor((step - 5) / 2);
      const isCodeStep = (step - 5) % 2 === 0;

      if (isCodeStep) {
        const ordinal = totalStudents > 1 ? ` ${studentIndex + 1}` : "";
        return (
          <>
            <ProgressBar currentStep={step} totalSteps={getTotalSteps()} />
            <PasoIdEstudiante
              label={`Documento del estudiante${ordinal}`}
              subtitle="Ingresa el número de documento con el que se matriculó tu niño/a"
              perfil="Padre de familia"
              idsYaUsados={getIdsYaUsados(studentIndex)}
              onValidado={(id, est) => {
                setPendingPadreEstudiante({ id, ...est });
                setStep(step + 1);
              }}
              onBack={() => {
                if (editingFromSummary) {
                  returnToSummary();
                } else if (studentIndex === 0) {
                  setStep(4);
                } else {
                  const updated = [...form.padreEstudiantes];
                  updated.pop();
                  setForm({ ...form, padreEstudiantes: updated });
                  setStep(step - 2);
                }
              }}
            />
          </>
        );
      }

      if (pendingPadreEstudiante) {
        return (
          <>
            <ProgressBar currentStep={step} totalSteps={getTotalSteps()} />
            <PasoConfirmarIdentidad
              nombre={pendingPadreEstudiante.nombre}
              apellidos={pendingPadreEstudiante.apellidos}
              nivel={pendingPadreEstudiante.nivel}
              grado={pendingPadreEstudiante.grado}
              salon={pendingPadreEstudiante.salon}
              esPadre
              onConfirm={() => {
                const updated = [...form.padreEstudiantes];
                updated[studentIndex] = pendingPadreEstudiante;
                setForm({ ...form, padreEstudiantes: updated });
                setPendingPadreEstudiante(null);

                if (editingFromSummary) {
                  returnToSummary();
                } else if (studentIndex + 1 < totalStudents) {
                  setStep(step + 1);
                } else {
                  setStep(passwordStep);
                }
              }}
              onDeny={() => {
                setPendingPadreEstudiante(null);
                setStep(step - 1);
              }}
            />
          </>
        );
      }
    }

    // Password step (after all students)
    if (step === passwordStep) {
      return (
        <>
          <ProgressBar currentStep={passwordStep} totalSteps={getTotalSteps()} />
          <PasoCredenciales
            onContinue={(contrasena) => {
              setForm({ ...form, contrasena });
              setEditingFromSummary(false);
              setStep(summaryStep);
            }}
            onBack={() => {
              if (editingFromSummary) { returnToSummary(); }
              else { setStep(passwordStep - 1); }
            }}
          />
        </>
      );
    }

    // Summary
    if (step === summaryStep && form.padreEstudiantes.length === totalStudents) {
      return (
        <>
          <ProgressBar currentStep={summaryStep} totalSteps={getTotalSteps()} />
          <PasoResumen
            perfil="Padre de familia"
            padreNombre={form.padreNombre}
            padreId={form.padreId}
            contrasena={form.contrasena}
            padreNumEstudiantes={form.padreNumEstudiantes}
            padreEstudiantes={form.padreEstudiantes}
            credentialStep={passwordStep}
            identificationStep={3}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
            loading={submitLoading}
            error={submitError}
          />
        </>
      );
    }
  }

  // Fallback
  return (
    <PasoSeleccionPerfil
      onSelect={(perfil) => {
        setForm({ ...form, perfil, estudiante: undefined, padreEstudiantes: [] });
        setStep(2);
      }}
    />
  );
}
