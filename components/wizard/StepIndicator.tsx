import type { EtapaId } from "@/lib/pedido";

const ETAPAS: { id: EtapaId; label: string }[] = [
  { id: "tipo", label: "Tipo" },
  { id: "pedido", label: "Pedido" },
  { id: "especificacoes", label: "Especificações" },
  { id: "imagem", label: "Imagem" },
  { id: "revisao", label: "Revisão" },
];

export function StepIndicator({ etapaAtual }: { etapaAtual: EtapaId }) {
  const indiceAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);
  return (
    <ol className="mb-8 flex flex-wrap gap-3 text-sm">
      {ETAPAS.map((etapa, indice) => (
        <li
          key={etapa.id}
          className={
            indice === indiceAtual
              ? "font-semibold text-red-700 dark:text-red-400"
              : indice < indiceAtual
                ? "text-gray-500 dark:text-gray-400"
                : "text-gray-300 dark:text-gray-600"
          }
        >
          {indice + 1}. {etapa.label}
        </li>
      ))}
    </ol>
  );
}
