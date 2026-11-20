import { NextResponse } from "next/server";
import { COOKIE_SESSAO, opcoesCookieSessao } from "@/lib/servidor/sessao";

export async function POST() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_SESSAO, "", { ...opcoesCookieSessao(), maxAge: 0 });
  return r;
}
