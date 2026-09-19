"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/wizard-context";
import { DocumentoCroqui } from "@/components/croqui/DocumentoCroqui";
import { exportarComoPdf } from "@/lib/exportar-pdf";
import { exportarComoImagem } from "@/lib/exportar-imagem";

export default function EtapaResultado() {
  const { estado } = useWizard();
  const router = useRouter();
  const referenciaDocumento = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  async function baixarPdf() {
    if (!referenciaDocumento.current) return;
    setErro(null);
    setExportando(true);
    try {
      await exportarComoPdf(referenciaDocumento.current, `encomenda-especial-${estado.tipo}.pdf`);
    } catch (erroCapturado) {
      console.error("Falha ao gerar PDF:", erroCapturado);
      const detalhe = erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado);
      setErro(`Não foi possível gerar o PDF. Tente novamente. (${detalhe})`);
    } finally {
      setExportando(false);
    }
  }

  async function baixarImagem() {
    if (!referenciaDocumento.current) return;
    setErro(null);
    setExportando(true);
    try {
      await exportarComoImagem(referenciaDocumento.current, `encomenda-especial-${estado.tipo}.png`);
    } catch (erroCapturado) {
      console.error("Falha ao gerar imagem:", erroCapturado);
      const detalhe = erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado);
      setErro(`Não foi possível gerar a imagem. Tente novamente. (${detalhe})`);
    } finally {
      setExportando(false);
    }
  }

  if (!estado.tipo) {
    return (
      <div>
        <p className="mb-4">Nenhuma encomenda em andamento.</p>
        <button
          type="button"
          onClick={() => router.push("/criar/tipo")}
          className="rounded-md border px-5 py-2 dark:border-gray-700"
        >
          Começar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Encomenda gerada</h1>

      <div className="relative mr-[calc(50%-50vw)] ml-[calc(50%-50vw)] mb-6 w-screen overflow-x-auto px-4">
        <div ref={referenciaDocumento} className="mx-auto max-w-[1600px]">
          <DocumentoCroqui estado={estado} />
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push("/criar/revisao")}
          className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          ← Voltar para Revisão
        </button>
        <button
          type="button"
          disabled={exportando}
          onClick={baixarPdf}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40 dark:bg-red-600"
        >
          Baixar PDF
        </button>
        <button
          type="button"
          disabled={exportando}
          onClick={baixarImagem}
          className="rounded-md bg-red-700 px-5 py-2 text-white disabled:opacity-40 dark:bg-red-600"
        >
          Baixar Imagem
        </button>
      </div>
    </div>
  );
}
