export function ReguaHorizontal({ texto }: { texto: string }) {
  // Tudo em SVG (setas, linhas e texto), assim como a régua vertical — o
  // html2canvas não alinha bem uma linha flex com ícones de seta e texto de
  // alturas diferentes (setas e texto saíam desalinhados só na exportação).
  // Coordenadas absolutas de SVG não dependem de alinhamento flex nenhum.
  const larguraTexto = texto.length * 8 + 12;
  const comprimentoLinha = 24;
  const margemSeta = 10;
  const largura = margemSeta * 2 + comprimentoLinha * 2 + larguraTexto;
  const meioY = 9;
  const xLinhaEsqIni = margemSeta;
  const xLinhaEsqFim = xLinhaEsqIni + comprimentoLinha;
  const xLinhaDirIni = xLinhaEsqFim + larguraTexto;
  const xLinhaDirFim = xLinhaDirIni + comprimentoLinha;
  return (
    <svg width={largura} height="18" viewBox={`0 0 ${largura} 18`}>
      <path
        d={`M${margemSeta} ${meioY - 5} L0 ${meioY} L${margemSeta} ${meioY + 5}`}
        fill="none"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <line x1={xLinhaEsqIni} y1={meioY} x2={xLinhaEsqFim} y2={meioY} stroke="#9ca3af" strokeWidth="1" />
      <text
        x={largura / 2}
        y={meioY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#4b5563"
      >
        {texto}
      </text>
      <line x1={xLinhaDirIni} y1={meioY} x2={xLinhaDirFim} y2={meioY} stroke="#9ca3af" strokeWidth="1" />
      <path
        d={`M${xLinhaDirFim} ${meioY - 5} L${largura} ${meioY} L${xLinhaDirFim} ${meioY + 5}`}
        fill="none"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ReguaVertical({ texto }: { texto: string }) {
  // Tudo em SVG (setas, linhas e texto), igual a régua horizontal — assim as
  // duas ficam com o mesmo estilo de seta (linha fina em V, não o caractere
  // de seta do teclado) e nenhuma das duas depende de alinhamento flex ou de
  // position:absolute pra funcionar certo na exportação.
  const comprimentoTexto = texto.length * 8 + 12;
  const comprimentoLinha = 24;
  const margemSeta = 10;
  const altura = margemSeta * 2 + comprimentoLinha * 2 + comprimentoTexto;
  const meioX = 9;
  const yLinhaSupIni = margemSeta;
  const yLinhaSupFim = yLinhaSupIni + comprimentoLinha;
  const yLinhaInfIni = yLinhaSupFim + comprimentoTexto;
  const yLinhaInfFim = yLinhaInfIni + comprimentoLinha;
  return (
    <svg width="18" height={altura} viewBox={`0 0 18 ${altura}`}>
      <path
        d={`M${meioX - 5} ${margemSeta} L${meioX} 0 L${meioX + 5} ${margemSeta}`}
        fill="none"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
      <line x1={meioX} y1={yLinhaSupIni} x2={meioX} y2={yLinhaSupFim} stroke="#9ca3af" strokeWidth="1" />
      <text
        x={meioX}
        y={altura / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(90 ${meioX} ${altura / 2})`}
        fontSize="14"
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#4b5563"
      >
        {texto}
      </text>
      <line x1={meioX} y1={yLinhaInfIni} x2={meioX} y2={yLinhaInfFim} stroke="#9ca3af" strokeWidth="1" />
      <path
        d={`M${meioX - 5} ${yLinhaInfFim} L${meioX} ${altura} L${meioX + 5} ${yLinhaInfFim}`}
        fill="none"
        stroke="#4b5563"
        strokeWidth="1.5"
      />
    </svg>
  );
}
