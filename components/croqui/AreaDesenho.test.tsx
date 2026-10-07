import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AreaDesenho } from "./AreaDesenho";
import { criarLinha, criarRetangulo, criarTexto, transformacaoPadraoDaImagem, DESENHO_INICIAL } from "@/lib/desenho";

describe("AreaDesenho", () => {
  it("sem imagem mostra o aviso 'Sem imagem'", () => {
    render(<AreaDesenho imagemSrc={null} desenho={DESENHO_INICIAL} />);
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
    expect(screen.queryByAltText("Desenho do produto")).toBeNull();
  });

  it("posiciona a imagem em porcentagem do quadro, com rotação e espelhamento", () => {
    const imagem = { ...transformacaoPadraoDaImagem(), cx: 500, cy: 400, largura: 500, altura: 400, rotacao: 30, espelhoH: true };
    render(<AreaDesenho imagemSrc="/x.jpg" desenho={{ elementos: [], imagem }} />);
    const img = screen.getByAltText("Desenho do produto");
    expect(img).toHaveStyle({ left: "25%", top: "25%", width: "50%", height: "50%" });
    expect(img.style.transform).toBe("rotate(30deg) scale(-1, 1)");
  });

  it("sem posição salva, ajusta a imagem ao quadro (90%)", () => {
    render(<AreaDesenho imagemSrc="/x.jpg" desenho={DESENHO_INICIAL} />);
    expect(screen.getByAltText("Desenho do produto")).toHaveStyle({ left: "5%", top: "5%", width: "90%", height: "90%" });
  });

  it("desenha cada tipo de elemento na camada SVG, na ordem da lista", () => {
    const texto = { ...criarTexto({ x: 300, y: 300 }, "1,60 M\nLARGURA"), cor: "#ff0000" };
    const seta = criarLinha({ x: 100, y: 100 }, { x: 300, y: 100 }, "seta-dupla");
    const retangulo = criarRetangulo({ x: 400, y: 400 }, { x: 600, y: 500 });
    const { container } = render(<AreaDesenho imagemSrc={null} desenho={{ elementos: [seta, retangulo, texto], imagem: null }} />);

    const camada = screen.getByTestId("camada-elementos");
    const tipos = Array.from(camada.querySelectorAll("g[data-elemento]")).map((g) => g.getAttribute("data-elemento"));
    expect(tipos).toEqual(["linha", "retangulo", "texto"]);

    expect(camada.querySelectorAll("polygon")).toHaveLength(2); // pontas da seta dupla
    expect(container.querySelector("tspan")?.textContent).toBe("1,60 M");
    expect(camada.querySelectorAll("tspan")).toHaveLength(2);
    expect(camada.querySelector("text")).toHaveAttribute("fill", "#ff0000");
  });

  it("aplica rotação e espelhamento no grupo SVG do elemento", () => {
    const texto = { ...criarTexto({ x: 300, y: 200 }), rotacao: 90, espelhoV: true };
    render(<AreaDesenho imagemSrc={null} desenho={{ elementos: [texto], imagem: null }} />);
    expect(screen.getByTestId("camada-elementos").querySelector("g[data-elemento]")).toHaveAttribute(
      "transform",
      "translate(300 200) rotate(90) scale(1 -1)"
    );
  });

  it("a camada de anotações não captura o mouse (a edição fica na camada própria)", () => {
    render(<AreaDesenho imagemSrc={null} desenho={DESENHO_INICIAL} camadaEdicao={<span data-testid="edicao" />} />);
    expect(screen.getByTestId("camada-elementos")).toHaveStyle({ pointerEvents: "none" });
    expect(screen.getByTestId("edicao")).toBeInTheDocument();
  });

  it("seta simples só tem ponta no fim; linha simples não tem ponta", () => {
    const seta = criarLinha({ x: 0, y: 0 }, { x: 200, y: 0 }, "seta");
    const linha = criarLinha({ x: 0, y: 50 }, { x: 200, y: 50 }, "linha");
    render(<AreaDesenho imagemSrc={null} desenho={{ elementos: [seta, linha], imagem: null }} />);
    const grupos = screen.getByTestId("camada-elementos").querySelectorAll("g[data-elemento]");
    expect(grupos[0].querySelectorAll("polygon")).toHaveLength(1);
    expect(grupos[1].querySelectorAll("polygon")).toHaveLength(0);
  });
});
