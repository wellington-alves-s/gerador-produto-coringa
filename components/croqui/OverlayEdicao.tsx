"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ALTURA_DESENHO,
  DIRECAO_ALCA,
  LARGURA_DESENHO,
  arrastarExtremidadeDaLinha,
  criarComTamanhoPadrao,
  criarLinha,
  criarRetangulo,
  criarTexto,
  linhaEntre,
  moverPor,
  redimensionarPorAlca,
  redimensionarTexto,
  retanguloEntre,
  rotacionarParaPonto,
  substituirElemento,
  transformacaoPadraoDaImagem,
  type Alca,
  type DesenhoEstado,
  type ElementoDesenho,
  type Ponto,
  type TipoLinha,
  type Transformacao,
} from "@/lib/desenho";
import { transformacaoSvg } from "./ElementosDesenho";

export type Ferramenta = "selecionar" | TipoLinha | "texto" | "retangulo";
export const ID_IMAGEM = "imagem";

type Alvo = Transformacao | ElementoDesenho;

type Gesto =
  | { tipo: "mover"; id: string; inicio: Ponto; original: Alvo; registrado: boolean }
  | { tipo: "alca"; id: string; alca: Alca; original: Alvo; registrado: boolean }
  | { tipo: "extremidade"; id: string; qual: "inicio" | "fim"; original: ElementoDesenho; registrado: boolean }
  | { tipo: "rotacionar"; id: string; original: Alvo; registrado: boolean }
  | { tipo: "criar"; variante: TipoLinha | "retangulo"; inicio: Ponto; original: ElementoDesenho };

type Props = {
  desenho: DesenhoEstado;
  selecionado: string | null;
  ferramenta: Ferramenta;
  aoSelecionar: (id: string | null) => void;
  /** Chamado antes da primeira alteração de um gesto, para registrar o estado no histórico. */
  aoIniciarGesto: () => void;
  aoAlterarDesenho: (alterar: (desenho: DesenhoEstado) => DesenhoEstado) => void;
  /** Insere um elemento novo (registra no histórico e seleciona). */
  aoCriar: (elemento: ElementoDesenho) => void;
  aoFinalizarCriacao: () => void;
  aoEditarTexto: (id: string) => void;
};

const ALCAS_CANTO: Alca[] = ["nw", "ne", "se", "sw"];
const ALCAS_BORDA: Alca[] = ["n", "e", "s", "w"];
const CURSOR_ALCA: Record<Alca, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};
const COR_SELECAO = "#2563eb";
const ARRASTO_MINIMO_CRIACAO = 8;

function ehElemento(alvo: Alvo): alvo is ElementoDesenho {
  return "tipo" in alvo;
}

