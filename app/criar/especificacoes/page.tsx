"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { PRODUTOS } from "@/produtos";
import { especificacoesValidas } from "@/produtos/validacao";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { CampoDinamico } from "@/components/forms/CampoDinamico";

export default function EtapaEspecificacoes() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "especificacoes" });
  }, [dispatch]);

  useEffect(() => {
    if (!estado.tipo) {
      router.replace("/criar/tipo");
    } else if (config && config.campos.length === 0) {
      router.replace("/criar/imagem");
    }
  }, [estado.tipo, config, router]);

  if (!config || config.campos.length === 0) return null;

  const podeAvancar = especificacoesValidas(config.campos, estado.especificacoes);

  return (
    <div>
      <StepIndicator etapaAtual="especificacoes" />
      <h1 className="mb-6 text-2xl font-semibold">Especificações — {config.nome}</h1>

      <div className="space-y-5">
        {config.campos.map((campo) => (
          <CampoDinamico
            key={campo.id}
            campo={campo}
            valor={estado.especificacoes[campo.id] ?? ""}
            aoAlterar={(valor) => dispatch({ type: "ATUALIZAR_ESPECIFICACAO", campoId: campo.id, valor })}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => router.push("/criar/pedido")}
          className="rounded-md border px-5 py-2 dark:border-gray-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          disabled={!podeAvancar}
          onClick={() => router.push("/criar/imagem")}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40 dark:bg-red-600"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
