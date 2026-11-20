import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executarLimpeza } from "@/lib/servidor/limpeza";

function autorizado(requisicao: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false; // sem segredo configurado, ninguém limpa nada
  const esperado = Buffer.from(`Bearer ${segredo}`);
  const recebido = Buffer.from(requisicao.headers.get("authorization") ?? "");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

/** Chamada diariamente pelo Vercel Cron (que envia `Authorization: Bearer $CRON_SECRET`). */
export async function GET(requisicao: Request) {
  if (!autorizado(requisicao)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  return NextResponse.json(await executarLimpeza());
}
