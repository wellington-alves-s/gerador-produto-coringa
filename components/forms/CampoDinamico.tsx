"use client";

import type { Campo } from "@/produtos/tipos";
import { CampoMedida } from "./CampoMedida";
import { CampoTexto } from "./CampoTexto";
import { CampoOpcaoUnica } from "./CampoOpcaoUnica";
import { CampoMultiplaEscolha } from "./CampoMultiplaEscolha";

type Props = { campo: Campo; valor: string; aoAlterar: (novoValor: string) => void; erro?: boolean };

export function CampoDinamico({ campo, valor, aoAlterar, erro }: Props) {
  switch (campo.tipo) {
    case "medida":
      return <CampoMedida campo={campo} valor={valor} aoAlterar={aoAlterar} erro={erro} />;
    case "texto":
      return <CampoTexto campo={campo} valor={valor} aoAlterar={aoAlterar} erro={erro} />;
    case "opcao-unica":
      return <CampoOpcaoUnica campo={campo} valor={valor} aoAlterar={aoAlterar} erro={erro} />;
    case "multipla-escolha":
      return <CampoMultiplaEscolha campo={campo} valor={valor} aoAlterar={aoAlterar} erro={erro} />;
  }
}
