"use client";

import type { CampoMedida as CampoMedidaConfig } from "@/produtos/tipos";
import { atualizarBufferMedida, formatarBufferMedida, BUFFER_MEDIDA_INICIAL } from "@/lib/formatacao";

type Props = { campo: CampoMedidaConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoMedida({ campo, valor, aoAlterar }: Props) {
  const buffer = valor || BUFFER_MEDIDA_INICIAL;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {campo.label} ({campo.unidade}) {campo.obrigatorio && <span className="text-red-700">*</span>}
      </span>
      <input
        inputMode="numeric"
        className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        value={formatarBufferMedida(buffer)}
        onChange={(e) => aoAlterar(atualizarBufferMedida(buffer, e.target.value))}
      />
    </label>
  );
}
