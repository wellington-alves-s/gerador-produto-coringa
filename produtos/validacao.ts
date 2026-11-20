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

export function campoVisivel(campo: Campo, especificacoes: Record<string, string>): boolean {
  return !campo.visivelQuando || dependenciaAtiva(especificacoes[campo.visivelQuando.campoId], campo.visivelQuando.valores);
}

export function camposVisiveis(campos: Campo[], especificacoes: Record<string, string>): Campo[] {
  return campos.filter((campo) => campoVisivel(campo, especificacoes));
}

/** O campo com a lista de opções já filtrada por `opcoesPorValor` (os demais voltam iguais). */
export function campoEfetivo(campo: Campo, especificacoes: Record<string, string>): Campo {
  if (campo.tipo !== "opcao-unica" || !campo.opcoesPorValor) return campo;
  const { campoId, mapa } = campo.opcoesPorValor;
  return { ...campo, opcoes: mapa[especificacoes[campoId] ?? ""] ?? [] };
}

export function camposFaltando(campos: Campo[], especificacoes: Record<string, string>): Campo[] {
  return camposVisiveis(campos, especificacoes)
    .filter((campo) => campoObrigatorioAgora(campo, especificacoes))
    .filter((campo) => !campoEstaPreenchido(campo, especificacoes[campo.id]));
}

export function especificacoesValidas(campos: Campo[], especificacoes: Record<string, string>): boolean {
  return camposFaltando(campos, especificacoes).length === 0;
}
