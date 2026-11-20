"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUsuario } from "@/lib/usuario-cliente";

type Conta = { id: number; usuario: string; nome: string; admin: boolean; ativo: boolean };

const campo = "w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900";
const botao = "rounded-md border px-3 py-1 text-sm dark:border-gray-700";

async function mensagemDeErro(r: Response, padrao: string): Promise<string> {
  const corpo = await r.json().catch(() => ({}));
  return corpo.erro ?? padrao;
}

export default function PaginaAdmin() {
  const { usuario, carregando } = useUsuario();
  const router = useRouter();
  const admin = usuario?.admin === true;

  const [contas, setContas] = useState<Conta[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({ usuario: "", nome: "", senha: "" });

  useEffect(() => {
    if (!carregando && !admin) router.replace("/criar/tipo");
  }, [carregando, admin, router]);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/usuarios");
      if (!r.ok) throw new Error("falha");
      setContas(await r.json());
    } catch {
      setErro("Não foi possível carregar as contas.");
    }
  }, []);

  useEffect(() => {
    // Busca inicial das contas; o setState acontece depois da resposta do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (admin) void recarregar();
  }, [admin, recarregar]);

  async function alterar(id: number, corpo: object, mensagemPadrao: string) {
    setErro(null);
    const r = await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) setErro(await mensagemDeErro(r, mensagemPadrao));
    await recarregar();
  }

  function trocarSenha(conta: Conta) {
    const senha = window.prompt(`Nova senha para ${conta.usuario} (mínimo 8 caracteres):`);
    if (senha) void alterar(conta.id, { senha }, "Não foi possível trocar a senha.");
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const r = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });
    if (!r.ok) {
      setErro(await mensagemDeErro(r, "Não foi possível criar a conta."));
      return;
    }
    setNovo({ usuario: "", nome: "", senha: "" });
    await recarregar();
  }

  if (!admin) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Administração</h1>

      {erro && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Contas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 pr-3">Usuário</th>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Situação</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id} className="border-b dark:border-gray-800">
                  <td className="py-2 pr-3">{c.usuario}</td>
                  <td className="py-2 pr-3">
                    {c.nome}
                    {c.admin ? " (admin)" : ""}
                  </td>
                  <td className="py-2 pr-3">{c.ativo ? "Ativa" : "Desativada"}</td>
                  <td className="flex gap-2 py-2">
                    <button
                      type="button"
                      aria-label={`Trocar senha de ${c.usuario}`}
                      onClick={() => trocarSenha(c)}
                      className={botao}
                    >
                      Trocar senha
                    </button>
                    <button
                      type="button"
                      aria-label={`${c.ativo ? "Desativar" : "Ativar"} ${c.usuario}`}
                      onClick={() => alterar(c.id, { ativo: !c.ativo }, "Não foi possível alterar a conta.")}
                      className={botao}
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10 max-w-md">
        <h2 className="mb-3 text-lg font-semibold">Nova conta</h2>
        <form onSubmit={criar} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Usuário</span>
            <input
              value={novo.usuario}
              onChange={(e) => setNovo({ ...novo, usuario: e.target.value })}
              autoCapitalize="none"
              required
              className={campo}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nome</span>
            <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} required className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Senha inicial</span>
            <input
              value={novo.senha}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              autoComplete="new-password"
              required
              className={campo}
            />
          </label>
          <button type="submit" className="rounded-md bg-red-700 px-5 py-2 text-white dark:bg-red-600">
            Criar conta
          </button>
        </form>
      </section>
    </div>
  );
}
