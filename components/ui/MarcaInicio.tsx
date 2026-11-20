import Link from "next/link";
import { Icone } from "./Icones";

// ?novo=1: a página de tipo descarta o croqui em andamento e começa um novo.
const INICIO = "/criar/tipo?novo=1";

/** Marca do cabeçalho: a logo e a casinha levam à escolha do tipo de croqui (início do assistente). */
export function MarcaInicio() {
  return (
    <div className="flex items-center gap-3">
      <Link href={INICIO} aria-label="Madel — ir para o início" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo-madel.png" alt="Madel" className="h-8 w-auto" />
      </Link>
      <Link
        href={INICIO}
        aria-label="Início"
        className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Icone.Casa />
      </Link>
      <span className="font-semibold text-white">Produto Coringa</span>
    </div>
  );
}
