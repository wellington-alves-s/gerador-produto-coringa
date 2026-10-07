"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { aplicarApagamentos, type Carimbo } from "@/lib/apagamento";
import { ALTURA_DESENHO, LARGURA_DESENHO, type DesenhoEstado } from "@/lib/desenho";
import { ElementoSvg } from "./ElementosDesenho";
import { ReguaHorizontal, ReguaVertical } from "./Reguas";

type Props = {
  imagemSrc: string | null;
  desenho: DesenhoEstado;
  /** Textos das réguas de medida (ex.: "1,200 m Largura"); nulos quando a medida não foi preenchida. */
  textoLargura?: string | null;
  textoAltura?: string | null;
  /** Camada interativa (só na etapa de Revisão); fica por cima de tudo. */
  camadaEdicao?: ReactNode;
};

function liberar(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * Imagem com as áreas apagadas (seleção de área e borracha). O original nunca é alterado: o PNG com
 * transparência é gerado em memória e só os carimbos ficam salvos. Enquanto processa, mostra a última
 * versão pronta (ou o original) e marca `processando` — a exportação espera essa marca sumir.
 */
function useImagemApagada(src: string | null, carimbos: Carimbo[] | undefined) {
  const [pronta, setPronta] = useState<{ src: string; carimbos: Carimbo[]; url: string } | null>(null);
  const ultimaUrl = useRef<string | null>(null);
  const temApagamentos = Boolean(src && carimbos && carimbos.length > 0);

  useEffect(() => {
    if (!src || !carimbos || carimbos.length === 0) return;
    let cancelado = false;
    aplicarApagamentos(src, carimbos)
      .then((url) => {
        if (cancelado) return liberar(url);
        if (ultimaUrl.current) liberar(ultimaUrl.current);
        ultimaUrl.current = url;
        setPronta({ src, carimbos, url });
      })
      .catch(() => {
        // sem canvas/imagem indisponível: segue mostrando o original
      });
    return () => {
      cancelado = true;
    };
  }, [src, carimbos]);

  useEffect(
    () => () => {
      if (ultimaUrl.current) liberar(ultimaUrl.current);
    },
    []
  );

  if (!temApagamentos) return { src, processando: false };
  const atualizada = pronta !== null && pronta.src === src && pronta.carimbos === carimbos;
  return { src: pronta && pronta.src === src ? pronta.url : src, processando: !atualizada };
}

const cobrirTudo = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" } as const;

/**
 * Quadro do desenho: É a moldura (proporção fixa, sem margem interna), então dá para colocar itens em
 * qualquer ponto dela, inclusive sob as réguas. Posições em unidades de 1/1000 da LARGURA — x e y em %
 * da largura (margin-top em % também é relativo à largura) — então escala igual na tela e na exportação.
 */
export function AreaDesenho({ imagemSrc, desenho, textoLargura, textoAltura, camadaEdicao }: Props) {
  const t = desenho.imagem;
  const { src: srcExibida, processando } = useImagemApagada(imagemSrc, desenho.apagamentos);
  return (
    <div
      data-testid="area-desenho"
      style={{ position: "relative", width: "100%", aspectRatio: `${LARGURA_DESENHO} / ${ALTURA_DESENHO}` }}
    >
      {/* Só o conteúdo é cortado na moldura; a camada de edição fica de fora para as alças
          (de uma imagem girada, por exemplo) continuarem alcançáveis fora das bordas. */}
      <div style={{ ...cobrirTudo, overflow: "hidden" }}>
        {srcExibida ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={srcExibida}
            alt="Desenho do produto"
            data-processando={processando ? "true" : undefined}
            draggable={false}
            style={{
              position: "absolute",
              ...(t
                ? {
                    left: `${((t.cx - t.largura / 2) / LARGURA_DESENHO) * 100}%`,
                    top: 0,
                    marginTop: `${((t.cy - t.altura / 2) / LARGURA_DESENHO) * 100}%`,
                    width: `${(t.largura / LARGURA_DESENHO) * 100}%`,
                    aspectRatio: `${t.largura} / ${t.altura}`,
                    transform: `rotate(${t.rotacao}deg) scale(${t.espelhoH ? -1 : 1}, ${t.espelhoV ? -1 : 1})`,
                  }
                : { left: "5%", top: "5%", width: "90%", height: "90%" }),
              objectFit: "contain",
              transformOrigin: "center",
              userSelect: "none",
            }}
          />
        ) : (
          <div style={{ ...cobrirTudo, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="text-xs text-[#9ca3af]">Sem imagem</span>
          </div>
        )}

        {/* Réguas por cima da imagem e por baixo das anotações. Posicionadas com left/top e flex
            (o html2canvas não respeita right/bottom/calc() em elementos absolutos). */}
        {textoLargura && (
          <div style={{ ...cobrirTudo, height: "auto", display: "flex", justifyContent: "center", paddingTop: 8, pointerEvents: "none" }}>
            <ReguaHorizontal texto={textoLargura} />
          </div>
        )}
        {textoAltura && (
          <div
            style={{ ...cobrirTudo, display: "flex", justifyContent: "flex-end", alignItems: "center", paddingRight: 8, pointerEvents: "none" }}
          >
            <ReguaVertical texto={textoAltura} />
          </div>
        )}

        <svg
          data-testid="camada-elementos"
          viewBox={`0 0 ${LARGURA_DESENHO} ${ALTURA_DESENHO}`}
          preserveAspectRatio="xMinYMin meet"
          style={{ ...cobrirTudo, pointerEvents: "none" }}
        >
          {desenho.elementos.map((elemento) => (
            <ElementoSvg key={elemento.id} elemento={elemento} />
          ))}
        </svg>
      </div>

      {camadaEdicao}
    </div>
  );
}
