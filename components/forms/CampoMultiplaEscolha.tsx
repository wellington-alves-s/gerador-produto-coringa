"use client";

import type { CampoMultiplaEscolha as CampoMultiplaEscolhaConfig } from "@/produtos/tipos";

type Props = {
  campo: CampoMultiplaEscolhaConfig;
  valor: string;
  aoAlterar: (novoValor: string) => void;
  erro?: boolean;
};

function paraLista(valor: string): string[] {
  return valor ? valor.split("|") : [];
}

export function CampoMultiplaEscolha({ campo, valor, aoAlterar, erro }: Props) {
  const selecionadas = paraLista(valor);

  function alternar(opcao: string) {
    if (selecionadas.includes(opcao)) {
      aoAlterar(selecionadas.filter((item) => item !== opcao).join("|"));
      return;
    }
    const grupo = campo.gruposExcludentes?.find((g) => g.includes(opcao));
    const semConflitantes = grupo ? selecionadas.filter((item) => !grupo.includes(item)) : selecionadas;
    aoAlterar([...semConflitantes, opcao].join("|"));
  }

  return (
    <fieldset className={`block ${erro ? "animate-pulse rounded-md p-2 ring-2 ring-red-600" : ""}`}>
      <legend className="mb-1 text-sm font-medium">
        {campo.label} {campo.obrigatorio && <span className="text-red-700">*</span>}
      </legend>
      <div className="flex flex-wrap gap-4">
        {campo.opcoes.map((opcao) => (
          <label key={opcao} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selecionadas.includes(opcao)} onChange={() => alternar(opcao)} />
            {opcao}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
