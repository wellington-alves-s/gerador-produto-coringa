import type { ElementoDesenho, ElementoLinha, ElementoRetangulo, ElementoTexto, Transformacao } from "@/lib/desenho";

/** Transformação SVG de um elemento: posiciona no centro, gira e espelha em torno dele. */
export function transformacaoSvg(t: Transformacao, comEspelho = true): string {
  const espelho = comEspelho ? ` scale(${t.espelhoH ? -1 : 1} ${t.espelhoV ? -1 : 1})` : "";
  return `translate(${t.cx} ${t.cy}) rotate(${t.rotacao})${espelho}`;
}

export function tamanhoDaPonta(espessura: number): number {
  return Math.max(16, espessura * 4);
}

function Linha({ elemento }: { elemento: ElementoLinha }) {
  const metade = elemento.largura / 2;
  const ponta = tamanhoDaPonta(elemento.espessura);
  const recuo = ponta * 0.8;
  let x1 = -metade + (elemento.setaInicio ? recuo : 0);
  let x2 = metade - (elemento.setaFim ? recuo : 0);
  if (x2 < x1) x1 = x2 = 0;
  const abertura = ponta * 0.45;
  return (
    <>
      <line x1={x1} y1={0} x2={x2} y2={0} stroke={elemento.cor} strokeWidth={elemento.espessura} />
      {elemento.setaFim && (
        <polygon points={`${metade},0 ${metade - ponta},${-abertura} ${metade - ponta},${abertura}`} fill={elemento.cor} />
      )}
      {elemento.setaInicio && (
        <polygon points={`${-metade},0 ${-metade + ponta},${-abertura} ${-metade + ponta},${abertura}`} fill={elemento.cor} />
      )}
    </>
  );
}

function Texto({ elemento }: { elemento: ElementoTexto }) {
  const linhas = elemento.texto.split("\n");
  const alturaLinha = elemento.tamanhoFonte * 1.25;
  return (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={elemento.tamanhoFonte}
      fontWeight={elemento.negrito ? "bold" : "normal"}
      fontFamily="sans-serif"
      fill={elemento.cor}
    >
      {linhas.map((linha, indice) => (
        <tspan key={indice} x={0} y={(indice - (linhas.length - 1) / 2) * alturaLinha}>
          {linha}
        </tspan>
      ))}
    </text>
  );
}

function Retangulo({ elemento }: { elemento: ElementoRetangulo }) {
  return (
    <rect
      x={-elemento.largura / 2}
      y={-elemento.altura / 2}
      width={elemento.largura}
      height={elemento.altura}
      fill={elemento.preenchimento ?? "none"}
      stroke={elemento.cor}
      strokeWidth={elemento.espessura}
    />
  );
}

export function ElementoSvg({ elemento }: { elemento: ElementoDesenho }) {
  return (
    <g transform={transformacaoSvg(elemento)} data-elemento={elemento.tipo}>
      {elemento.tipo === "linha" && <Linha elemento={elemento} />}
      {elemento.tipo === "texto" && <Texto elemento={elemento} />}
      {elemento.tipo === "retangulo" && <Retangulo elemento={elemento} />}
    </g>
  );
}
