import type { Campo } from "./tipos";
import { bufferInicialMedida } from "@/lib/formatacao";

export function campoEstaPreenchido(campo: Campo, valor: string | undefined): boolean {
  if (!valor) return false;
  if (campo.tipo === "medida") return valor !== bufferInicialMedida(campo.casasDecimais, campo.casasInteiras);
  return valor.trim().length > 0;
}

export function dependenciaAtiva(valorCampoOrigem: string | undefined, valoresQueExigem: string[]): boolean {
  if (!valorCampoOrigem) return false;
  const selecionados = valorCampoOrigem.split("|");
  return valoresQueExigem.some((valor) => selecionados.includes(valor));
}

export function campoObrigatorioAgora(campo: Campo, especificacoes: Record<string, string>): boolean {
  if (campo.obrigatorio) return true;
  if (!campo.dependeDe) return false;
  return dependenciaAtiva(especificacoes[campo.dependeDe.campoId], campo.dependeDe.valores);
}

export function camposFaltando(campos: Campo[], especificacoes: Record<string, string>): Campo[] {
  return campos
    .filter((campo) => campoObrigatorioAgora(campo, especificacoes))
    .filter((campo) => !campoEstaPreenchido(campo, especificacoes[campo.id]));
}

export function especificacoesValidas(campos: Campo[], especificacoes: Record<string, string>): boolean {
  return camposFaltando(campos, especificacoes).length === 0;
}
