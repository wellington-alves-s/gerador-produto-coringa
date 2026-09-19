"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { carregarRascunho, limparRascunho, existeRascunho } from "@/lib/wizard-storage";

export function DraftRecoveryPrompt() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  // Sempre começa fechado (igual ao HTML renderizado no servidor, que não tem
  // acesso ao localStorage) — checar existeRascunho() já na primeira renderização
  // fazia o React hidratar com um resultado diferente do HTML do servidor,
  // causando o erro de hydration mismatch. Só depois de montar no navegador é
  // que verificamos o rascunho de verdade.
  const [mostrar, setMostrar] = useState(false);
  const destinoPendente = useRef<string | null>(null);

  useEffect(() => {
    // Sincronizando com localStorage, que só existe no cliente (ver justificativa acima).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMostrar(existeRascunho());
  }, []);

  // Só navega depois que o estado do rascunho já foi commitado no contexto —
  // disparar o router.push no mesmo clique que o dispatch corria o risco de a
  // página de destino montar (e checar estado.tipo) antes do CARREGAR_ESTADO
  // ser aplicado, mandando o usuário de volta para /criar/tipo.
  useEffect(() => {
    if (!destinoPendente.current) return;
    router.push(destinoPendente.current);
    destinoPendente.current = null;
  }, [estado, router]);

  function continuar() {
    const rascunho = carregarRascunho();
    if (rascunho) {
      destinoPendente.current = `/criar/${rascunho.ultimaEtapa}`;
      dispatch({ type: "CARREGAR_ESTADO", estado: rascunho });
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
          <button
            type="button"
            onClick={comecarNova}
            className="rounded-md border px-4 py-2 dark:border-gray-700"
          >
            Começar nova
          </button>
          <button
            type="button"
            onClick={continuar}
            className="rounded-md bg-red-700 px-4 py-2 text-white dark:bg-red-600"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
