"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Icone } from "./Icones";

type Posicao = { x: number; y: number };

type Props = {
  rotulo: string;
  /** Elemento usado como referência para a posição inicial (a barra nasce no canto superior direito dele). */
  ancora?: RefObject<HTMLElement | null>;
  expandido: boolean;
  principal: ReactNode;
  expansao: ReactNode;
};

const MARGEM = 8;
const MARGEM_ANCORA = 16;
const VISIVEL_MINIMO = 56;
const PASSO_TECLADO = 12;

function limitar(posicao: Posicao, largura: number): Posicao {
  const maxX = Math.max(MARGEM, window.innerWidth - Math.min(largura, window.innerWidth) - MARGEM);
  const maxY = Math.max(MARGEM, window.innerHeight - VISIVEL_MINIMO);
  return { x: Math.min(maxX, Math.max(MARGEM, posicao.x)), y: Math.min(maxY, Math.max(MARGEM, posicao.y)) };
}

/**
 * Painel flutuante e arrastável (pela alça à esquerda), com uma linha principal sempre visível
 * e uma área que expande/recolhe com animação. Fica em `position: fixed`, então acompanha a rolagem.
 */
export function BarraFlutuante({ rotulo, ancora, expandido, principal, expansao }: Props) {
  const barraRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const arrasto = useRef<{ x: number; y: number; origem: Posicao } | null>(null);

  // Posição inicial: canto superior direito da âncora (o croqui), um pouco acima do desenho.
  useEffect(() => {
    const largura = barraRef.current?.offsetWidth ?? 0;
    const caixa = ancora?.current?.getBoundingClientRect();
    const inicial = caixa && caixa.width > 0
      ? { x: caixa.right - largura - MARGEM_ANCORA, y: caixa.top + MARGEM }
      : { x: window.innerWidth - largura - MARGEM_ANCORA, y: MARGEM_ANCORA };
    // Medir o DOM (largura da barra e posição do croqui) só é possível depois da montagem.
    setPosicao(limitar(inicial, largura));
  }, [ancora]);

  // Mantém a barra dentro da janela se ela for redimensionada.
  useEffect(() => {
    function aoRedimensionar() {
      setPosicao((atual) => (atual ? limitar(atual, barraRef.current?.offsetWidth ?? 0) : atual));
    }
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  function iniciarArrasto(e: PointerEvent<HTMLButtonElement>) {
    if (!posicao) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, origem: posicao };
  }

  function arrastar(e: PointerEvent<HTMLButtonElement>) {
    const inicio = arrasto.current;
    if (!inicio) return;
    setPosicao(
      limitar({ x: inicio.origem.x + e.clientX - inicio.x, y: inicio.origem.y + e.clientY - inicio.y }, barraRef.current?.offsetWidth ?? 0)
    );
  }

  function soltar(e: PointerEvent<HTMLButtonElement>) {
    arrasto.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function moverPeloTeclado(e: KeyboardEvent<HTMLButtonElement>) {
    const passo = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!passo || !posicao) return;
    e.preventDefault();
    e.stopPropagation();
    setPosicao(
      limitar({ x: posicao.x + passo[0] * PASSO_TECLADO, y: posicao.y + passo[1] * PASSO_TECLADO }, barraRef.current?.offsetWidth ?? 0)
    );
  }

  return (
    <div
      ref={barraRef}
      role="toolbar"
      aria-label={rotulo}
      className="fixed z-40 w-max max-w-[min(96vw,74rem)] rounded-[1.75rem] border border-white/10 bg-slate-900/95 p-1.5 text-slate-100 shadow-2xl ring-1 ring-black/30 backdrop-blur"
      style={{ left: posicao?.x ?? 0, top: posicao?.y ?? 0, visibility: posicao ? "visible" : "hidden" }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-label="Mover barra de ferramentas"
          title="Arraste para mover a barra"
          className="cursor-grab touch-none rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100 active:cursor-grabbing"
          onPointerDown={iniciarArrasto}
          onPointerMove={arrastar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onKeyDown={moverPeloTeclado}
        >
          <Icone.Arrastar />
        </button>
        {principal}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expandido ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">{expandido && expansao}</div>
      </div>
    </div>
  );
}
