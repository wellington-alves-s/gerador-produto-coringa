"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { carregarRascunho, limparRascunho, existeRascunho } from "@/lib/wizard-storage";

export function DraftRecoveryPrompt() {
  const { dispatch } = useWizard();
  const router = useRouter();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setMostrar(existeRascunho());
  }, []);

  function continuar() {
    const rascunho = carregarRascunho();
    if (rascunho) {
      dispatch({ type: "CARREGAR_ESTADO", estado: rascunho });
      router.push(`/criar/${rascunho.ultimaEtapa}`);
    }
    setMostrar(false);
  }

  function comecarNova() {
    limparRascunho();
    dispatch({ type: "REINICIAR" });
    setMostrar(false);
  }

  if (!mostrar) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-xl dark:bg-gray-900">
        <p className="mb-4">Encontramos uma encomenda não finalizada. Deseja continuar?</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={comecarNova} className="rounded-md border px-4 py-2">
            Começar nova
          </button>
          <button type="button" onClick={continuar} className="rounded-md bg-red-700 px-4 py-2 text-white">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
