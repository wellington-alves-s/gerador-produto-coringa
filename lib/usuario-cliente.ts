"use client";

import { useEffect, useState } from "react";
import { limparRascunho } from "./wizard-storage";

export type UsuarioAtual = { id: number; usuario: string; nome: string; admin: boolean };

export function useUsuario(): { usuario: UsuarioAtual | null; carregando: boolean } {
  const [estado, setEstado] = useState<{ usuario: UsuarioAtual | null; carregando: boolean }>({
    usuario: null,
    carregando: true,
  });

  useEffect(() => {
    let ativo = true;
    fetch("/api/eu")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((usuario) => ativo && setEstado({ usuario, carregando: false }));
    return () => {
      ativo = false;
    };
  }, []);

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
