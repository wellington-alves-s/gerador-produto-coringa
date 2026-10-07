"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Largura (px) em que o croqui é montado no celular — a mesma disposição do computador, só reduzida. */
export const LARGURA_BASE_CELULAR = 1000;
/** Abaixo disso a tela é tratada como celular (mesmo corte do `md` do Tailwind). */
const LARGURA_MAXIMA_CELULAR = 768;

/**
 * No celular o croqui é montado com a largura do computador e reduzido (`transform: scale`) para
 * caber na tela, em vez de reflowar numa coluna estreita e comprida; quem precisar ler os detalhes
 * dá zoom com os dedos. No computador não faz nada. Só afeta a tela: a exportação captura um clone
 * do elemento interno, que não passa por este ajuste.
 */
export function AjusteCelular({ children }: { children: ReactNode }) {
  const externoRef = useRef<HTMLDivElement>(null);
  const internoRef = useRef<HTMLDivElement>(null);
  const [ajuste, setAjuste] = useState<{ escala: number; altura: number } | null>(null);

  useEffect(() => {
    const externo = externoRef.current;
    const interno = internoRef.current;
    if (!externo || !interno) return;

    function medir() {
      if (!externo || !interno) return;
      if (window.innerWidth >= LARGURA_MAXIMA_CELULAR) {
        setAjuste(null);
        return;
      }
      const escala = Math.min(1, externo.clientWidth / LARGURA_BASE_CELULAR);
      setAjuste((anterior) =>
        anterior && anterior.escala === escala && anterior.altura === interno.offsetHeight
          ? anterior
          : { escala, altura: interno.offsetHeight }
      );
    }

    medir();
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    observador?.observe(externo);
    observador?.observe(interno);
    window.addEventListener("resize", medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  if (!ajuste) {
    return (
      <div ref={externoRef}>
        <div ref={internoRef}>{children}</div>
      </div>
    );
  }

  return (
    <div ref={externoRef} data-testid="ajuste-celular" style={{ height: ajuste.altura * ajuste.escala, overflow: "hidden" }}>
      <div
        ref={internoRef}
        style={{ width: LARGURA_BASE_CELULAR, transform: `scale(${ajuste.escala})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
