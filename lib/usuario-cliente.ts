"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { limparRascunho } from "./wizard-storage";

export type UsuarioAtual = { id: number; usuario: string; nome: string; admin: boolean };

export function useUsuario(): { usuario: UsuarioAtual | null; carregando: boolean } {
  const [estado, setEstado] = useState<{ usuario: UsuarioAtual | null; carregando: boolean }>({
    usuario: null,
    carregando: true,
  });

  // Refaz a consulta a cada troca de página: entrar, sair ou trocar de conta é navegação no cliente
  // (sem recarregar), e o menu não pode ficar mostrando o usuário anterior.
  const caminho = usePathname();
  useEffect(() => {
    let ativo = true;
    fetch("/api/eu")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((usuario) => ativo && setEstado({ usuario, carregando: false }));
    return () => {
      ativo = false;
    };
  }, [caminho]);

  return estado;
}

/** Encerra a sessão e apaga o rascunho local, para o próximo vendedor deste navegador não herdá-lo. */
export async function sair(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    limparRascunho();
  }
}
