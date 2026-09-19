"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { PRODUTOS } from "@/produtos";
import { camposFaltando } from "@/produtos/validacao";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { CampoDinamico } from "@/components/forms/CampoDinamico";
import { ModalAviso } from "@/components/ui/ModalAviso";

export default function EtapaEspecificacoes() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const [tentouAvancar, setTentouAvancar] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

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

  const faltando = useMemo(
    () => (config ? camposFaltando(config.campos, estado.especificacoes) : []),
    [config, estado.especificacoes]
  );

  if (!config || config.campos.length === 0) return null;

  function aoClicarProximo() {
    if (faltando.length > 0) {
      setTentouAvancar(true);
      setModalAberto(true);
      return;
    }
    router.push("/criar/imagem");
  }

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
            erro={tentouAvancar && faltando.some((campoFaltante) => campoFaltante.id === campo.id)}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => router.push("/criar/pedido")}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={aoClicarProximo}
          className="rounded-md bg-red-700 px-5 py-2 text-white dark:bg-red-600"
        >
          Próximo →
        </button>
      </div>

      {modalAberto && (
        <ModalAviso
          titulo="Faltam informações obrigatórias"
          itens={faltando.map((campo) => campo.label)}
          aoFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
