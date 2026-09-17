"use client";

import type { CampoOpcaoUnica as CampoOpcaoUnicaConfig } from "@/produtos/tipos";

type Props = { campo: CampoOpcaoUnicaConfig; valor: string; aoAlterar: (novoValor: string) => void };

export function CampoOpcaoUnica({ campo, valor, aoAlterar }: Props) {
  return (
    <fieldset className="block">
      <legend className="mb-1 text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </legend>
      <div className="flex flex-wrap gap-4">
        {campo.opcoes.map((opcao) => (
          <label key={opcao} className="flex items-center gap-2 text-sm">
            <input type="radio" name={campo.id} checked={valor === opcao} onChange={() => aoAlterar(opcao)} />
            {opcao}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
