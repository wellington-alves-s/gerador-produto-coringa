import { PRODUTOS } from "@/produtos";
import { consultar } from "./banco";
import { ErroValidacao } from "./erros";
import type { UsuarioSessao } from "./sessao";

// A Vercel limita o corpo da requisição a ~4,5 MB.
export const LIMITE_BYTES_CROQUI = 4_000_000;
const POR_PAGINA = 20;
const LIMITE_TEXTO = 200;

export type ItemCroqui = {
  id: number;
  cliente: string;
  numeroPedido: string;
  tipo: string;
  atualizadoEm: string;
  vendedor: { id: number; nome: string };
};

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.slice(0, LIMITE_TEXTO) : "";
}

function validarEstado(estado: unknown): { tipo: string; cliente: string; numeroPedido: string; json: string } {
  if (typeof estado !== "object" || estado === null) throw new ErroValidacao("Croqui inválido.");
  const { tipo, pedido } = estado as { tipo?: unknown; pedido?: Record<string, unknown> };
  if (typeof tipo !== "string" || !(tipo in PRODUTOS)) throw new ErroValidacao("Tipo de produto inválido.");
  const json = JSON.stringify(estado);
  if (Buffer.byteLength(json) > LIMITE_BYTES_CROQUI) {
    throw new ErroValidacao("Croqui grande demais para salvar na nuvem (muitas imagens).", 413);
  }
  return { tipo, cliente: texto(pedido?.cliente), numeroPedido: texto(pedido?.numeroPedido), json };
}

export async function salvarCroqui(
  u: UsuarioSessao,
  d: { id?: number | null; estado: unknown }
): Promise<{ id: number } | null> {
  if (d.id != null && !Number.isInteger(d.id)) throw new ErroValidacao("Identificador inválido.");
  const { tipo, cliente, numeroPedido, json } = validarEstado(d.estado);
  const dados = [cliente, normalizarBusca(cliente), numeroPedido, tipo, json];

  if (d.id != null) {
    // Só atualiza se o croqui for do próprio usuário (mesmo o admin grava cópia própria, nunca por cima).
    const linhas = await consultar<{ id: number }>(
      `UPDATE croquis SET cliente = $3, cliente_busca = $4, numero_pedido = $5, tipo = $6, estado = $7::jsonb, atualizado_em = now()
       WHERE id = $1 AND usuario_id = $2 RETURNING id`,
      [d.id, u.id, ...dados]
    );
    return linhas[0] ? { id: linhas[0].id } : null;
  }
  const linhas = await consultar<{ id: number }>(
    `INSERT INTO croquis (usuario_id, cliente, cliente_busca, numero_pedido, tipo, estado)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id`,
    [u.id, ...dados]
  );
  return { id: linhas[0].id };
}

export async function listarCroquis(
  u: UsuarioSessao,
  f: { busca?: string; pagina?: number; vendedorId?: number }
): Promise<{ itens: ItemCroqui[]; total: number }> {
  // Vendedor comum só vê os próprios; o filtro por vendedor existe só para o admin.
  const dono = u.admin ? (f.vendedorId ?? null) : u.id;
  const busca = normalizarBusca(f.busca ?? "").replace(/[\\%_]/g, "\\$&");
  const pagina = Math.max(1, Math.floor(f.pagina ?? 1));
  const filtro = `WHERE ($1::int IS NULL OR c.usuario_id = $1) AND ($2 = '' OR c.cliente_busca LIKE '%' || $2 || '%')`;

  const [{ total }] = await consultar<{ total: number }>(
    `SELECT count(*)::int AS total FROM croquis c ${filtro}`,
    [dono, busca]
  );
  const linhas = await consultar<{
    id: number;
    cliente: string;
    numero_pedido: string;
    tipo: string;
    atualizado_em: Date | string;
    usuario_id: number;
    vendedor_nome: string;
  }>(
    `SELECT c.id, c.cliente, c.numero_pedido, c.tipo, c.atualizado_em, c.usuario_id, v.nome AS vendedor_nome
     FROM croquis c JOIN usuarios v ON v.id = c.usuario_id ${filtro}
     ORDER BY c.atualizado_em DESC, c.id DESC LIMIT ${POR_PAGINA} OFFSET $3`,
    [dono, busca, (pagina - 1) * POR_PAGINA]
  );
  return {
    total,
    itens: linhas.map((l) => ({
      id: l.id,
      cliente: l.cliente,
      numeroPedido: l.numero_pedido,
      tipo: l.tipo,
      atualizadoEm: new Date(l.atualizado_em).toISOString(),
      vendedor: { id: l.usuario_id, nome: l.vendedor_nome },
    })),
  };
}

export async function obterCroqui(
  u: UsuarioSessao,
  id: number
): Promise<{ id: number; usuarioId: number; estado: unknown } | null> {
  const linhas = await consultar<{ id: number; usuario_id: number; estado: unknown }>(
    "SELECT id, usuario_id, estado FROM croquis WHERE id = $1 AND ($2::boolean OR usuario_id = $3)",
    [id, u.admin, u.id]
  );
  return linhas[0] ? { id: linhas[0].id, usuarioId: linhas[0].usuario_id, estado: linhas[0].estado } : null;
}

export async function excluirCroqui(u: UsuarioSessao, id: number): Promise<boolean> {
  const linhas = await consultar(
    "DELETE FROM croquis WHERE id = $1 AND ($2::boolean OR usuario_id = $3) RETURNING id",
    [id, u.admin, u.id]
  );
  return linhas.length > 0;
}

const escaparLike = (t: string) => t.replace(/[\\%_]/g, "\\$&");
const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cria uma cópia do croqui na lista de `u`, com o nome numerado como cópia de arquivo
 * ("Fulano (2)", "Fulano (3)"...), sem alterar o original. O admin pode duplicar o croqui de um
 * vendedor: a cópia fica com o admin.
 */
export async function duplicarCroqui(u: UsuarioSessao, id: number): Promise<{ id: number; cliente: string } | null> {
  const original = await obterCroqui(u, id);
  if (!original) return null;
  const estado = original.estado as { pedido?: Record<string, unknown> };
  const base = texto(estado.pedido?.cliente).replace(/ \(\d+\)$/, "");

  const existentes = await consultar<{ cliente: string }>(
    "SELECT cliente FROM croquis WHERE usuario_id = $1 AND (cliente = $2 OR cliente LIKE $3)",
    [u.id, base, `${escaparLike(base)} (%)`]
  );
  const copia = new RegExp(`^${escaparRegex(base)} \\((\\d+)\\)$`);
  const maior = existentes.reduce((m, l) => Math.max(m, l.cliente === base ? 1 : Number(copia.exec(l.cliente)?.[1] ?? 0)), 1);
  const sufixo = ` (${maior + 1})`;
  const cliente = base.slice(0, LIMITE_TEXTO - sufixo.length) + sufixo;

  const salvo = await salvarCroqui(u, {
    estado: { ...estado, croquiId: null, pedido: { ...estado.pedido, cliente } },
  });
  return salvo ? { id: salvo.id, cliente } : null;
}
