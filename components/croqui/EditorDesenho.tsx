"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useWizard } from "@/lib/wizard-context";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";
import { caminhoImagem } from "@/lib/biblioteca";
import {
  DESENHO_INICIAL,
  HISTORICO_VAZIO,
  atualizarTexto,
  desfazer,
  duplicarElemento,
  espelharHorizontal,
  espelharVertical,
  girarPor,
  moverPor,
  normalizarAngulo,
  refazer,
  registrarNoHistorico,
  removerElemento,
  reordenarCamada,
  substituirElemento,
  transformacaoPadraoDaImagem,
  type DesenhoEstado,
  type ElementoDesenho,
  type Historico,
  type OperacaoCamada,
  type Transformacao,
} from "@/lib/desenho";
import { DocumentoCroqui } from "./DocumentoCroqui";
import { ID_IMAGEM, OverlayEdicao, type Ferramenta } from "./OverlayEdicao";

// ---------- estado local do editor (desenho + histórico) ----------

type EstadoEditor = { desenho: DesenhoEstado; historico: Historico; chave: string | null };

type AcaoEditor =
  | { tipo: "alterar"; alterar: (desenho: DesenhoEstado) => DesenhoEstado }
  /** Guarda o estado atual no histórico. Com `chave` igual à anterior, agrupa (ex.: digitar um texto). */
  | { tipo: "registrar"; chave?: string }
  | { tipo: "desfazer" }
  | { tipo: "refazer" };

function reducerEditor(estado: EstadoEditor, acao: AcaoEditor): EstadoEditor {
  switch (acao.tipo) {
    case "alterar":
      return { ...estado, desenho: acao.alterar(estado.desenho) };
    case "registrar":
      if (acao.chave && acao.chave === estado.chave) return estado;
      return { ...estado, historico: registrarNoHistorico(estado.historico, estado.desenho), chave: acao.chave ?? null };
    case "desfazer": {
      const resultado = desfazer(estado.historico, estado.desenho);
      return resultado ? { desenho: resultado.desenho, historico: resultado.historico, chave: null } : estado;
    }
    case "refazer": {
      const resultado = refazer(estado.historico, estado.desenho);
      return resultado ? { desenho: resultado.desenho, historico: resultado.historico, chave: null } : estado;
    }
  }
}

// ---------- componentes de interface ----------

const BOTAO = "rounded-md border px-2.5 py-1 text-sm disabled:opacity-40 dark:border-gray-600";
const BOTAO_ATIVO = "border-red-700 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-300";

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={titulo} className="flex flex-wrap items-center gap-1.5">
      {children}
    </div>
  );
}

const FERRAMENTAS: { id: Ferramenta; rotulo: string }[] = [
  { id: "selecionar", rotulo: "Selecionar" },
  { id: "linha", rotulo: "Linha" },
  { id: "seta", rotulo: "Seta" },
  { id: "seta-dupla", rotulo: "Seta dupla" },
  { id: "texto", rotulo: "Texto" },
  { id: "retangulo", rotulo: "Retângulo" },
];

const CAMADAS: { operacao: OperacaoCamada; rotulo: string; curto: string }[] = [
  { operacao: "frente", rotulo: "Para frente", curto: "Frente" },
  { operacao: "tras", rotulo: "Para trás", curto: "Trás" },
  { operacao: "topo", rotulo: "Ao topo", curto: "Topo" },
  { operacao: "fundo", rotulo: "Ao fundo", curto: "Fundo" },
];

function digitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
}

