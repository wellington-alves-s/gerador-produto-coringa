"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sair, useUsuario } from "@/lib/usuario-cliente";

export function MenuUsuario() {
  const { usuario } = useUsuario();
  const caminho = usePathname();
  const router = useRouter();
  if (caminho === "/login" || !usuario) return null;

  async function aoSair() {
    await sair();
    router.push("/login");
  }

  const estiloLink = "text-sm text-gray-200 underline-offset-2 hover:underline";
  return (
    <nav className="flex items-center gap-3" aria-label="Usuário">
      <Link href="/criar/croquis" className={estiloLink}>
        Meus croquis
      </Link>
      {usuario.admin && (
        <Link href="/admin" className={estiloLink}>
          Admin
        </Link>
      )}
      <span className="text-sm text-white">{usuario.nome}</span>
      <button type="button" onClick={aoSair} className="rounded border border-white/30 px-2 py-1 text-sm text-white">
        Sair
      </button>
    </nav>
  );
}
