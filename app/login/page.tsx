"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PaginaLogin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      if (r.ok) {
        router.push("/criar/tipo");
        return;
      }
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo.erro ?? "Não foi possível entrar. Tente novamente.");
    } catch {
      setErro("Não foi possível entrar. Verifique a conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-center text-2xl font-semibold">Entrar</h1>
      <form onSubmit={enviar} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Usuário</span>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
            className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        {erro && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-60 dark:bg-red-600"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
