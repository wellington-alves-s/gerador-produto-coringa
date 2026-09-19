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

  function atualizarCompra(campo: "fornecedor" | "custo", valor: string) {
    dispatch({ type: "ATUALIZAR_COMPRA", campo, valor });
  }

  function atualizarNotaAdicional(valor: string) {
    dispatch({ type: "ATUALIZAR_PEDIDO", campo: "notaAdicional", valor });
  }

  if (!estado.tipo) return null;

  return (
    <div>
      <StepIndicator etapaAtual="revisao" />
      <h1 className="mb-6 text-2xl font-semibold">Revisar encomenda</h1>

      <div className="relative mr-[calc(50%-50vw)] ml-[calc(50%-50vw)] mb-6 w-screen overflow-x-auto px-4">
        <div className="mx-auto max-w-[1600px]">
          <DocumentoCroqui estado={estado} />
        </div>
      </div>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium">Informação adicional (opcional)</span>
        <textarea
          rows={2}
          className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={estado.pedido.notaAdicional}
          onChange={(e) => atualizarNotaAdicional(e.target.value)}
        />
      </label>

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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={estado.compra.tabelaMadel}
              onChange={() => dispatch({ type: "ALTERNAR_TABELA_MADEL" })}
            />
            <span className="text-sm font-medium">Tabela Madel</span>
          </label>
        </div>
      </details>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => router.push("/criar/imagem")}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/resultado")}
          className="rounded-md bg-green-600 px-5 py-2 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Gerar Croqui
        </button>
      </div>
    </div>
  );
}
