"use client";

import type { CampoTexto as CampoTextoConfig } from "@/produtos/tipos";

type Props = { campo: CampoTextoConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoTexto({ campo, valor, aoAlterar }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </span>
      <input
        className="w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
      />
    </label>
  );
}
