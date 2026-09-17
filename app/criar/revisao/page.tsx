"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { DocumentoCroqui } from "@/components/croqui/DocumentoCroqui";

export default function EtapaRevisao() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "revisao" });
  }, [dispatch]);

  useEffect(() => {
    if (!estado.tipo) {
      router.replace("/criar/tipo");
    }
  }, [estado.tipo, router]);

  function atualizarCompra(campo: keyof typeof estado.compra, valor: string) {
    dispatch({ type: "ATUALIZAR_COMPRA", campo, valor });
  }

  if (!estado.tipo) return null;

  return (
    <div>
      <StepIndicator etapaAtual="revisao" />
      <h1 className="mb-6 text-2xl font-semibold">Revisar encomenda</h1>

      <div className="mb-6 overflow-x-auto">
        <DocumentoCroqui estado={estado} />
      </div>

      <details className="mb-6 rounded-md border p-4 dark:border-gray-700">
        <summary className="cursor-pointer font-medium">
          Informações de compra (opcional — deixe em branco para a versão de aprovação do cliente)
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Fornecedor</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.compra.fornecedor}
              onChange={(e) => atualizarCompra("fornecedor", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Custo</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.compra.custo}
              onChange={(e) => atualizarCompra("custo", e.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => router.push("/criar/imagem")}
          className="rounded-md border px-5 py-2 dark:border-gray-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/resultado")}
          className="rounded-md bg-red-700 px-5 py-2 text-white dark:bg-red-600"
        >
          Gerar Croqui
        </button>
      </div>
    </div>
  );
}
