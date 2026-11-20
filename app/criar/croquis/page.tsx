"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { useUsuario } from "@/lib/usuario-cliente";
import { ESTADO_INICIAL } from "@/lib/pedido";
import { PRODUTOS } from "@/produtos";

type Item = {
  id: number;
  cliente: string;
  numeroPedido: string;
  tipo: string;
  atualizadoEm: string;
  vendedor: { id: number; nome: string };
};

const POR_PAGINA = 20;
const MENSAGEM_ERRO_LISTA = "Não foi possível carregar os croquis. Tente novamente.";

export default function PaginaMeusCroquis() {
  const { estado, dispatch } = useWizard();
  const { usuario } = useUsuario();
  const router = useRouter();
  const admin = usuario?.admin === true;

  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [vendedor, setVendedor] = useState("");
  const [vendedores, setVendedores] = useState<{ id: number; nome: string }[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const destino = useRef<string | null>(null);

  // Atraso na busca para não chamar o servidor a cada tecla.
  useEffect(() => {
    const id = setTimeout(() => {
      setTermo(busca);
      setPagina(1);
    }, 300);
    return () => clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    const parametros = new URLSearchParams({ busca: termo, pagina: String(pagina) });
    if (admin && vendedor) parametros.set("vendedor", vendedor);
    fetch(`/api/croquis?${parametros}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falha"))))
      .then((dados) => {
        if (!ativo) return;
        setItens(dados.itens);
        setTotal(dados.total);
        setErro(null);
      })
      .catch(() => ativo && setErro(MENSAGEM_ERRO_LISTA));
    return () => {
      ativo = false;
    };
  }, [termo, pagina, vendedor, admin]);

  useEffect(() => {
    if (!admin) return;
    fetch("/api/admin/usuarios")
      .then((r) => (r.ok ? r.json() : []))
      .then(setVendedores)
      .catch(() => {});
  }, [admin]);

  // Só navega depois que o estado carregado foi aplicado (mesmo padrão do DraftRecoveryPrompt).
  useEffect(() => {
    if (!destino.current) return;
    router.push(destino.current);
    destino.current = null;
  }, [estado, router]);

  async function abrir(item: Item) {
    setErro(null);
    try {
      const r = await fetch(`/api/croquis/${item.id}`);
      if (!r.ok) throw new Error("falha");
      const dados = await r.json();
      // Croqui de outro vendedor (admin) abre como cópia: salvar não sobrescreve o original.
      const proprio = dados.usuarioId === usuario?.id;
      destino.current = "/criar/revisao";
      dispatch({
        type: "CARREGAR_ESTADO",
        estado: { ...ESTADO_INICIAL, ...dados.estado, croquiId: proprio ? dados.id : null, ultimaEtapa: "revisao" },
      });
    } catch {
      setErro("Não foi possível abrir o croqui. Tente novamente.");
    }
  }

  async function excluir(item: Item) {
    if (!window.confirm(`Excluir o croqui de "${item.cliente || "(sem cliente)"}"? Não dá para desfazer.`)) return;
    setErro(null);
    try {
      const r = await fetch(`/api/croquis/${item.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("falha");
      setItens((atuais) => atuais.filter((i) => i.id !== item.id));
      setTotal((t) => t - 1);
    } catch {
      setErro("Não foi possível excluir o croqui. Tente novamente.");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const botao = "rounded-md border px-3 py-1 text-sm disabled:opacity-40 dark:border-gray-700";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">{admin ? "Croquis salvos" : "Meus croquis"}</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Mantemos os croquis mais recentes de cada vendedor; os mais antigos são apagados automaticamente.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente"
          aria-label="Buscar por cliente"
          className="min-w-64 flex-1 rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        {admin && (
          <select
            aria-label="Filtrar por vendedor"
            value={vendedor}
            onChange={(e) => {
              setVendedor(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {erro && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}

      {itens.length === 0 && !erro ? (
        <p className="py-8 text-center text-gray-600 dark:text-gray-300">Nenhum croqui encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Pedido</th>
                <th className="py-2 pr-3">Tipo</th>
                {admin && <th className="py-2 pr-3">Vendedor</th>}
                <th className="py-2 pr-3">Atualizado</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b dark:border-gray-800">
                  <td className="py-2 pr-3">{item.cliente || "(sem cliente)"}</td>
                  <td className="py-2 pr-3">{item.numeroPedido || "—"}</td>
                  <td className="py-2 pr-3">{PRODUTOS[item.tipo as keyof typeof PRODUTOS]?.nome ?? item.tipo}</td>
                  {admin && <td className="py-2 pr-3">{item.vendedor.nome}</td>}
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(item.atualizadoEm).toLocaleString("pt-BR")}</td>
                  <td className="flex gap-2 py-2">
                    <button type="button" onClick={() => abrir(item)} className="rounded-md bg-red-700 px-3 py-1 text-white dark:bg-red-600">
                      Abrir
                    </button>
                    <button type="button" onClick={() => excluir(item)} className={botao}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className={botao}>
            ← Anterior
          </button>
          <span className="text-sm">
            Página {pagina} de {totalPaginas}
          </span>
          <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)} className={botao}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
