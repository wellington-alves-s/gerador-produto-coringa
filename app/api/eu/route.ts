import { NextResponse } from "next/server";
import { exigirUsuario } from "@/lib/servidor/protecao";

export async function GET(requisicao: Request) {
  const r = await exigirUsuario(requisicao);
  if (!r.ok) return r.resposta;
  const { usuario, nome, admin } = r.usuario;
  return NextResponse.json({ usuario, nome, admin });
}
