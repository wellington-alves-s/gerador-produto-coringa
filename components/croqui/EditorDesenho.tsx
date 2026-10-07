"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useWizard } from "@/lib/wizard-context";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";
import { caminhoImagem } from "@/lib/biblioteca";
import {
  DESENHO_INICIAL,
  HISTORICO_VAZIO,
  atualizarTexto,
  criarImagem,
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
import { BarraFlutuante } from "@/components/ui/BarraFlutuante";
import { Icone } from "@/components/ui/Icones";
import { comprimirImagemComDimensoes } from "@/lib/imagem";
import { carimboDaArea, type AreaSelecionada, type Carimbo } from "@/lib/apagamento";
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

const BOTAO =
  "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[13px] font-medium text-slate-100 transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5";
const BOTAO_ATIVO = "!border-red-500/70 !bg-red-500/10 !text-red-300";
const BOTAO_PERIGO = "!border-red-500/40 !text-red-300";
const CAMPO = "rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-100";
const SEPARADOR = <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-white/10 sm:inline-block" />;

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={titulo} className="flex flex-wrap items-center gap-1">
      {children}
    </div>
  );
}

const FERRAMENTAS: { id: Ferramenta; rotulo: string; nomeAcessivel?: string; icone: ReactNode }[] = [
  { id: "selecionar", rotulo: "Selecionar", icone: <Icone.Selecionar /> },
  { id: "linha", rotulo: "Linha", icone: <Icone.Linha /> },
  { id: "seta", rotulo: "Seta", icone: <Icone.Seta /> },
  { id: "seta-dupla", rotulo: "Seta dupla", icone: <Icone.SetaDupla /> },
  { id: "texto", rotulo: "Texto", icone: <Icone.Texto /> },
  { id: "retangulo", rotulo: "Retângulo", icone: <Icone.Retangulo /> },
  { id: "retangulo-cheio", rotulo: "Preenchido", nomeAcessivel: "Retângulo preenchido", icone: <Icone.RetanguloCheio /> },
  { id: "apagar-area", rotulo: "Apagar área", icone: <Icone.ApagarArea /> },
  { id: "borracha", rotulo: "Borracha", icone: <Icone.Borracha /> },
];

