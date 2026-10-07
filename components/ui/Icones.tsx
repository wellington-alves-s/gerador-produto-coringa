import type { ReactNode } from "react";

/** Ícones de traço simples (grade 24×24), herdam a cor do texto. Decorativos: o nome acessível fica no botão. */
function Svg({ children, tamanho = 16 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const Icone = {
  Selecionar: () => (
    <Svg>
      <path d="M5 3l14 7-6 2-2 6z" />
    </Svg>
  ),
  Linha: () => (
    <Svg>
      <path d="M5 19L19 5" />
    </Svg>
  ),
  Seta: () => (
    <Svg>
      <path d="M5 19L19 5M9 5h10v10" />
    </Svg>
  ),
  SetaDupla: () => (
    <Svg>
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
    </Svg>
  ),
  Texto: () => (
    <Svg>
      <path d="M5 6V4h14v2M12 4v16M9 20h6" />
    </Svg>
  ),
  Retangulo: () => (
    <Svg>
      <rect x="4" y="5" width="16" height="14" rx="2" />
    </Svg>
  ),
  RetanguloCheio: () => (
    <Svg>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="currentColor" />
    </Svg>
  ),
  Colar: () => (
    <Svg>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h2M9 13h6M9 17h4" />
    </Svg>
  ),
  ApagarArea: () => (
    <Svg>
      <rect x="4" y="5" width="16" height="14" rx="1" strokeDasharray="3 3" />
      <path d="M9 10l6 4M15 10l-6 4" />
    </Svg>
  ),
  Borracha: () => (
    <Svg>
      <path d="M7 21l-4.3-4.3a2 2 0 010-2.8l9.6-9.6a2 2 0 012.8 0l5.6 5.6a2 2 0 010 2.8L13 21M22 21H7M5 11l9 9" />
    </Svg>
  ),
  Desfazer: () => (
    <Svg>
      <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
    </Svg>
  ),
  Refazer: () => (
    <Svg>
      <path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
    </Svg>
  ),
  Lixeira: () => (
    <Svg>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  ),
  Girar: () => (
    <Svg>
      <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
    </Svg>
  ),
  EspelharHorizontal: () => (
    <Svg>
      <path d="M12 3v18M8 7l-5 5 5 5V7zM16 7l5 5-5 5V7z" />
    </Svg>
  ),
  EspelharVertical: () => (
    <Svg>
      <path d="M3 12h18M7 8l5-5 5 5H7zM7 16l5 5 5-5H7z" />
    </Svg>
  ),
  Frente: () => (
    <Svg>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  ),
  Tras: () => (
    <Svg>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  ),
  Topo: () => (
    <Svg>
      <path d="M5 4h14M12 20V8M6 14l6-6 6 6" />
    </Svg>
  ),
  Fundo: () => (
    <Svg>
      <path d="M5 20h14M12 4v12M6 10l6 6 6-6" />
    </Svg>
  ),
  Duplicar: () => (
    <Svg>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </Svg>
  ),
  Mais: () => (
    <Svg>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </Svg>
  ),
  Seta_para_baixo: () => (
    <Svg tamanho={14}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  Arrastar: () => (
    <Svg>
      {[6, 12, 18].flatMap((y) =>
        [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" />)
      )}
    </Svg>
  ),
};
