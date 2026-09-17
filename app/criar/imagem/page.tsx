"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { PRODUTOS } from "@/produtos";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";
import { buscarImagens, caminhoImagem } from "@/lib/biblioteca";
import { comprimirImagem } from "@/lib/imagem";

export default function EtapaImagem() {
  const { estado, dispatch } = useWizard();
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState("");
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "imagem" });
  }, [dispatch]);

  const itensFiltrados = useMemo(() => buscarImagens(BIBLIOTECA, termoBusca), [termoBusca]);
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const rotaVoltar = config && config.campos.length > 0 ? "/criar/especificacoes" : "/criar/pedido";

  async function aoEscolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroUpload(null);
    try {
      const dataUrl = await comprimirImagem(arquivo);
      dispatch({ type: "DEFINIR_IMAGEM_UPLOAD", dataUrl });
    } catch {
      setErroUpload("Não foi possível processar essa imagem. Tente outro arquivo.");
    }
  }

  const itemBibliotecaSelecionado = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const previewSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBibliotecaSelecionado
        ? caminhoImagem(itemBibliotecaSelecionado)
        : null;

  return (
    <div>
      <StepIndicator etapaAtual="imagem" />
      <h1 className="mb-6 text-2xl font-semibold">Imagem do produto</h1>

      {previewSrc && (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Imagem selecionada" className="max-h-48 rounded-md border" />
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVER_IMAGEM" })}
            className="mt-2 block text-sm text-red-700 underline"
          >
            Remover imagem
          </button>
        </div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Upload de imagem avulsa</label>
        <input type="file" accept="image/*" onChange={(e) => aoEscolherArquivo(e.target.files?.[0])} />
        {erroUpload && <p className="mt-1 text-sm text-red-700">{erroUpload}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ou escolha da biblioteca</label>
        <input
          type="search"
          placeholder="Buscar por nome ou categoria..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="mb-3 w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {itensFiltrados.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch({ type: "DEFINIR_IMAGEM_BIBLIOTECA", bibliotecaId: item.id })}
              className={`rounded-md border p-1 ${
                estado.imagem.bibliotecaId === item.id ? "border-red-700" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={caminhoImagem(item)} alt={item.nome} className="h-24 w-full object-contain" />
              <span className="mt-1 block truncate text-xs">{item.nome}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => router.push(rotaVoltar)} className="rounded-md border px-5 py-2">
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/revisao")}
          className="rounded-md bg-red-700 px-5 py-2 text-white"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
