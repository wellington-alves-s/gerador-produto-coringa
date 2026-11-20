import { consultar } from "./banco";
import { ErroValidacao } from "./erros";

export type Retencao = { maxPorVendedor: number; maxDias: number | null };

const PADRAO: Retencao = { maxPorVendedor: 100, maxDias: null };

function inteiroEntre(valor: unknown, minimo: number, maximo: number): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

export async function lerRetencao(): Promise<Retencao> {
  const linhas = await consultar<{ valor: Retencao }>("SELECT valor FROM configuracoes WHERE chave = 'retencao'");
  return linhas[0]?.valor ?? PADRAO;
}

export async function salvarRetencao(r: Retencao): Promise<void> {
  if (!inteiroEntre(r.maxPorVendedor, 1, 10000)) {
    throw new ErroValidacao("Informe um número inteiro de croquis por vendedor entre 1 e 10000.");
  }
  if (r.maxDias !== null && !inteiroEntre(r.maxDias, 1, 3650)) {
    throw new ErroValidacao("Informe a idade máxima em dias (de 1 a 3650) ou deixe em branco.");
  }
  await consultar(
    `INSERT INTO configuracoes (chave, valor) VALUES ('retencao', $1::jsonb)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [JSON.stringify({ maxPorVendedor: r.maxPorVendedor, maxDias: r.maxDias })]
  );
}

export type UltimaLimpeza = { removidos: number; quando: string };

export async function lerUltimaLimpeza(): Promise<UltimaLimpeza | null> {
  const linhas = await consultar<{ valor: UltimaLimpeza }>("SELECT valor FROM configuracoes WHERE chave = 'ultima_limpeza'");
  return linhas[0]?.valor ?? null;
}

/** Apaga croquis (nunca contas) além do limite por vendedor e, se configurado, mais velhos que `maxDias`. */
export async function executarLimpeza(): Promise<UltimaLimpeza> {
  const { maxPorVendedor, maxDias } = await lerRetencao();

  const excedentes = await consultar(
    `DELETE FROM croquis WHERE id IN (
       SELECT id FROM (
         SELECT id, row_number() OVER (PARTITION BY usuario_id ORDER BY atualizado_em DESC, id DESC) AS posicao
         FROM croquis
       ) ordenados WHERE posicao > $1
     ) RETURNING id`,
    [maxPorVendedor]
  );
  const velhos =
    maxDias === null
      ? []
      : await consultar("DELETE FROM croquis WHERE atualizado_em < now() - make_interval(days => $1) RETURNING id", [maxDias]);

  const resultado = { removidos: excedentes.length + velhos.length, quando: new Date().toISOString() };
  await consultar(
    `INSERT INTO configuracoes (chave, valor) VALUES ('ultima_limpeza', $1::jsonb)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [JSON.stringify(resultado)]
  );
  return resultado;
}
