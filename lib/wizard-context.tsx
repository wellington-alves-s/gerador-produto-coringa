"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react";
import { ESTADO_INICIAL, type EstadoPedido, type EtapaId } from "./pedido";
import { existeRascunho, salvarRascunho } from "./wizard-storage";
import { PRODUTOS } from "@/produtos";
import type { Campo, TipoProdutoId } from "@/produtos/tipos";
import { campoEfetivo, campoVisivel, dependenciaAtiva } from "@/produtos/validacao";
import { DESENHO_INICIAL, type DesenhoEstado } from "./desenho";
import { ErroSalvamento, salvarCroquiNoServidor } from "./croquis-cliente";

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
  | { type: "DEFINIR_CROQUI_ID"; id: number | null }
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
      const valor = resultado[campo.id];
      if (!valor) continue;
      const dependenciaInativa =
        campo.dependeDe && !dependenciaAtiva(resultado[campo.dependeDe.campoId], campo.dependeDe.valores);
      const opcaoNaoPermitida =
        campo.tipo === "opcao-unica" &&
        campo.opcoesPorValor &&
        !(campoEfetivo(campo, resultado) as typeof campo).opcoes.includes(valor);
      if (dependenciaInativa || opcaoNaoPermitida || !campoVisivel(campo, resultado)) {
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
    case "DEFINIR_CROQUI_ID":
      return { ...estado, croquiId: acao.id };
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

/**
 * Se o croqui já salvo não existe mais para este usuário (apagado pela limpeza, em outra aba, ou
 * rascunho de outra conta), o 404 não pode travar o salvamento: recria o croqui uma vez.
 */
async function salvarComRecuperacao(estado: EstadoPedido): Promise<number> {
  try {
    return await salvarCroquiNoServidor(estado);
  } catch (erro) {
    if (erro instanceof ErroSalvamento && erro.status === 404 && estado.croquiId !== null) {
      return salvarCroquiNoServidor({ ...estado, croquiId: null });
    }
    throw erro;
  }
}

export type StatusSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

type WizardContextValor = {
  estado: EstadoPedido;
  dispatch: Dispatch<AcaoPedido>;
  /** Grava o croqui na nuvem (serializado). Nunca lança: falhas viram `statusSalvamento: "erro"`. */
  salvarAgora: () => Promise<void>;
  statusSalvamento: StatusSalvamento;
  mensagemSalvamento: string | null;
};

const WizardContext = createContext<WizardContextValor | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [estado, dispatchBase] = useReducer(reducerPedido, ESTADO_INICIAL);
  const podeSalvar = useRef(!existeRascunho());
  const [salvamento, setSalvamento] = useState<{ status: StatusSalvamento; mensagem: string | null }>({
    status: "ocioso",
    mensagem: null,
  });
  const estadoRef = useRef(estado);
  const fila = useRef<Promise<void>>(Promise.resolve());
  // "Geração" muda quando o croqui em edição é trocado (REINICIAR/CARREGAR_ESTADO): respostas
  // de salvamentos antigos que chegam depois disso são descartadas.
  const geracao = useRef(0);
  // Id devolvido pelo último salvamento: cobre o intervalo até o estado do reducer refleti-lo.
  const ultimoId = useRef<{ geracao: number; id: number } | null>(null);

  useEffect(() => {
    if (!podeSalvar.current) return;
    const id = setTimeout(() => salvarRascunho(estado), 300);
    return () => clearTimeout(id);
  }, [estado]);

  useEffect(() => {
    const ultimo = ultimoId.current;
    estadoRef.current =
      ultimo && ultimo.geracao === geracao.current && estado.croquiId === null
        ? { ...estado, croquiId: ultimo.id }
        : estado;
  }, [estado]);

  const dispatch = useCallback<Dispatch<AcaoPedido>>((acao) => {
    if (acao.type === "CARREGAR_ESTADO" || acao.type === "REINICIAR") {
      podeSalvar.current = true;
      geracao.current += 1;
    }
    dispatchBase(acao);
  }, []);

  const salvarAgora = useCallback((): Promise<void> => {
    const tarefa = fila.current.then(async () => {
      const atual = estadoRef.current;
      if (!atual.tipo || !atual.pedido.cliente.trim()) return;
      const minhaGeracao = geracao.current;
      setSalvamento({ status: "salvando", mensagem: null });
      try {
        const id = await salvarComRecuperacao(atual);
        if (minhaGeracao !== geracao.current) return;
        ultimoId.current = { geracao: minhaGeracao, id };
        estadoRef.current = { ...estadoRef.current, croquiId: id };
        dispatchBase({ type: "DEFINIR_CROQUI_ID", id });
        setSalvamento({ status: "salvo", mensagem: null });
      } catch (erro) {
        if (minhaGeracao !== geracao.current) return;
        const mensagem =
          erro instanceof ErroSalvamento ? erro.message : "Não foi possível salvar o croqui na nuvem. Tente novamente.";
        setSalvamento({ status: "erro", mensagem });
      }
    });
    fila.current = tarefa;
    return tarefa;
  }, []);

  return (
    <WizardContext.Provider
      value={{ estado, dispatch, salvarAgora, statusSalvamento: salvamento.status, mensagemSalvamento: salvamento.mensagem }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValor {
  const contexto = useContext(WizardContext);
  if (!contexto) throw new Error("useWizard precisa ser usado dentro de <WizardProvider>");
  return contexto;
}