export function OverlayEdicao({
  desenho,
  selecionado,
  ferramenta,
  aoSelecionar,
  aoIniciarGesto,
  aoAlterarDesenho,
  aoCriar,
  aoFinalizarCriacao,
  aoEditarTexto,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestoRef = useRef<Gesto | null>(null);
  const [escala, setEscala] = useState(0.7);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => {
      const largura = svg.getBoundingClientRect().width;
      if (largura > 0) setEscala(largura / LARGURA_DESENHO);
    });
    observador.observe(svg);
    return () => observador.disconnect();
  }, []);

  const imagem = desenho.imagem ?? transformacaoPadraoDaImagem();
  const editando = ferramenta === "selecionar";

  function ponto(e: { clientX: number; clientY: number }): Ponto {
    // A escala é sempre pela largura (x e y na mesma unidade); a moldura pode ser mais alta que o quadro 5:4.
    const caixa = svgRef.current?.getBoundingClientRect();
    const pxPorUnidade = (caixa?.width || LARGURA_DESENHO) / LARGURA_DESENHO;
    return {
      x: (e.clientX - (caixa?.left ?? 0)) / pxPorUnidade,
      y: (e.clientY - (caixa?.top ?? 0)) / pxPorUnidade,
    };
  }

  function alvoDe(id: string): Alvo | undefined {
    return id === ID_IMAGEM ? imagem : desenho.elementos.find((e) => e.id === id);
  }

  function aplicar(id: string, novo: Alvo) {
    aoAlterarDesenho((d) =>
      id === ID_IMAGEM
        ? { ...d, imagem: novo as Transformacao }
        : { ...d, elementos: substituirElemento(d.elementos, novo as ElementoDesenho) }
    );
  }

  function capturar(e: ReactPointerEvent) {
    svgRef.current?.setPointerCapture?.(e.pointerId);
  }

  function registrarUmaVez(gesto: Exclude<Gesto, { tipo: "criar" }>) {
    if (gesto.registrado) return;
    gesto.registrado = true;
    aoIniciarGesto();
  }

  // ---------- início dos gestos ----------

  function iniciarMover(e: ReactPointerEvent, id: string) {
    if (!editando || e.button > 0) return;
    e.stopPropagation();
    const original = alvoDe(id);
    if (!original) return;
    aoSelecionar(id);
    capturar(e);
    gestoRef.current = { tipo: "mover", id, inicio: ponto(e), original, registrado: false };
  }

  function iniciarAlca(e: ReactPointerEvent, id: string, alca: Alca) {
    e.stopPropagation();
    const original = alvoDe(id);
    if (!original) return;
    capturar(e);
    gestoRef.current = { tipo: "alca", id, alca, original, registrado: false };
  }

  function iniciarExtremidade(e: ReactPointerEvent, elemento: ElementoDesenho, qual: "inicio" | "fim") {
    e.stopPropagation();
    capturar(e);
    gestoRef.current = { tipo: "extremidade", id: elemento.id, qual, original: elemento, registrado: false };
  }

  function iniciarRotacao(e: ReactPointerEvent, id: string) {
    e.stopPropagation();
    const original = alvoDe(id);
    if (!original) return;
    capturar(e);
    gestoRef.current = { tipo: "rotacionar", id, original, registrado: false };
  }

  function aoPressionarFundo(e: ReactPointerEvent) {
    if (e.button > 0) return;
    const p = ponto(e);
    if (ferramenta === "selecionar") {
      aoSelecionar(null);
      return;
    }
    if (ferramenta === "texto") {
      aoCriar(criarTexto(p));
      aoFinalizarCriacao();
      return;
    }
    const elemento = ferramenta === "retangulo" ? criarRetangulo(p, p) : criarLinha(p, p, ferramenta);
    capturar(e);
    aoCriar(elemento);
    gestoRef.current = { tipo: "criar", variante: ferramenta, inicio: p, original: elemento };
  }

  // ---------- andamento e fim dos gestos ----------

  function aoMover(e: ReactPointerEvent) {
    const gesto = gestoRef.current;
    if (!gesto) return;
    const p = ponto(e);

    if (gesto.tipo === "criar") {
      const novo =
        gesto.original.tipo === "retangulo"
          ? { ...gesto.original, ...retanguloEntre(gesto.inicio, p) }
          : { ...gesto.original, ...linhaEntre(gesto.inicio, p) };
      gestoRef.current = { ...gesto, original: novo };
      aplicar(novo.id, novo);
      return;
    }

    registrarUmaVez(gesto);
    let novo: Alvo;
    switch (gesto.tipo) {
      case "mover":
        novo = moverPor(gesto.original, p.x - gesto.inicio.x, p.y - gesto.inicio.y);
        break;
      case "alca": {
        const original = gesto.original;
        if (ehElemento(original) && original.tipo === "texto") {
          novo = redimensionarTexto(original, gesto.alca, p);
        } else {
          const canto = ALCAS_CANTO.includes(gesto.alca);
          novo = redimensionarPorAlca(original, gesto.alca, p, {
            proporcional: !ehElemento(original) || (e.shiftKey && canto),
          });
        }
        break;
      }
      case "extremidade":
        novo = arrastarExtremidadeDaLinha(gesto.original as Extract<ElementoDesenho, { tipo: "linha" }>, gesto.qual, p);
        break;
      case "rotacionar":
        novo = rotacionarParaPonto(gesto.original, p, e.shiftKey ? 15 : undefined);
        break;
    }
    aplicar(gesto.id, novo);
  }

  function aoSoltar(e: ReactPointerEvent) {
    const gesto = gestoRef.current;
    gestoRef.current = null;
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    if (gesto?.tipo !== "criar") return;

    const atual = gesto.original;
    const pequeno =
      atual.tipo === "retangulo"
        ? atual.largura < ARRASTO_MINIMO_CRIACAO || atual.altura < ARRASTO_MINIMO_CRIACAO
        : atual.largura < ARRASTO_MINIMO_CRIACAO;
    if (pequeno) {
      aplicar(atual.id, { ...criarComTamanhoPadrao(gesto.variante, gesto.inicio), id: atual.id });
    }
    aoFinalizarCriacao();
  }

  // ---------- desenho dos elementos de seleção ----------

  const tamAlca = 11 / escala;
  const traco = 1.5 / escala;

  function renderAlca(id: string, t: Transformacao, alca: Alca) {
    const [hx, hy] = DIRECAO_ALCA[alca];
    return (
      <rect
        key={alca}
        data-alca={alca}
        x={(hx * t.largura) / 2 - tamAlca / 2}
        y={(hy * t.altura) / 2 - tamAlca / 2}
        width={tamAlca}
        height={tamAlca}
        fill="#ffffff"
        stroke={COR_SELECAO}
        strokeWidth={traco}
        style={{ cursor: CURSOR_ALCA[alca] }}
        onPointerDown={(e) => iniciarAlca(e, id, alca)}
      />
    );
  }

  function renderAlcaDeRotacao(id: string, t: Transformacao) {
    const y = -t.altura / 2 - 30 / escala;
    return (
      <g key="rotacao">
        <line x1={0} y1={-t.altura / 2} x2={0} y2={y} stroke={COR_SELECAO} strokeWidth={traco} />
        <circle
          data-alca="rotacao"
          cx={0}
          cy={y}
          r={tamAlca / 1.6}
          fill="#ffffff"
          stroke={COR_SELECAO}
          strokeWidth={traco}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => iniciarRotacao(e, id)}
        />
      </g>
    );
  }

  function renderSelecao() {
    if (!editando || !selecionado) return null;
    const alvo = alvoDe(selecionado);
    if (!alvo) return null;
    const transformacao = transformacaoSvg(alvo, false);

    if (ehElemento(alvo) && alvo.tipo === "linha") {
      return (
        <g transform={transformacao} data-selecao>
          {renderAlcaDeRotacao(alvo.id, alvo)}
          {(["inicio", "fim"] as const).map((qual) => (
            <circle
              key={qual}
              data-alca={`extremidade-${qual}`}
              cx={qual === "inicio" ? -alvo.largura / 2 : alvo.largura / 2}
              cy={0}
              r={tamAlca / 1.6}
              fill="#ffffff"
              stroke={COR_SELECAO}
              strokeWidth={traco}
              style={{ cursor: "crosshair" }}
              onPointerDown={(e) => iniciarExtremidade(e, alvo, qual)}
            />
          ))}
        </g>
      );
    }

    const apenasCantos = !ehElemento(alvo) || alvo.tipo === "texto";
    const folga = ehElemento(alvo) && alvo.tipo === "texto" ? 4 : 0;
    return (
      <g transform={transformacao} data-selecao>
        <rect
          x={-alvo.largura / 2 - folga}
          y={-alvo.altura / 2 - folga}
          width={alvo.largura + folga * 2}
          height={alvo.altura + folga * 2}
          fill="none"
          stroke={COR_SELECAO}
          strokeWidth={traco}
          strokeDasharray={`${6 / escala} ${4 / escala}`}
          pointerEvents="none"
        />
        {renderAlcaDeRotacao(selecionado, alvo)}
        {ALCAS_CANTO.map((alca) => renderAlca(selecionado, alvo, alca))}
        {!apenasCantos && ALCAS_BORDA.map((alca) => renderAlca(selecionado, alvo, alca))}
      </g>
    );
  }

  function renderAreaClicavel(elemento: ElementoDesenho) {
    const ativo = editando ? undefined : "none";
    const comum = {
      onPointerDown: (e: ReactPointerEvent) => iniciarMover(e, elemento.id),
      style: { cursor: "move", pointerEvents: ativo } as const,
    };
    if (elemento.tipo === "linha") {
      return (
        <line
          x1={-elemento.largura / 2}
          y1={0}
          x2={elemento.largura / 2}
          y2={0}
          stroke="transparent"
          strokeWidth={Math.max(elemento.espessura, 18 / escala)}
          {...comum}
          style={{ ...comum.style, pointerEvents: ativo ?? "stroke" }}
        />
      );
    }
    if (elemento.tipo === "texto") {
      return (
        <rect
          x={-elemento.largura / 2 - 6}
          y={-elemento.altura / 2 - 4}
          width={elemento.largura + 12}
          height={elemento.altura + 8}
          fill="transparent"
          onDoubleClick={() => aoEditarTexto(elemento.id)}
          {...comum}
          style={{ ...comum.style, pointerEvents: ativo ?? "all" }}
        />
      );
    }
    const preenchido = elemento.preenchimento !== null;
    return (
      <rect
        x={-elemento.largura / 2}
        y={-elemento.altura / 2}
        width={elemento.largura}
        height={elemento.altura}
        fill={preenchido ? "transparent" : "none"}
        stroke="transparent"
        strokeWidth={Math.max(elemento.espessura, 16 / escala)}
        {...comum}
        style={{ ...comum.style, pointerEvents: ativo ?? (preenchido ? "all" : "stroke") }}
      />
    );
  }

  return (
    <svg
      ref={svgRef}
      data-testid="camada-edicao"
      viewBox={`0 0 ${LARGURA_DESENHO} ${ALTURA_DESENHO}`}
      preserveAspectRatio="xMinYMin meet"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        touchAction: "none",
        cursor: editando ? "default" : "crosshair",
        userSelect: "none",
      }}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
    >
      {/* Cobre toda a moldura, mesmo além do quadro 5:4 (a moldura pode ser mais alta). */}
      <rect data-fundo-edicao x={-LARGURA_DESENHO} y={-LARGURA_DESENHO} width={LARGURA_DESENHO * 3} height={LARGURA_DESENHO * 4} fill="transparent" onPointerDown={aoPressionarFundo} />

      <g transform={transformacaoSvg(imagem)} data-clique="imagem">
        <rect
          x={-imagem.largura / 2}
          y={-imagem.altura / 2}
          width={imagem.largura}
          height={imagem.altura}
          fill="transparent"
          style={{ cursor: "move", pointerEvents: editando ? "all" : "none" }}
          onPointerDown={(e) => iniciarMover(e, ID_IMAGEM)}
        />
      </g>

      {desenho.elementos.map((elemento) => (
        <g key={elemento.id} transform={transformacaoSvg(elemento)} data-clique={elemento.id}>
          {renderAreaClicavel(elemento)}
        </g>
      ))}

      {renderSelecao()}
    </svg>
  );
}
