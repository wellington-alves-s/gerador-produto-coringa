"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";
import { existeRascunho, salvarRascunho } from "./wizard-storage";
import { PRODUTOS } from "@/produtos";
import type { Campo, TipoProdutoId } from "@/produtos/tipos";
import { dependenciaAtiva } from "@/produtos/validacao";
import { DESENHO_INICIAL, type DesenhoEstado } from "./desenho";

export type AcaoPedido =
  | { type: "DEFINIR_TIPO"; tipo: TipoProdutoId }
  | { type: "ATUALIZAR_PEDIDO"; campo: keyof EstadoPedido["pedido"]; valor: string }
  | { type: "ATUALIZAR_ESPECIFICACAO"; campoId: string; valor: string }
  | { type: "DEFINIR_IMAGEM_BIBLIOTECA"; bibliotecaId: string }
  | { type: "DEFINIR_IMAGEM_UPLOAD"; dataUrl: string }
  | { type: "REMOVER_IMAGEM" }
  | { type: "ATUALIZAR_COMPRA"; campo: "fornecedor" | "custo"; valor: string }
  | { type: "ALTERNAR_TABELA_MADEL" }
  | { type: "DEFINIR_DESENHO"; desenho: DesenhoEstado }
  | { type: "IR_PARA_ETAPA"; etapa: EtapaId }
  | { type: "CARREGAR_ESTADO"; estado: EstadoPedido }
  | { type: "REINICIAR" };

function limparEspecificacoesDependentesInativas(
  especificacoes: Record<string, string>,
  campos: Campo[]
): Record<string, string> {
  let resultado = especificacoes;
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const campo of campos) {
      if (!campo.dependeDe || !resultado[campo.id]) continue;
      const dependeAtivo = dependenciaAtiva(resultado[campo.dependeDe.campoId], campo.dependeDe.valores);
      if (!dependeAtivo) {
        resultado = { ...resultado, [campo.id]: "" };
        mudou = true;
      }
    }
  }
  return resultado;
}

export function reducerPedido(estado: EstadoPedido, acao: AcaoPedido): EstadoPedido {
  switch (acao.type) {
    case "DEFINIR_TIPO":
      return { ...estado, tipo: acao.tipo, especificacoes: {}, desenho: DESENHO_INICIAL };
    case "ATUALIZAR_PEDIDO":
      return { ...estado, pedido: { ...estado.pedido, [acao.campo]: acao.valor } };
    case "ATUALIZAR_ESPECIFICACAO": {
      const especificacoes = { ...estado.especificacoes, [acao.campoId]: acao.valor };
      const campos = estado.tipo ? PRODUTOS[estado.tipo].campos : [];
      return { ...estado, especificacoes: limparEspecificacoesDependentesInativas(especificacoes, campos) };
    }
    case "DEFINIR_IMAGEM_BIBLIOTECA":
      return {
        ...estado,
        imagem: { origem: "biblioteca", bibliotecaId: acao.bibliotecaId, uploadDataUrl: null },
        desenho: { ...estado.desenho, imagem: null, apagamentos: [] },
      };
    case "DEFINIR_IMAGEM_UPLOAD":
      return {
        ...estado,
        imagem: { origem: "upload", bibliotecaId: null, uploadDataUrl: acao.dataUrl },
        desenho: { ...estado.desenho, imagem: null, apagamentos: [] },
      };
    case "REMOVER_IMAGEM":
      return {
        ...estado,
        imagem: { origem: null, bibliotecaId: null, uploadDataUrl: null },
        desenho: { ...estado.desenho, imagem: null, apagamentos: [] },
      };
    case "ATUALIZAR_COMPRA":
      return { ...estado, compra: { ...estado.compra, [acao.campo]: acao.valor } };
    case "ALTERNAR_TABELA_MADEL":
      return { ...estado, compra: { ...estado.compra, tabelaMadel: !estado.compra.tabelaMadel } };
    case "DEFINIR_DESENHO":
      return { ...estado, desenho: acao.desenho };
    case "IR_PARA_ETAPA":
      return { ...estado, ultimaEtapa: acao.etapa };
    case "CARREGAR_ESTADO":
      return acao.estado;
    case "REINICIAR":
      return ESTADO_INICIAL;
    default:
      return estado;
  }
}

type WizardContextValor = {
  estado: EstadoPedido;
  dispatch: Dispatch<AcaoPedido>;
};

const WizardContext = createContext<WizardContextValor | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [estado, dispatchBase] = useReducer(reducerPedido, ESTADO_INICIAL);
  const podeSalvar = useRef(!existeRascunho());

  useEffect(() => {
    if (!podeSalvar.current) return;
    const id = setTimeout(() => salvarRascunho(estado), 300);
    return () => clearTimeout(id);
  }, [estado]);

  const dispatch = useCallback<Dispatch<AcaoPedido>>((acao) => {
    if (acao.type === "CARREGAR_ESTADO" || acao.type === "REINICIAR") {
      podeSalvar.current = true;
    }
    dispatchBase(acao);
  }, []);

  return <WizardContext.Provider value={{ estado, dispatch }}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValor {
  const contexto = useContext(WizardContext);
  if (!contexto) throw new Error("useWizard precisa ser usado dentro de <WizardProvider>");
  return contexto;
}
