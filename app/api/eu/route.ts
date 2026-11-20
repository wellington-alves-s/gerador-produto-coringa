import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/protecao";

export async function GET(requisicao: Request) {
  const r = await exigirUsuario(requisicao);
  if (!r.ok) return r.resposta;
  return NextResponse.json(r.usuario);
}
