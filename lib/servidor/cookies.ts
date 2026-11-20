export function lerCookie(req: Request, nome: string): string | undefined {
  for (const parte of (req.headers.get("cookie") ?? "").split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return undefined;
}
