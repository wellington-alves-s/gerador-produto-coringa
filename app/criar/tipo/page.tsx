"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { listarProdutos } from "@/produtos";
import type { TipoProdutoId } from "@/produtos/tipos";
import { StepIndicator } from "@/components/wizard/StepIndicator";

export default function EtapaTipo() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const produtos = listarProdutos();

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "tipo" });
  }, [dispatch]);

  function escolher(tipoId: TipoProdutoId) {
    dispatch({ type: "DEFINIR_TIPO", tipo: tipoId });
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-semibold">Produto Coringa</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Gere a encomenda especial de portas, esquadrias e outros produtos sob medida da Madel.
        </p>
      </div>
      <StepIndicator etapaAtual="tipo" />
      <h2 className="mb-6 text-2xl font-semibold">O que você deseja criar?</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {produtos.map((produto) => (
          <button
            key={produto.id}
            type="button"
            onClick={() => escolher(produto.id)}
            aria-pressed={estado.tipo === produto.id}
            className={`rounded-lg border p-4 text-left transition ${
              estado.tipo === produto.id
                ? "border-red-700 bg-red-50 dark:bg-red-950/40"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {produto.nome}
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!estado.tipo}
          onClick={() => router.push("/criar/pedido")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40 dark:bg-red-600"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
