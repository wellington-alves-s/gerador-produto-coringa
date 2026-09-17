"use client";

import type { CampoMultiplaEscolha as CampoMultiplaEscolhaConfig } from "@/produtos/tipos";

type Props = { campo: CampoMultiplaEscolhaConfig; valor: string; aoAlterar: (novoValor: string) => void };

function paraLista(valor: string): string[] {
  return valor ? valor.split("|") : [];
}

export function CampoMultiplaEscolha({ campo, valor, aoAlterar }: Props) {
  const selecionadas = paraLista(valor);

  function alternar(opcao: string) {
    const novaLista = selecionadas.includes(opcao)
      ? selecionadas.filter((item) => item !== opcao)
      : [...selecionadas, opcao];
    aoAlterar(novaLista.join("|"));
  }

  return (
    <fieldset className="block">
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
