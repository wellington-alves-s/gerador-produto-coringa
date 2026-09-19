"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch({ type: "IR_PARA_ETAPA", etapa: "imagem" });
  }, [dispatch]);

  useEffect(() => {
    if (!estado.tipo) {
      router.replace("/criar/tipo");
    }
  }, [estado.tipo, router]);

  const itensFiltrados = useMemo(() => buscarImagens(BIBLIOTECA, termoBusca), [termoBusca]);
  const config = estado.tipo ? PRODUTOS[estado.tipo] : null;
  const rotaVoltar = config && config.campos.length > 0 ? "/criar/especificacoes" : "/criar/pedido";

  if (!estado.tipo) return null;

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

  function rolarGaleria(direcao: -1 | 1) {
    galeriaRef.current?.scrollBy({ left: direcao * 300, behavior: "smooth" });
  }

  function abrirEmTamanhoMaior(item: (typeof itensFiltrados)[number]) {
    window.open(caminhoImagem(item), "_blank", "noopener,noreferrer");
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
            className="mt-2 rounded-md border border-red-700 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Remover imagem
          </button>
        </div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Upload de imagem avulsa</label>
        <input
          ref={inputArquivoRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputArquivoRef.current?.click()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Escolher imagem…
        </button>
        {erroUpload && <p className="mt-1 text-sm text-red-700">{erroUpload}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ou escolha da biblioteca</label>
        <input
          type="search"
          placeholder="Buscar por nome ou categoria..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="mb-3 w-full rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => rolarGaleria(-1)}
            aria-label="Rolar galeria para a esquerda"
            className="absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-full border bg-white p-1 shadow dark:border-gray-700 dark:bg-gray-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div
            ref={galeriaRef}
            className="flex h-[min(60vh,32rem)] min-h-72 gap-3 overflow-x-auto scroll-smooth px-9 py-1"
          >
            {itensFiltrados.map((item) => (
              <div
                key={item.id}
                className={`relative flex h-full w-64 flex-shrink-0 flex-col rounded-md border p-2 ${
                  estado.imagem.bibliotecaId === item.id ? "border-red-700" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: "DEFINIR_IMAGEM_BIBLIOTECA", bibliotecaId: item.id })}
                  className="flex min-h-0 flex-1 flex-col text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={caminhoImagem(item)} alt={item.nome} className="min-h-0 flex-1 w-full object-contain" />
                  <span className="mt-1 block truncate text-xs">{item.nome}</span>
                </button>
                <button
                  type="button"
                  onClick={() => abrirEmTamanhoMaior(item)}
                  aria-label={`Ver ${item.nome} em tamanho maior`}
                  title="Visualizar completo"
                  className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow dark:bg-gray-900/90"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1 1 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 010 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => rolarGaleria(1)}
            aria-label="Rolar galeria para a direita"
            className="absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-full border bg-white p-1 shadow dark:border-gray-700 dark:bg-gray-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => router.push(rotaVoltar)}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => router.push("/criar/revisao")}
          className="rounded-md bg-red-700 px-5 py-2 text-white dark:bg-red-600"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}
