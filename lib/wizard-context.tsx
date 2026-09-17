"use client";

import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";
import { salvarRascunho } from "./wizard-storage";
import type { TipoProdutoId } from "@/produtos/tipos";

export type AcaoPedido =
  | { type: "DEFINIR_TIPO"; tipo: TipoProdutoId }
  | { type: "ATUALIZAR_PEDIDO"; campo: keyof EstadoPedido["pedido"]; valor: string }
  | { type: "ATUALIZAR_ESPECIFICACAO"; campoId: string; valor: string }
  | { type: "DEFINIR_IMAGEM_BIBLIOTECA"; bibliotecaId: string }
  | { type: "DEFINIR_IMAGEM_UPLOAD"; dataUrl: string }
  | { type: "REMOVER_IMAGEM" }
  | { type: "ATUALIZAR_COMPRA"; campo: keyof EstadoPedido["compra"]; valor: string }
  | { type: "IR_PARA_ETAPA"; etapa: EtapaId }
  | { type: "CARREGAR_ESTADO"; estado: EstadoPedido }
  | { type: "REINICIAR" };

export function reducerPedido(estado: EstadoPedido, acao: AcaoPedido): EstadoPedido {
  switch (acao.type) {
    case "DEFINIR_TIPO":
      return { ...estado, tipo: acao.tipo, especificacoes: {} };
    case "ATUALIZAR_PEDIDO":
      return { ...estado, pedido: { ...estado.pedido, [acao.campo]: acao.valor } };
    case "ATUALIZAR_ESPECIFICACAO":
      return { ...estado, especificacoes: { ...estado.especificacoes, [acao.campoId]: acao.valor } };
    case "DEFINIR_IMAGEM_BIBLIOTECA":
      return { ...estado, imagem: { origem: "biblioteca", bibliotecaId: acao.bibliotecaId, uploadDataUrl: null } };
    case "DEFINIR_IMAGEM_UPLOAD":
      return { ...estado, imagem: { origem: "upload", bibliotecaId: null, uploadDataUrl: acao.dataUrl } };
    case "REMOVER_IMAGEM":
      return { ...estado, imagem: { origem: null, bibliotecaId: null, uploadDataUrl: null } };
    case "ATUALIZAR_COMPRA":
      return { ...estado, compra: { ...estado.compra, [acao.campo]: acao.valor } };
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
  const [estado, dispatch] = useReducer(reducerPedido, ESTADO_INICIAL);

  useEffect(() => {
    const id = setTimeout(() => salvarRascunho(estado), 300);
    return () => clearTimeout(id);
  }, [estado]);

  return <WizardContext.Provider value={{ estado, dispatch }}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValor {
  const contexto = useContext(WizardContext);
  if (!contexto) throw new Error("useWizard precisa ser usado dentro de <WizardProvider>");
  return contexto;
}
