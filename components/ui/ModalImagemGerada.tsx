"use client";

export type EstadoGeracao =
  | { status: "gerando" }
  | { status: "pronto"; imagem: string }
  | { status: "erro"; mensagem: string };

type Props = {
  geracao: EstadoGeracao;
  aoUsar: (imagem: string) => void;
  aoGerarNovamente: () => void;
  aoFechar: () => void;
};

export function ModalImagemGerada({ geracao, aoUsar, aoGerarNovamente, aoFechar }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Imagem gerada" className="w-full max-w-lg rounded-md bg-white p-5 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold">Imagem gerada</h2>

        {geracao.status === "gerando" && <p role="status">Gerando imagem… isso pode levar alguns segundos.</p>}

        {geracao.status === "erro" && <p className="text-sm text-red-700">{geracao.mensagem}</p>}

        {geracao.status === "pronto" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={geracao.imagem} alt="Imagem gerada por IA" className="mb-3 max-h-96 w-full rounded-md border object-contain" />
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
              Imagem ilustrativa gerada por IA: não garante medidas nem detalhes exatos. As especificações do croqui continuam valendo.
            </p>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={aoFechar} className="rounded-md border px-4 py-2 dark:border-gray-700">
            {geracao.status === "pronto" ? "Descartar" : "Fechar"}
          </button>
          {geracao.status !== "gerando" && (
            <button type="button" onClick={aoGerarNovamente} className="rounded-md border border-red-700 px-4 py-2 text-red-700 dark:border-red-600 dark:text-red-400">
              {geracao.status === "erro" ? "Tentar de novo" : "Gerar de novo"}
            </button>
          )}
          {geracao.status === "pronto" && (
            <button type="button" onClick={() => aoUsar(geracao.imagem)} className="rounded-md bg-red-700 px-4 py-2 text-white dark:bg-red-600">
              Usar esta imagem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
