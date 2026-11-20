import Link from "next/link";
import { Icone } from "./Icones";

/** Marca do cabeçalho: a logo e a casinha levam à escolha do tipo de croqui (início do assistente). */
export function MarcaInicio() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/criar/tipo" aria-label="Madel — ir para o início" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/logo-madel.png" alt="Madel" className="h-8 w-auto" />
      </Link>
      <Link
        href="/criar/tipo"
        aria-label="Início"
        className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Icone.Casa />
      </Link>
      <span className="font-semibold text-white">Produto Coringa</span>
    </div>
  );
}
