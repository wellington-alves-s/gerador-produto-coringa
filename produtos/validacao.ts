import type { Campo } from "./tipos";
import { BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

export function campoEstaPreenchido(campo: Campo, valor: string | undefined): boolean {
  if (!valor) return false;
  if (campo.tipo === "medida") return valor !== BUFFER_MEDIDA_INICIAL;
  return valor.trim().length > 0;
}

export function especificacoesValidas(campos: Campo[], especificacoes: Record<string, string>): boolean {
  return campos
    .filter((campo) => campo.obrigatorio)
    .every((campo) => campoEstaPreenchido(campo, especificacoes[campo.id]));
}
