"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";

export default function EtapaPedido() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "pedido" });
  }, [dispatch]);

  function atualizar(campo: keyof typeof estado.pedido, valor: string) {
    dispatch({ type: "ATUALIZAR_PEDIDO", campo, valor });
  }

  const podeAvancar = estado.pedido.descricao.trim().length > 0;

  return (
    <div>
      <StepIndicator etapaAtual="pedido" />
      <h1 className="mb-6 text-2xl font-semibold">Informações do pedido</h1>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cliente</span>
          <input
            className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={estado.pedido.cliente}
            onChange={(e) => atualizar("cliente", e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nº do Pedido</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.pedido.numeroPedido}
              onChange={(e) => atualizar("numeroPedido", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Data</span>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.pedido.data}
              onChange={(e) => atualizar("data", e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Vendedor</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.pedido.vendedor}
              onChange={(e) => atualizar("vendedor", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Loja</span>
            <input
              className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={estado.pedido.loja}
              onChange={(e) => atualizar("loja", e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Descrição do produto <span className="text-red-700">*</span>
          </span>
          <textarea
            rows={4}
            className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={estado.pedido.descricao}
            onChange={(e) => atualizar("descricao", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => router.push("/criar/tipo")}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          disabled={!podeAvancar}
          onClick={() => router.push("/criar/especificacoes")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40 dark:bg-red-600"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
