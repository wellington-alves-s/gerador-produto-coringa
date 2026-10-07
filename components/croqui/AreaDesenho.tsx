import type { ReactNode } from "react";
import { ALTURA_DESENHO, LARGURA_DESENHO, transformacaoPadraoDaImagem, type DesenhoEstado } from "@/lib/desenho";
import { ElementoSvg } from "./ElementosDesenho";

type Props = {
  imagemSrc: string | null;
  desenho: DesenhoEstado;
  /** Camada interativa (só na etapa de Revisão); fica por cima de tudo. */
  camadaEdicao?: ReactNode;
};

const cobrirTudo = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" } as const;

/**
 * Quadro do desenho: proporção fixa, imagem do produto embaixo e as anotações em SVG por cima.
 * Posições em % e viewBox fixo — por isso escala igual na tela, no preview e na exportação.
 */
export function AreaDesenho({ imagemSrc, desenho, camadaEdicao }: Props) {
  const t = desenho.imagem ?? transformacaoPadraoDaImagem();
  return (
    <div
      data-testid="area-desenho"
      style={{ position: "relative", width: "100%", aspectRatio: `${LARGURA_DESENHO} / ${ALTURA_DESENHO}` }}
    >
      {/* Só o conteúdo é cortado no quadro; a camada de edição fica de fora para as alças
          (de uma imagem girada, por exemplo) continuarem alcançáveis fora das bordas. */}
      <div style={{ ...cobrirTudo, overflow: "hidden" }}>
        {imagemSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagemSrc}
            alt="Desenho do produto"
            draggable={false}
            style={{
              position: "absolute",
              left: `${((t.cx - t.largura / 2) / LARGURA_DESENHO) * 100}%`,
              top: `${((t.cy - t.altura / 2) / ALTURA_DESENHO) * 100}%`,
              width: `${(t.largura / LARGURA_DESENHO) * 100}%`,
              height: `${(t.altura / ALTURA_DESENHO) * 100}%`,
              objectFit: "contain",
              transform: `rotate(${t.rotacao}deg) scale(${t.espelhoH ? -1 : 1}, ${t.espelhoV ? -1 : 1})`,
              transformOrigin: "center",
              userSelect: "none",
            }}
          />
        ) : (
          <div style={{ ...cobrirTudo, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="text-xs text-[#9ca3af]">Sem imagem</span>
          </div>
        )}

        <svg
          data-testid="camada-elementos"
          viewBox={`0 0 ${LARGURA_DESENHO} ${ALTURA_DESENHO}`}
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