export function EditorDesenho() {
  const { estado, dispatch } = useWizard();
  const [{ desenho, historico }, despachar] = useReducer(reducerEditor, {
    desenho: estado.desenho ?? DESENHO_INICIAL,
    historico: HISTORICO_VAZIO,
    chave: null,
  });
  const [selecionadoBruto, setSelecionado] = useState<string | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("selecionar");
  const [pedidoFocoTexto, setPedidoFocoTexto] = useState(0);
  const campoTextoRef = useRef<HTMLTextAreaElement>(null);

  // O que sumiu (desfazer, excluir) deixa de estar selecionado.
  const selecionado =
    selecionadoBruto === ID_IMAGEM || desenho.elementos.some((e) => e.id === selecionadoBruto) ? selecionadoBruto : null;
  const elemento = desenho.elementos.find((e) => e.id === selecionado) ?? null;

  const itemBiblioteca = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const imagemSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBiblioteca
        ? caminhoImagem(itemBiblioteca)
        : null;

  // Espelha as mudanças no estado do wizard (e, a partir dele, no rascunho em localStorage).
  useEffect(() => {
    if (desenho !== estado.desenho) dispatch({ type: "DEFINIR_DESENHO", desenho });
  }, [desenho, estado.desenho, dispatch]);

  // Ajusta a imagem ao quadro respeitando a proporção real dela, para a seleção "abraçar" a foto.
  const precisaAjustarImagem = Boolean(imagemSrc) && desenho.imagem === null;
  useEffect(() => {
    if (!precisaAjustarImagem || !imagemSrc) return;
    let cancelado = false;
    const imagem = new Image();
    imagem.onload = () => {
      if (cancelado || !imagem.naturalWidth || !imagem.naturalHeight) return;
      const ajuste = transformacaoPadraoDaImagem(imagem.naturalWidth / imagem.naturalHeight);
      despachar({ tipo: "alterar", alterar: (d) => (d.imagem ? d : { ...d, imagem: ajuste }) });
    };
    imagem.src = imagemSrc;
    return () => {
      cancelado = true;
    };
  }, [precisaAjustarImagem, imagemSrc]);

  useEffect(() => {
    if (pedidoFocoTexto === 0) return;
    campoTextoRef.current?.focus();
    campoTextoRef.current?.select();
  }, [pedidoFocoTexto]);

  // ---------- ações ----------

  function aplicarNoSelecionado(transformar: <T extends Transformacao>(t: T) => T, chave?: string) {
    if (!selecionado) return;
    despachar({ tipo: "registrar", chave });
    despachar({
      tipo: "alterar",
      alterar: (d) => {
        if (selecionado === ID_IMAGEM) {
          // Posição ainda "automática" (ex.: imagem carregando): parte da posição padrão exibida.
          return { ...d, imagem: transformar(d.imagem ?? transformacaoPadraoDaImagem()) };
        }
        const atual = d.elementos.find((e) => e.id === selecionado);
        return atual ? { ...d, elementos: substituirElemento(d.elementos, transformar(atual)) } : d;
      },
    });
  }

  function alterarElemento(alterar: (e: ElementoDesenho) => ElementoDesenho, chave: string) {
    if (!elemento) return;
    despachar({ tipo: "registrar", chave: `${elemento.id}:${chave}` });
    despachar({
      tipo: "alterar",
      alterar: (d) => ({
        ...d,
        elementos: d.elementos.map((e) => (e.id === elemento.id ? alterar(e) : e)),
      }),
    });
  }

  function criar(novo: ElementoDesenho) {
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, elementos: [...d.elementos, novo] }) });
    setSelecionado(novo.id);
    if (novo.tipo === "texto") setPedidoFocoTexto((n) => n + 1);
  }

  function excluir() {
    if (!elemento) return;
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, elementos: removerElemento(d.elementos, elemento.id) }) });
    setSelecionado(null);
  }

  function duplicar() {
    if (!elemento) return;
    const copia = duplicarElemento(elemento);
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, elementos: [...d.elementos, copia] }) });
    setSelecionado(copia.id);
  }

  function mudarCamada(operacao: OperacaoCamada) {
    if (!elemento) return;
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, elementos: reordenarCamada(d.elementos, elemento.id, operacao) }) });
  }

  function restaurarImagem() {
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, imagem: null }) });
  }

  function limparAnotacoes() {
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, elementos: [] }) });
    setSelecionado(null);
  }

  // ---------- atalhos de teclado ----------

  useEffect(() => {
    function aoPressionarTecla(e: KeyboardEvent) {
      if (digitando(e.target)) return;
      const comando = e.ctrlKey || e.metaKey;
      const tecla = e.key.toLowerCase();

      if (comando && tecla === "z") {
        e.preventDefault();
        despachar({ tipo: e.shiftKey ? "refazer" : "desfazer" });
        return;
      }
      if (comando && tecla === "y") {
        e.preventDefault();
        despachar({ tipo: "refazer" });
        return;
      }
      if (comando && tecla === "d") {
        e.preventDefault();
        duplicar();
        return;
      }
      if (e.key === "Escape") {
        setFerramenta("selecionar");
        setSelecionado(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && elemento) {
        e.preventDefault();
        excluir();
        return;
      }

      const passo = e.shiftKey ? 20 : 2;
      const deslocamento = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
      if (deslocamento && selecionado && !comando) {
        e.preventDefault();
        aplicarNoSelecionado((t) => moverPor(t, deslocamento[0], deslocamento[1]), `${selecionado}:teclado`);
      }
    }
    window.addEventListener("keydown", aoPressionarTecla);
    return () => window.removeEventListener("keydown", aoPressionarTecla);
  });

  // ---------- interface ----------

  const camadaEdicao = (
    <OverlayEdicao
      desenho={desenho}
      selecionado={selecionado}
      ferramenta={ferramenta}
      aoSelecionar={setSelecionado}
      aoIniciarGesto={() => despachar({ tipo: "registrar" })}
      aoAlterarDesenho={(alterar) => despachar({ tipo: "alterar", alterar })}
      aoCriar={criar}
      aoFinalizarCriacao={() => setFerramenta("selecionar")}
      aoEditarTexto={(id) => {
        setSelecionado(id);
        setPedidoFocoTexto((n) => n + 1);
      }}
    />
  );

  const alvoTransformavel = selecionado !== null;
  const imagemSelecionada = selecionado === ID_IMAGEM;
  const rotacaoAtual = imagemSelecionada ? (desenho.imagem?.rotacao ?? 0) : (elemento?.rotacao ?? 0);
  const CAMPO_NUMERO = "rounded-md border px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-800";

  return (
    <>
      <div
        role="toolbar"
        aria-label="Ferramentas de edição do desenho"
        className="sticky top-2 z-30 mb-2 rounded-md border bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Grupo titulo="Ferramentas">
            {FERRAMENTAS.map(({ id, rotulo }) => (
              <button
                key={id}
                type="button"
                aria-pressed={ferramenta === id}
                onClick={() => setFerramenta(id)}
                className={`${BOTAO} ${ferramenta === id ? BOTAO_ATIVO : ""}`}
              >
                {rotulo}
              </button>
            ))}
          </Grupo>

          <Grupo titulo="Histórico">
            <button type="button" className={BOTAO} disabled={historico.passado.length === 0} onClick={() => despachar({ tipo: "desfazer" })}>
              Desfazer
            </button>
            <button type="button" className={BOTAO} disabled={historico.futuro.length === 0} onClick={() => despachar({ tipo: "refazer" })}>
              Refazer
            </button>
            <button type="button" className={BOTAO} disabled={desenho.elementos.length === 0} onClick={limparAnotacoes}>
              Limpar anotações
            </button>
          </Grupo>
        </div>

        {/* Altura reservada: as opções do item selecionado não podem empurrar o desenho para baixo. */}
        <div className="mt-2 flex h-28 flex-wrap content-start items-center gap-x-4 gap-y-2 overflow-y-auto border-t pt-2 text-sm dark:border-gray-700">
          {!alvoTransformavel && (
            <p className="text-gray-600 dark:text-gray-400">
              Clique em um item do desenho (ou na imagem) para movê-lo, esticá-lo ou girá-lo — ou escolha uma ferramenta acima para desenhar.
            </p>
          )}

          {alvoTransformavel && (
            <>
              <Grupo titulo="Posição">
                <button type="button" className={BOTAO} onClick={() => aplicarNoSelecionado((t) => girarPor(t, 90))}>
                  Girar 90°
                </button>
                <label className="flex items-center gap-1">
                  Rotação
                  <input
                    type="number"
                    aria-label="Rotação em graus"
                    className={`w-16 ${CAMPO_NUMERO}`}
                    value={Math.round(rotacaoAtual)}
                    onChange={(e) => {
                      const graus = normalizarAngulo(Number(e.target.value) || 0);
                      aplicarNoSelecionado((t) => ({ ...t, rotacao: graus }), `${selecionado}:rotacao`);
                    }}
                  />
                  °
                </label>
                <button type="button" aria-label="Espelhar horizontal" title="Espelhar horizontalmente" className={BOTAO} onClick={() => aplicarNoSelecionado(espelharHorizontal)}>
                  Espelhar ↔
                </button>
                <button type="button" aria-label="Espelhar vertical" title="Espelhar verticalmente" className={BOTAO} onClick={() => aplicarNoSelecionado(espelharVertical)}>
                  Espelhar ↕
                </button>
              </Grupo>

              {imagemSelecionada ? (
                <Grupo titulo="Imagem">
                  <button type="button" className={BOTAO} onClick={restaurarImagem}>
                    Restaurar posição da imagem
                  </button>
                </Grupo>
              ) : (
                <>
                  <Grupo titulo="Camadas">
                    {CAMADAS.map(({ operacao, rotulo, curto }) => (
                      <button key={operacao} type="button" aria-label={rotulo} title={rotulo} className={BOTAO} onClick={() => mudarCamada(operacao)}>
                        {curto}
                      </button>
                    ))}
                  </Grupo>
                  <Grupo titulo="Elemento">
                    <button type="button" className={BOTAO} onClick={duplicar}>
                      Duplicar
                    </button>
                    <button type="button" className={`${BOTAO} text-red-700 dark:text-red-400`} onClick={excluir}>
                      Excluir
                    </button>
                  </Grupo>
                </>
              )}
            </>
          )}

          {elemento && (
            <>
              <label className="flex items-center gap-1">
                Cor
                <input
                  type="color"
                  aria-label="Cor"
                  value={elemento.cor}
                  onChange={(e) => alterarElemento((el) => ({ ...el, cor: e.target.value }), "cor")}
                />
              </label>

              {(elemento.tipo === "linha" || elemento.tipo === "retangulo") && (
                <label className="flex items-center gap-1">
                  Espessura
                  <input
                    type="number"
                    min={1}
                    max={40}
                    aria-label="Espessura"
                    className={`w-16 ${CAMPO_NUMERO}`}
                    value={elemento.espessura}
                    onChange={(e) =>
                      alterarElemento(
                        (el) => (el.tipo === "texto" ? el : { ...el, espessura: Math.min(40, Math.max(1, Number(e.target.value) || 1)) }),
                        "espessura"
                      )
                    }
                  />
                </label>
              )}

              {elemento.tipo === "linha" && (
                <>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={elemento.setaInicio}
                      onChange={(e) => alterarElemento((el) => (el.tipo === "linha" ? { ...el, setaInicio: e.target.checked } : el), "seta-inicio")}
                    />
                    Seta no início
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={elemento.setaFim}
                      onChange={(e) => alterarElemento((el) => (el.tipo === "linha" ? { ...el, setaFim: e.target.checked } : el), "seta-fim")}
                    />
                    Seta no fim
                  </label>
                </>
              )}

              {elemento.tipo === "retangulo" && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={elemento.preenchimento !== null}
                    onChange={(e) =>
                      alterarElemento((el) => (el.tipo === "retangulo" ? { ...el, preenchimento: e.target.checked ? "#fde68a" : null } : el), "preencher")
                    }
                  />
                  Preencher
                  {elemento.preenchimento !== null && (
                    <input
                      type="color"
                      aria-label="Cor do preenchimento"
                      value={elemento.preenchimento}
                      onChange={(e) =>
                        alterarElemento((el) => (el.tipo === "retangulo" ? { ...el, preenchimento: e.target.value } : el), "preenchimento")
                      }
                    />
                  )}
                </label>
              )}

              {elemento.tipo === "texto" && (
                <>
                  <label className="flex items-center gap-1">
                    Texto
                    <textarea
                      ref={campoTextoRef}
                      rows={2}
                      aria-label="Texto do elemento"
                      className={`w-56 ${CAMPO_NUMERO}`}
                      value={elemento.texto}
                      onChange={(e) =>
                        alterarElemento((el) => (el.tipo === "texto" ? atualizarTexto(el, { texto: e.target.value }) : el), "texto")
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Tamanho
                    <input
                      type="number"
                      min={8}
                      max={200}
                      aria-label="Tamanho da fonte"
                      className={`w-16 ${CAMPO_NUMERO}`}
                      value={Math.round(elemento.tamanhoFonte)}
                      onChange={(e) =>
                        alterarElemento(
                          (el) => (el.tipo === "texto" ? atualizarTexto(el, { tamanhoFonte: Math.min(200, Math.max(8, Number(e.target.value) || 8)) }) : el),
                          "tamanho"
                        )
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={elemento.negrito}
                      onChange={(e) => alterarElemento((el) => (el.tipo === "texto" ? atualizarTexto(el, { negrito: e.target.checked }) : el), "negrito")}
                    />
                    Negrito
                  </label>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <details className="mb-3 text-xs text-gray-600 dark:text-gray-400">
        <summary className="cursor-pointer">Atalhos e dicas de edição</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Escolha uma ferramenta e clique (ou arraste) no desenho; a ferramenta volta para &ldquo;Selecionar&rdquo; depois de desenhar.</li>
          <li>Selecione um item para mover (arrastando), esticar (alças quadradas) ou girar (alça redonda; Shift encaixa de 15° em 15°).</li>
          <li>Setas do teclado movem o item selecionado (Shift = passo maior) · Delete exclui · Ctrl+D duplica · Esc deseleciona.</li>
          <li>Ctrl+Z desfaz · Ctrl+Shift+Z (ou Ctrl+Y) refaz · duplo clique em um texto edita o conteúdo.</li>
        </ul>
      </details>

      <div className="relative mr-[calc(50%-50vw)] ml-[calc(50%-50vw)] mb-6 w-screen overflow-x-auto px-4">
        <div className="mx-auto max-w-[1600px]">
          <DocumentoCroqui estado={{ ...estado, desenho }} camadaEdicao={camadaEdicao} />
        </div>
      </div>
    </>
  );
}
