"use client";

import { useEffect, useState } from "react";
import { useWizard } from "@/lib/wizard-context";
import { useUsuario } from "@/lib/usuario-cliente";
import { useAbrirCroqui } from "@/lib/abrir-croqui";

type Ultimo = { id: number; cliente: string };

/**
 * Na tela de escolha do tipo, quando não há croqui em andamento, oferece voltar ao último croqui
 * salvo do usuário. "Sim" retoma de onde parou; "Ignorar", ou simplesmente seguir em frente
 * (escolher um tipo), começa do zero.
 */
export function ContinuarCroqui() {
  const { estado } = useWizard();
  const { usuario } = useUsuario();
  const { abrir } = useAbrirCroqui();
  const [ultimo, setUltimo] = useState<Ultimo | null>(null);
  const [fechada, setFechada] = useState(false);
  const [erro, setErro] = useState(false);

  const semCroqui = estado.tipo === null;
  const idUsuario = usuario?.id;

  useEffect(() => {
    if (!semCroqui || idUsuario === undefined) return;
    let ativo = true;
    // Sempre os croquis do próprio usuário (o admin também vê os dos outros na lista geral).
    fetch(`/api/croquis?pagina=1&vendedor=${idUsuario}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => ativo && setUltimo(dados?.itens?.[0] ?? null))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [semCroqui, idUsuario]);

  if (!semCroqui || fechada || !ultimo) return null;

  async function continuar() {
    setErro(false);
    if (!(await abrir(ultimo!.id, { retomar: true }))) setErro(true);
  }

  return (
    <div
      role="region"
      aria-label="Continuar o último croqui"
      className="fixed bottom-4 left-1/2 z-30 w-[min(92vw,26rem)] -translate-x-1/2 rounded-lg bg-gray-800 p-3 text-gray-100 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">Continuar?</span>
        <div className="flex gap-2">
          <button type="button" onClick={continuar} className="rounded-md bg-red-700 px-3 py-1 text-sm text-white">
            Sim
          </button>
          <button type="button" onClick={() => setFechada(true)} className="rounded-md border border-white/30 px-3 py-1 text-sm">
            Ignorar
          </button>
        </div>
      </div>
      <p className="mt-1 truncate text-xs text-gray-400" title={ultimo.cliente}>
        {ultimo.cliente || "(sem cliente)"}
      </p>
      {erro && (
        <p role="alert" className="mt-1 text-xs text-red-300">
          Não foi possível abrir o croqui. Tente novamente.
        </p>
      )}
    </div>
  );
}
