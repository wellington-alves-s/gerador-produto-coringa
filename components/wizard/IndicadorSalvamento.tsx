"use client";

import { useWizard } from "@/lib/wizard-context";

/** Aviso discreto do salvamento automático (canto inferior direito). */
export function IndicadorSalvamento() {
  const { statusSalvamento, mensagemSalvamento } = useWizard();
  if (statusSalvamento === "ocioso") return null;
  const erro = statusSalvamento === "erro";
  const texto = erro ? mensagemSalvamento : statusSalvamento === "salvando" ? "Salvando…" : "Salvo";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-4 bottom-4 z-30 max-w-xs rounded-md px-3 py-2 text-sm shadow ${
        erro ? "bg-red-700 text-white" : "bg-gray-800 text-gray-100"
      }`}
    >
      {texto}
    </div>
  );
}
