"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Medidas = { rolavel: boolean; noInicio: boolean; noFim: boolean };

const BOTAO_SETA =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5";

const PASSO_DE_ROLAGEM = 220;

/**
 * Linha horizontal que não quebra: quando o conteúdo é mais largo que o espaço, aparecem setas
 * para rolar (a barra de rolagem fica escondida). Sem estouro, as setas nem aparecem.
 */
export function LinhaRolavel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState<Medidas>({ rolavel: false, noInicio: true, noFim: true });

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const proximas: Medidas = {
      rolavel: el.scrollWidth > el.clientWidth + 1,
      noInicio: el.scrollLeft <= 1,
      noFim: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    };
    // Evita re-renderizar em loop: só atualiza quando algo mudou.
    setMedidas((atuais) =>
      atuais.rolavel === proximas.rolavel && atuais.noInicio === proximas.noInicio && atuais.noFim === proximas.noFim ? atuais : proximas
    );
  }, []);

  // O conteúdo muda (item selecionado, avisos): remede a cada renderização.
  useEffect(() => {
    medir();
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    observador?.observe(el);
    if (el.firstElementChild) observador?.observe(el.firstElementChild);
    window.addEventListener("resize", medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [medir]);

  function rolar(sentido: -1 | 1) {
    ref.current?.scrollBy({ left: sentido * PASSO_DE_ROLAGEM, behavior: "smooth" });
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      {medidas.rolavel && (
        <button type="button" aria-label={`Rolar ${rotulo} para a esquerda`} className={BOTAO_SETA} disabled={medidas.noInicio} onClick={() => rolar(-1)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      <div
        ref={ref}
        onScroll={medir}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex shrink-0 items-center gap-1">{children}</div>
      </div>
      {medidas.rolavel && (
        <button type="button" aria-label={`Rolar ${rotulo} para a direita`} className={BOTAO_SETA} disabled={medidas.noFim} onClick={() => rolar(1)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
