"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "./wizard-context";
import { useUsuario } from "./usuario-cliente";
import { DESENHO_INICIAL } from "./desenho";
import { ESTADO_INICIAL, type EtapaId } from "./pedido";

const ETAPAS_DO_ASSISTENTE: EtapaId[] = ["pedido", "especificacoes", "imagem", "revisao"];

/**
 * Carrega um croqui salvo no assistente e navega até ele. Por padrão abre na Revisão; com
 * `retomar` volta à etapa em que o croqui foi salvo. Croqui de outro vendedor (admin) abre como
 * cópia (`croquiId: null`): salvar não sobrescreve o original.
 */
export function useAbrirCroqui() {
  const { estado, dispatch } = useWizard();
  const { usuario } = useUsuario();
  const router = useRouter();
  const destino = useRef<string | null>(null);

  // Só navega depois que o estado carregado foi aplicado (a página de destino confere `estado.tipo`).
  useEffect(() => {
    if (!destino.current) return;
    router.push(destino.current);
    destino.current = null;
  }, [estado, router]);

  /** Devolve `false` quando não deu para abrir (o chamador mostra o aviso). */
  async function abrir(id: number, opcoes: { retomar?: boolean } = {}): Promise<boolean> {
    // Sem saber quem é o usuário não dá para decidir entre "meu croqui" e "cópia".
    if (!usuario) return false;
    try {
      const r = await fetch(`/api/croquis/${id}`);
      if (!r.ok) return false;
      const dados = await r.json();
      const salva = dados.estado?.ultimaEtapa;
      const etapa: EtapaId = opcoes.retomar && ETAPAS_DO_ASSISTENTE.includes(salva) ? salva : "revisao";
      destino.current = `/criar/${etapa}`;
      dispatch({
        type: "CARREGAR_ESTADO",
        estado: {
          ...ESTADO_INICIAL,
          ...dados.estado,
          desenho: { ...DESENHO_INICIAL, ...(dados.estado?.desenho ?? {}) },
          croquiId: dados.usuarioId === usuario.id ? dados.id : null,
          ultimaEtapa: etapa,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  return { abrir };
}
