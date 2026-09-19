"use client";

import type { CampoMedida as CampoMedidaConfig } from "@/produtos/tipos";
import { atualizarBufferMedida, formatarBufferMedida, bufferInicialMedida } from "@/lib/formatacao";

type Props = { campo: CampoMedidaConfig; valor: string; aoAlterar: (novoValor: string) => void; erro?: boolean };

export function CampoMedida({ campo, valor, aoAlterar, erro }: Props) {
  const casasDecimais = campo.casasDecimais ?? 3;
  const casasInteiras = campo.casasInteiras ?? 1;
  const buffer = valor || bufferInicialMedida(casasDecimais, casasInteiras);
  return (
    <label className={`block ${erro ? "animate-pulse rounded-md p-2 ring-2 ring-red-600" : ""}`}>
      <span className="mb-1 block text-sm font-medium">
        {campo.label} ({campo.unidade}) {campo.obrigatorio && <span className="text-red-700">*</span>}
      </span>
      <input
        inputMode="numeric"
        className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={formatarBufferMedida(buffer, casasDecimais, casasInteiras)}
        onChange={(e) => aoAlterar(atualizarBufferMedida(buffer, e.target.value, casasDecimais, casasInteiras))}
      />
    </label>
  );
}
