export type Tema = "claro" | "escuro";

export const CHAVE_TEMA = "produto-coringa:tema";

export function obterTemaSalvo(): Tema | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_TEMA);
    return valor === "claro" || valor === "escuro" ? valor : null;
  } catch {
    return null;
  }
}

export function salvarTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // localStorage indisponível (modo privado, cota excedida) — ignora
  }
}

export function obterTemaPreferidoSistema(): Tema {
  if (typeof window === "undefined" || !window.matchMedia) return "claro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function resolverTemaInicial(): Tema {
  return obterTemaSalvo() ?? obterTemaPreferidoSistema();
}
