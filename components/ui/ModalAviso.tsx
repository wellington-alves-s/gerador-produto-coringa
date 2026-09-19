"use client";

type Props = {
  titulo: string;
  itens: string[];
  aoFechar: () => void;
};

export function ModalAviso({ titulo, itens, aoFechar }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-md bg-white p-5 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold text-red-700">{titulo}</h2>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={aoFechar}
          className="w-full rounded-md bg-red-700 px-4 py-2 text-white dark:bg-red-600"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