const CAMADAS: { operacao: OperacaoCamada; rotulo: string; curto: string; icone: ReactNode }[] = [
  { operacao: "frente", rotulo: "Para frente", curto: "Frente", icone: <Icone.Frente /> },
  { operacao: "tras", rotulo: "Para trás", curto: "Trás", icone: <Icone.Tras /> },
  { operacao: "topo", rotulo: "Ao topo", curto: "Topo", icone: <Icone.Topo /> },
  { operacao: "fundo", rotulo: "Ao fundo", curto: "Fundo", icone: <Icone.Fundo /> },
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
  const [tamanhoBorracha, setTamanhoBorracha] = useState(40);
  const [selecaoArea, setSelecaoArea] = useState<AreaSelecionada | null>(null);
  const [avisoColar, setAvisoColar] = useState<string | null>(null);
  const temporizadorAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pedidoFocoTexto, setPedidoFocoTexto] = useState(0);
  const campoTextoRef = useRef<HTMLTextAreaElement>(null);
  const ancoraRef = useRef<HTMLDivElement>(null);
  // `null` = automático (expande quando há algo selecionado); o botão "•••" força abrir/fechar para a seleção atual.
  const [expansaoManual, setExpansaoManual] = useState<{ para: string | null; aberto: boolean } | null>(null);

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

  function avisar(mensagem: string) {
    setAvisoColar(mensagem);
    if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAvisoColar(null), 5000);
  }

  /** Imagem da área de transferência (Ctrl+V ou botão) vira um item novo do desenho. */
  async function colarImagem(arquivo: File) {
    try {
      const { dataUrl, largura, altura } = await comprimirImagemComDimensoes(arquivo, { larguraMaxima: 1200, qualidade: 0.82 });
      criar(criarImagem(dataUrl, largura / altura));
      setFerramenta("selecionar");
    } catch {
      avisar("Não foi possível usar a imagem colada. Tente copiá-la de novo.");
    }
  }

  async function colarDoBotao() {
    try {
      const itens = await navigator.clipboard.read();
      for (const item of itens) {
        const tipo = item.types.find((t) => t.startsWith("image/"));
        if (tipo) {
          const blob = await item.getType(tipo);
          await colarImagem(new File([blob], "colada", { type: tipo }));
          return;
        }
      }
      avisar("Não há imagem na área de transferência. Copie uma imagem e tente de novo.");
    } catch {
      avisar("O navegador não liberou o acesso à área de transferência. Clique no desenho e use Ctrl+V.");
    }
  }

  useEffect(() => {
    function aoColar(e: ClipboardEvent) {
      if (digitando(e.target)) return; // colar texto em um campo continua normal
      const itens = Array.from(e.clipboardData?.items ?? []);
      const arquivo = itens.find((i) => i.kind === "file" && i.type.startsWith("image/"))?.getAsFile();
      if (!arquivo) return;
      e.preventDefault();
      void colarImagem(arquivo);
    }
    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
  });

  useEffect(
    () => () => {
      if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    },
    []
  );

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

  const emFerramentaApagar = ferramenta === "apagar-area" || ferramenta === "borracha";
  const quantidadeApagada = desenho.apagamentos?.length ?? 0;

  function escolherFerramenta(id: Ferramenta) {
    setFerramenta(id);
    if (id !== "apagar-area") setSelecaoArea(null);
  }

  function apagarCarimbos(carimbos: Carimbo[], registrar: boolean) {
    if (carimbos.length === 0) return;
    if (registrar) despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, apagamentos: [...(d.apagamentos ?? []), ...carimbos] }) });
  }

  function apagarArea() {
    const imagem = desenho.imagem;
    if (!selecaoArea || !imagem) return;
    apagarCarimbos([carimboDaArea(imagem, selecaoArea)], true);
    setSelecaoArea(null);
  }

  function restaurarApagamentos() {
    despachar({ tipo: "registrar" });
    despachar({ tipo: "alterar", alterar: (d) => ({ ...d, apagamentos: [] }) });
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
        setSelecaoArea(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selecaoArea) {
        e.preventDefault();
        apagarArea();
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
      tamanhoBorracha={tamanhoBorracha}
      selecaoArea={selecaoArea}
      aoDefinirSelecaoArea={setSelecaoArea}
      aoApagarCarimbos={(carimbos) => apagarCarimbos(carimbos, false)}
      aoEditarTexto={(id) => {
        setSelecionado(id);
        setPedidoFocoTexto((n) => n + 1);
      }}
    />
  );

  const alvoTransformavel = selecionado !== null;
  const imagemSelecionada = selecionado === ID_IMAGEM;
  const rotacaoAtual = imagemSelecionada ? (desenho.imagem?.rotacao ?? 0) : (elemento?.rotacao ?? 0);
  const expandidoAutomatico = alvoTransformavel || emFerramentaApagar || selecaoArea !== null;
  const expandido = expansaoManual && expansaoManual.para === selecionado ? expansaoManual.aberto : expandidoAutomatico;
  const apagarIndisponivel = !imagemSrc;

  const linhaPrincipal = (
    <>
      <Grupo titulo="Ferramentas">
        {FERRAMENTAS.map(({ id, rotulo, nomeAcessivel, icone }) => (
          <button
            key={id}
            type="button"
            aria-pressed={ferramenta === id}
            aria-label={nomeAcessivel}
            disabled={apagarIndisponivel && (id === "apagar-area" || id === "borracha")}
            title={apagarIndisponivel && (id === "apagar-area" || id === "borracha") ? "Escolha uma imagem para poder apagar partes dela" : undefined}
            onClick={() => escolherFerramenta(id)}
            className={`${BOTAO} ${ferramenta === id ? BOTAO_ATIVO : ""}`}
          >
            {icone}
            {rotulo}
          </button>
        ))}
      </Grupo>

      {SEPARADOR}

      <Grupo titulo="Histórico">
        <button type="button" className={BOTAO} disabled={historico.passado.length === 0} onClick={() => despachar({ tipo: "desfazer" })}>
          <Icone.Desfazer />
          Desfazer
        </button>
        <button type="button" className={BOTAO} disabled={historico.futuro.length === 0} onClick={() => despachar({ tipo: "refazer" })}>
          <Icone.Refazer />
          Refazer
        </button>
        <button
          type="button"
          aria-label="Limpar anotações"
          title="Limpar anotações"
          className={BOTAO}
          disabled={desenho.elementos.length === 0}
          onClick={limparAnotacoes}
        >
          <Icone.Lixeira />
          Limpar
        </button>
      </Grupo>

      <button
        type="button"
        title="Cola a imagem copiada (também funciona com Ctrl+V)"
        className={BOTAO}
        onClick={() => void colarDoBotao()}
      >
        <Icone.Colar />
        Colar imagem
      </button>
      {avisoColar && (
        <span role="status" className="max-w-xs px-2 text-xs text-amber-300">
          {avisoColar}
        </span>
      )}

      <button
        type="button"
        aria-label={expandido ? "Recolher opções" : "Mais opções"}
        aria-expanded={expandido}
        title={expandido ? "Recolher opções" : "Mais opções"}
        className={`${BOTAO} !px-2`}
        onClick={() => setExpansaoManual({ para: selecionado, aberto: !expandido })}
      >
        <Icone.Mais />
        <span className={`transition-transform ${expandido ? "rotate-180" : ""}`}>
          <Icone.Seta_para_baixo />
        </span>
      </button>
    </>
  );

  const expansao = (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[1.25rem] bg-black/20 p-2 text-[13px]">
      {!alvoTransformavel && !emFerramentaApagar && (
        <p className="px-1 text-slate-300">
          Clique em um item do desenho (ou na imagem) para movê-lo, esticá-lo ou girá-lo — ou escolha uma ferramenta para desenhar.
        </p>
      )}

      {emFerramentaApagar && (
        <Grupo titulo="Apagar">
          {ferramenta === "apagar-area" ? (
            <>
              <span className="px-1 text-slate-300">Arraste sobre a imagem para marcar a área.</span>
              <button type="button" aria-label="Apagar área selecionada" disabled={!selecaoArea} className={`${BOTAO} ${BOTAO_PERIGO}`} onClick={apagarArea}>
                <Icone.Lixeira />
                Apagar selecionada
              </button>
              <button type="button" className={BOTAO} disabled={!selecaoArea} onClick={() => setSelecaoArea(null)}>
                Cancelar seleção
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1 px-1">
                Tamanho
                <input
                  type="number"
                  min={5}
                  max={300}
                  aria-label="Tamanho da borracha"
                  className={`w-16 ${CAMPO}`}
                  value={tamanhoBorracha}
                  onChange={(e) => setTamanhoBorracha(Math.min(300, Math.max(5, Number(e.target.value) || 5)))}
                />
              </label>
              <span className="px-1 text-slate-300">Arraste sobre a imagem para apagar.</span>
            </>
          )}
          {quantidadeApagada > 0 && (
            <button type="button" className={BOTAO} onClick={restaurarApagamentos}>
              Restaurar imagem original
            </button>
          )}
        </Grupo>
      )}

      {alvoTransformavel && !emFerramentaApagar && (
        <>
          <Grupo titulo="Posição">
            <button type="button" className={BOTAO} onClick={() => aplicarNoSelecionado((t) => girarPor(t, 90))}>
              <Icone.Girar />
              Girar 90°
            </button>
            <label className="flex items-center gap-1 px-1">
              Rotação
              <input
                type="number"
                aria-label="Rotação em graus"
                className={`w-14 ${CAMPO}`}
                value={Math.round(rotacaoAtual)}
                onChange={(e) => {
                  const graus = normalizarAngulo(Number(e.target.value) || 0);
                  aplicarNoSelecionado((t) => ({ ...t, rotacao: graus }), `${selecionado}:rotacao`);
                }}
              />
              °
            </label>
            <button type="button" aria-label="Espelhar horizontal" title="Espelhar horizontalmente" className={BOTAO} onClick={() => aplicarNoSelecionado(espelharHorizontal)}>
              <Icone.EspelharHorizontal />
              Espelhar H
            </button>
            <button type="button" aria-label="Espelhar vertical" title="Espelhar verticalmente" className={BOTAO} onClick={() => aplicarNoSelecionado(espelharVertical)}>
              <Icone.EspelharVertical />
              Espelhar V
            </button>
          </Grupo>

          {imagemSelecionada ? (
            <Grupo titulo="Imagem">
              <button type="button" className={BOTAO} onClick={restaurarImagem}>
                Restaurar posição da imagem
              </button>
              {quantidadeApagada > 0 && (
                <button type="button" className={BOTAO} onClick={restaurarApagamentos}>
                  Restaurar imagem original
                </button>
              )}
            </Grupo>
          ) : (
            <>
              {SEPARADOR}
              <Grupo titulo="Camadas">
                {CAMADAS.map(({ operacao, rotulo, curto, icone }) => (
                  <button key={operacao} type="button" aria-label={rotulo} title={rotulo} className={BOTAO} onClick={() => mudarCamada(operacao)}>
                    {icone}
                    {curto}
                  </button>
                ))}
              </Grupo>
              {SEPARADOR}
              <Grupo titulo="Elemento">
                <button type="button" className={BOTAO} onClick={duplicar}>
                  <Icone.Duplicar />
                  Duplicar
                </button>
                <button type="button" className={`${BOTAO} ${BOTAO_PERIGO}`} onClick={excluir}>
                  <Icone.Lixeira />
                  Excluir
                </button>
              </Grupo>
            </>
          )}
        </>
      )}

      {elemento && !emFerramentaApagar && (
        <>
          {elemento.tipo !== "imagem" && (
          <label className="flex items-center gap-1 px-1">
            Cor
            <input
              type="color"
              aria-label="Cor"
              className="h-7 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
              value={elemento.cor}
              onChange={(e) =>
                alterarElemento(
                  // Bloco sólido (preenchimento igual à borda): trocar a cor muda os dois de uma vez.
                  (el) =>
                    el.tipo === "retangulo" && el.preenchimento === el.cor
                      ? { ...el, cor: e.target.value, preenchimento: e.target.value }
                      : { ...el, cor: e.target.value },
                  "cor"
                )
              }
            />
          </label>
          )}

          {(elemento.tipo === "linha" || elemento.tipo === "retangulo") && (
            <label className="flex items-center gap-1 px-1">
              Espessura
              <input
                type="number"
                min={1}
                max={40}
                aria-label="Espessura"
                className={`w-14 ${CAMPO}`}
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
              <label className="flex items-center gap-1.5 px-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-500"
                  checked={elemento.setaInicio}
                  onChange={(e) => alterarElemento((el) => (el.tipo === "linha" ? { ...el, setaInicio: e.target.checked } : el), "seta-inicio")}
                />
                Seta no início
              </label>
              <label className="flex items-center gap-1.5 px-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-500"
                  checked={elemento.setaFim}
                  onChange={(e) => alterarElemento((el) => (el.tipo === "linha" ? { ...el, setaFim: e.target.checked } : el), "seta-fim")}
                />
                Seta no fim
              </label>
            </>
          )}

          {elemento.tipo === "retangulo" && (
            <label className="flex items-center gap-1.5 px-1">
              <input
                type="checkbox"
                className="h-4 w-4 accent-red-500"
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
                  className="h-7 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
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
              <label className="flex items-center gap-1 px-1">
                Texto
                <textarea
                  ref={campoTextoRef}
                  rows={1}
                  aria-label="Texto do elemento"
                  className={`w-48 resize-none ${CAMPO}`}
                  value={elemento.texto}
                  onChange={(e) => alterarElemento((el) => (el.tipo === "texto" ? atualizarTexto(el, { texto: e.target.value }) : el), "texto")}
                />
              </label>
              <label className="flex items-center gap-1 px-1">
                Tamanho
                <input
                  type="number"
                  min={8}
                  max={200}
                  aria-label="Tamanho da fonte"
                  className={`w-14 ${CAMPO}`}
                  value={Math.round(elemento.tamanhoFonte)}
                  onChange={(e) =>
                    alterarElemento(
                      (el) => (el.tipo === "texto" ? atualizarTexto(el, { tamanhoFonte: Math.min(200, Math.max(8, Number(e.target.value) || 8)) }) : el),
                      "tamanho"
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-1.5 px-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-500"
                  checked={elemento.negrito}
                  onChange={(e) => alterarElemento((el) => (el.tipo === "texto" ? atualizarTexto(el, { negrito: e.target.checked }) : el), "negrito")}
                />
                Negrito
              </label>
            </>
          )}
        </>
      )}

      <details className="w-full px-1 text-xs text-slate-400">
        <summary className="cursor-pointer select-none">Atalhos e dicas</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Escolha uma ferramenta e clique (ou arraste) no desenho; depois de desenhar, a ferramenta volta para &ldquo;Selecionar&rdquo;.</li>
          <li>Selecione um item para mover (arrastando), esticar (alças quadradas) ou girar (alça redonda; Shift encaixa de 15° em 15°).</li>
          <li>Setas do teclado movem o item (Shift = passo maior) · Delete exclui · Ctrl+D duplica · Esc deseleciona.</li>
          <li>Apagar área: arraste para marcar e use o botão ou Delete (Esc cancela). Borracha: arraste sobre a imagem; só apaga a imagem, as anotações você exclui separadamente.</li>
          <li>Ctrl+Z desfaz · Ctrl+Shift+Z (ou Ctrl+Y) refaz · duplo clique em um texto edita o conteúdo.</li>
        </ul>
      </details>
    </div>
  );

  return (
    <>
      <BarraFlutuante
        rotulo="Ferramentas de edição do desenho"
        ancora={ancoraRef}
        expandido={expandido}
        principal={linhaPrincipal}
        expansao={expansao}
      />

      <div
        ref={ancoraRef}
        className="relative mr-[calc(50%-50vw)] ml-[calc(50%-50vw)] mb-6 w-screen overflow-x-auto px-4"
      >
        <div className="mx-auto max-w-[1600px]">
          <DocumentoCroqui estado={{ ...estado, desenho }} camadaEdicao={camadaEdicao} />
        </div>
      </div>
    </>
  );
}
