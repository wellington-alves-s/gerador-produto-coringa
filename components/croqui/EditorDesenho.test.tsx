import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { WizardProvider, useWizard } from "@/lib/wizard-context";
import { EditorDesenho } from "./EditorDesenho";

const comprimirMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/imagem", async (importarOriginal) => ({
  ...(await importarOriginal<typeof import("@/lib/imagem")>()),
  comprimirImagemComDimensoes: (...args: unknown[]) => comprimirMock(...args),
}));

function ComTipo({ children }: { children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
  }, [dispatch]);
  return <>{children}</>;
}

function MostrarDesenhoPersistido() {
  const { estado } = useWizard();
  return <pre data-testid="estado-desenho">{JSON.stringify(estado.desenho)}</pre>;
}

function renderizar() {
  return render(
    <WizardProvider>
      <ComTipo>
        <EditorDesenho />
        <MostrarDesenhoPersistido />
      </ComTipo>
    </WizardProvider>
  );
}

// No jsdom o SVG não tem tamanho: o editor cai no tamanho lógico (1000×800), então clientX/Y = coordenadas lógicas.
const ponteiro = (x: number, y: number) => ({ clientX: x, clientY: y, button: 0, pointerId: 1 });

function fundo() {
  return screen.getByTestId("camada-edicao").querySelector("[data-fundo-edicao]") as SVGElement;
}
function camadaEdicao() {
  return screen.getByTestId("camada-edicao");
}
function elementos() {
  return Array.from(screen.getByTestId("camada-elementos").querySelectorAll("g[data-elemento]"));
}
function desenhoPersistido() {
  return JSON.parse(screen.getByTestId("estado-desenho").textContent ?? "{}");
}

function desenharArrastando(ferramenta: string, de: [number, number], para: [number, number]) {
  fireEvent.click(screen.getByRole("button", { name: ferramenta }));
  fireEvent.pointerDown(fundo(), ponteiro(...de));
  fireEvent.pointerMove(camadaEdicao(), ponteiro(...para));
  fireEvent.pointerUp(camadaEdicao(), ponteiro(...para));
}

function colocarTexto(x = 300, y = 300) {
  fireEvent.click(screen.getByRole("button", { name: "Texto" }));
  fireEvent.pointerDown(fundo(), ponteiro(x, y));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("EditorDesenho — ferramentas", () => {
  it("mostra a barra de ferramentas, com Selecionar ativa e histórico desabilitado", () => {
    renderizar();
    expect(screen.getByRole("toolbar", { name: /Ferramentas de edição/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refazer" })).toBeDisabled();
  });

  it("clicar em uma ferramenta a ativa", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Seta" }));
    expect(screen.getByRole("button", { name: "Seta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Selecionar" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Texto: um clique no desenho cria o texto, seleciona e volta para Selecionar", () => {
    renderizar();
    colocarTexto(250, 150);

    expect(elementos()).toHaveLength(1);
    expect(screen.getByLabelText("Texto do elemento")).toHaveValue("Texto");
    expect(screen.getByRole("button", { name: "Selecionar" })).toHaveAttribute("aria-pressed", "true");
    expect(elementos()[0]).toHaveAttribute("transform", expect.stringContaining("translate(250 150)"));
  });

  it("editar o conteúdo, o tamanho e o negrito atualiza o elemento", async () => {
    const user = userEvent.setup();
    renderizar();
    colocarTexto();

    await user.clear(screen.getByLabelText("Texto do elemento"));
    await user.type(screen.getByLabelText("Texto do elemento"), "2,10 M");
    expect(screen.getByTestId("camada-elementos").querySelector("tspan")?.textContent).toBe("2,10 M");

    fireEvent.change(screen.getByLabelText("Tamanho da fonte"), { target: { value: "60" } });
    expect(screen.getByTestId("camada-elementos").querySelector("text")).toHaveAttribute("font-size", "60");

    await user.click(screen.getByLabelText("Negrito"));
    expect(screen.getByTestId("camada-elementos").querySelector("text")).toHaveAttribute("font-weight", "normal");
  });

  it("Seta: arrastar cria uma seta entre os dois pontos", () => {
    renderizar();
    desenharArrastando("Seta", [100, 100], [300, 100]);

    expect(elementos()).toHaveLength(1);
    const persistido = desenhoPersistido().elementos[0];
    expect(persistido).toMatchObject({ tipo: "linha", cx: 200, cy: 100, largura: 200, rotacao: 0, setaFim: true, setaInicio: false });
    expect(screen.getByRole("button", { name: "Selecionar" })).toHaveAttribute("aria-pressed", "true");
  });

  it("Seta dupla e Linha criam as variantes certas", () => {
    renderizar();
    desenharArrastando("Seta dupla", [100, 100], [300, 100]);
    desenharArrastando("Linha", [100, 200], [300, 200]);
    const [dupla, linha] = desenhoPersistido().elementos;
    expect(dupla).toMatchObject({ setaInicio: true, setaFim: true });
    expect(linha).toMatchObject({ setaInicio: false, setaFim: false });
  });

  it("Retângulo: arrastar define a caixa, em qualquer direção", () => {
    renderizar();
    desenharArrastando("Retângulo", [500, 400], [300, 300]);
    expect(desenhoPersistido().elementos[0]).toMatchObject({ tipo: "retangulo", cx: 400, cy: 350, largura: 200, altura: 100 });
  });

  it("só clicar (sem arrastar) com a ferramenta de forma cria um tamanho padrão utilizável", () => {
    renderizar();
    desenharArrastando("Seta", [500, 400], [502, 401]);
    expect(desenhoPersistido().elementos[0]).toMatchObject({ largura: 200, cx: 500, cy: 400 });
    desenharArrastando("Retângulo", [500, 600], [501, 601]);
    expect(desenhoPersistido().elementos[1]).toMatchObject({ largura: 200, altura: 120 });
  });
});

describe("EditorDesenho — seleção, mover e teclado", () => {
  function selecionarPrimeiro() {
    const hit = camadaEdicao().querySelector("[data-clique]:not([data-clique=imagem])") as SVGElement;
    fireEvent.pointerDown(hit.firstElementChild as Element, ponteiro(300, 300));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(300, 300));
  }

  it("clicar no vazio desmarca; clicar no elemento seleciona", () => {
    renderizar();
    colocarTexto();
    fireEvent.pointerDown(fundo(), ponteiro(900, 700));
    expect(screen.queryByLabelText("Texto do elemento")).toBeNull();

    selecionarPrimeiro();
    expect(screen.getByLabelText("Texto do elemento")).toBeInTheDocument();
  });

  it("arrastar o elemento move o centro", () => {
    renderizar();
    colocarTexto(300, 300);
    const hit = camadaEdicao().querySelector("[data-clique]:not([data-clique=imagem])")!.firstElementChild as Element;
    fireEvent.pointerDown(hit, ponteiro(300, 300));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(380, 340));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(380, 340));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cx: 380, cy: 340 });
  });

  it("setas do teclado movem o selecionado (Shift = passo maior) e não movem sem seleção", () => {
    renderizar();
    colocarTexto(300, 300);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cx: 302, cy: 302 });
    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cx: 282, cy: 302 });

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cx: 282 });
  });

  it("as setas do teclado não movem o item enquanto o usuário digita num campo", async () => {
    const user = userEvent.setup();
    renderizar();
    colocarTexto(300, 300);
    await user.click(screen.getByLabelText("Texto do elemento"));
    await user.keyboard("{ArrowRight}");
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cx: 300 });
  });

  it("Delete exclui o selecionado", () => {
    renderizar();
    colocarTexto();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(elementos()).toHaveLength(0);
  });
});

describe("EditorDesenho — histórico", () => {
  it("Ctrl+Z desfaz e Ctrl+Shift+Z refaz", () => {
    renderizar();
    colocarTexto();
    expect(elementos()).toHaveLength(1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(elementos()).toHaveLength(0);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(elementos()).toHaveLength(1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(elementos()).toHaveLength(1);
  });

  it("os botões Desfazer/Refazer acompanham o histórico", () => {
    renderizar();
    colocarTexto();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getByRole("button", { name: "Refazer" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeDisabled();
  });

  it("um gesto de mover vira um único passo de desfazer", () => {
    renderizar();
    colocarTexto(300, 300);
    const hit = camadaEdicao().querySelector("[data-clique]:not([data-clique=imagem])")!.firstElementChild as Element;
    fireEvent.pointerDown(hit, ponteiro(300, 300));
    for (const x of [320, 340, 360, 380]) fireEvent.pointerMove(camadaEdicao(), ponteiro(x, 300));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(380, 300));
    expect(desenhoPersistido().elementos[0].cx).toBe(380);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(desenhoPersistido().elementos[0].cx).toBe(300);
  });

  it("digitar um texto longo vira um único passo de desfazer", async () => {
    const user = userEvent.setup();
    renderizar();
    colocarTexto();
    await user.clear(screen.getByLabelText("Texto do elemento"));
    await user.type(screen.getByLabelText("Texto do elemento"), "abcdef");
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getByLabelText("Texto do elemento")).toHaveValue("Texto");
  });

  it("Limpar anotações remove tudo e dá para desfazer", () => {
    renderizar();
    colocarTexto();
    desenharArrastando("Seta", [100, 100], [300, 100]);
    fireEvent.click(screen.getByRole("button", { name: "Limpar anotações" }));
    expect(elementos()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(elementos()).toHaveLength(2);
  });
});

describe("EditorDesenho — girar, espelhar, duplicar e camadas", () => {
  it("Girar 90° e o campo de rotação alteram a rotação do elemento", () => {
    renderizar();
    colocarTexto();
    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));
    expect(desenhoPersistido().elementos[0].rotacao).toBe(90);
    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));
    expect(desenhoPersistido().elementos[0].rotacao).toBe(180);

    fireEvent.change(screen.getByLabelText("Rotação em graus"), { target: { value: "-45" } });
    expect(desenhoPersistido().elementos[0].rotacao).toBe(-45);
  });

  it("espelha na horizontal e na vertical, de forma independente", () => {
    renderizar();
    colocarTexto();
    fireEvent.click(screen.getByRole("button", { name: "Espelhar horizontal" }));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ espelhoH: true, espelhoV: false });
    fireEvent.click(screen.getByRole("button", { name: "Espelhar vertical" }));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ espelhoH: true, espelhoV: true });
    expect(elementos()[0]).toHaveAttribute("transform", expect.stringContaining("scale(-1 -1)"));
  });

  it("Duplicar cria uma cópia deslocada e seleciona a cópia; Ctrl+D faz o mesmo", () => {
    renderizar();
    colocarTexto(300, 300);
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    const [original, copia] = desenhoPersistido().elementos;
    expect(copia.id).not.toBe(original.id);
    expect(copia).toMatchObject({ cx: 324, cy: 324, texto: "Texto" });

    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(elementos()).toHaveLength(3);
  });

  it("Excluir remove só o elemento selecionado", () => {
    renderizar();
    colocarTexto();
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(elementos()).toHaveLength(1);
  });

  it("os botões de camada reordenam o elemento selecionado", () => {
    renderizar();
    colocarTexto(100, 100);
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    const ids = () => desenhoPersistido().elementos.map((e: { id: string }) => e.id);
    const [a, b, c] = ids();

    // o selecionado é a última cópia (c); mandar ao fundo coloca c primeiro
    fireEvent.click(screen.getByRole("button", { name: "Ao fundo" }));
    expect(ids()).toEqual([c, a, b]);
    fireEvent.click(screen.getByRole("button", { name: "Para frente" }));
    expect(ids()).toEqual([a, c, b]);
    fireEvent.click(screen.getByRole("button", { name: "Ao topo" }));
    expect(ids()).toEqual([a, b, c]);
    fireEvent.click(screen.getByRole("button", { name: "Para trás" }));
    expect(ids()).toEqual([a, c, b]);
  });
});

describe("EditorDesenho — retângulo preenchido", () => {
  it("a ferramenta Retângulo continua criando um retângulo vazado", () => {
    renderizar();
    desenharArrastando("Retângulo", [100, 100], [300, 200]);
    expect(desenhoPersistido().elementos[0]).toMatchObject({ tipo: "retangulo", preenchimento: null });
  });

  it("a ferramenta Retângulo preenchido já cria um bloco sólido, pela mesma borda e cor", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [100, 100], [300, 200]);
    expect(desenhoPersistido().elementos[0]).toMatchObject({
      tipo: "retangulo",
      cx: 200,
      cy: 150,
      largura: 200,
      altura: 100,
      cor: "#000000",
      preenchimento: "#000000",
    });
    expect(screen.getByLabelText("Preencher")).toBeChecked();
    expect(screen.getByRole("button", { name: "Selecionar" })).toHaveAttribute("aria-pressed", "true");
  });

  it("só clicar com Retângulo preenchido cria o tamanho padrão e continua preenchido", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [500, 400], [502, 401]);
    expect(desenhoPersistido().elementos[0]).toMatchObject({ largura: 200, altura: 120, preenchimento: "#000000" });
  });

  it("o retângulo preenchido aparece como bloco sólido no desenho", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [100, 100], [300, 200]);
    const retangulo = screen.getByTestId("camada-elementos").querySelector("g[data-elemento=retangulo] rect") as SVGRectElement;
    expect(retangulo).toHaveAttribute("fill", "#000000");
  });

  it("trocar a Cor de um bloco sólido muda borda e preenchimento juntos", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [100, 100], [300, 200]);
    fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "#ff0000" } });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cor: "#ff0000", preenchimento: "#ff0000" });
  });

  it("com preenchimento de outra cor, a Cor muda só a borda", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [100, 100], [300, 200]);
    fireEvent.change(screen.getByLabelText("Cor do preenchimento"), { target: { value: "#00ff00" } });
    fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "#ff0000" } });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cor: "#ff0000", preenchimento: "#00ff00" });
  });

  it("dá para desmarcar o preenchimento e virar um retângulo vazado", () => {
    renderizar();
    desenharArrastando("Retângulo preenchido", [100, 100], [300, 200]);
    fireEvent.click(screen.getByLabelText("Preencher"));
    expect(desenhoPersistido().elementos[0].preenchimento).toBeNull();
  });
});

describe("EditorDesenho — propriedades", () => {
  it("cor, espessura, setas e preenchimento mudam o elemento", () => {
    renderizar();
    desenharArrastando("Retângulo", [100, 100], [300, 250]);

    fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Espessura"), { target: { value: "9" } });
    fireEvent.click(screen.getByLabelText("Preencher"));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ cor: "#ff0000", espessura: 9 });
    expect(desenhoPersistido().elementos[0].preenchimento).not.toBeNull();

    fireEvent.click(screen.getByLabelText("Preencher"));
    expect(desenhoPersistido().elementos[0].preenchimento).toBeNull();
  });

  it("linha: liga e desliga as setas pelas caixas de seleção", () => {
    renderizar();
    desenharArrastando("Linha", [100, 100], [300, 100]);
    fireEvent.click(screen.getByLabelText("Seta no início"));
    fireEvent.click(screen.getByLabelText("Seta no fim"));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ setaInicio: true, setaFim: true });
  });

  it("limita a espessura entre 1 e 40", () => {
    renderizar();
    desenharArrastando("Linha", [100, 100], [300, 100]);
    fireEvent.change(screen.getByLabelText("Espessura"), { target: { value: "500" } });
    expect(desenhoPersistido().elementos[0].espessura).toBe(40);
    fireEvent.change(screen.getByLabelText("Espessura"), { target: { value: "0" } });
    expect(desenhoPersistido().elementos[0].espessura).toBe(1);
  });
});

describe("EditorDesenho — alças", () => {
  it("o elemento selecionado mostra alças de canto e de rotação; a linha mostra as duas pontas", () => {
    renderizar();
    desenharArrastando("Retângulo", [100, 100], [300, 250]);
    const alcas = Array.from(camadaEdicao().querySelectorAll("[data-alca]")).map((a) => a.getAttribute("data-alca"));
    expect(alcas).toEqual(expect.arrayContaining(["nw", "ne", "se", "sw", "n", "e", "s", "w", "rotacao"]));

    desenharArrastando("Linha", [100, 400], [300, 400]);
    const alcasLinha = Array.from(camadaEdicao().querySelectorAll("[data-alca]")).map((a) => a.getAttribute("data-alca"));
    expect(alcasLinha.sort()).toEqual(["extremidade-fim", "extremidade-inicio", "rotacao"]);
  });

  it("texto só tem alças de canto (esticar escala a fonte)", () => {
    renderizar();
    colocarTexto();
    const alcas = Array.from(camadaEdicao().querySelectorAll("[data-alca]")).map((a) => a.getAttribute("data-alca"));
    expect(alcas).not.toContain("n");
    expect(alcas).toContain("se");
  });

  it("arrastar a alça de canto do retângulo estica mantendo o canto oposto", () => {
    renderizar();
    desenharArrastando("Retângulo", [100, 100], [300, 200]);
    const se = camadaEdicao().querySelector("[data-alca=se]") as Element;
    fireEvent.pointerDown(se, ponteiro(300, 200));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(400, 300));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(400, 300));
    const r = desenhoPersistido().elementos[0];
    expect(r).toMatchObject({ largura: 300, altura: 200 });
    expect(r.cx - r.largura / 2).toBeCloseTo(100);
    expect(r.cy - r.altura / 2).toBeCloseTo(100);
  });

  it("arrastar uma ponta da linha muda o ângulo", () => {
    renderizar();
    desenharArrastando("Linha", [100, 100], [300, 100]);
    const fim = camadaEdicao().querySelector("[data-alca=extremidade-fim]") as Element;
    fireEvent.pointerDown(fim, ponteiro(300, 100));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(100, 300));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(100, 300));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ rotacao: 90, largura: 200 });
  });

  it("a alça de rotação gira o elemento; Shift encaixa em 15°", () => {
    renderizar();
    desenharArrastando("Retângulo", [100, 100], [300, 200]); // centro (200,150)
    const alca = () => camadaEdicao().querySelector("[data-alca=rotacao]") as Element;
    fireEvent.pointerDown(alca(), ponteiro(200, 50));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(300, 150)); // à direita do centro = 90°
    fireEvent.pointerUp(camadaEdicao(), ponteiro(300, 150));
    expect(desenhoPersistido().elementos[0].rotacao).toBeCloseTo(90);

    fireEvent.pointerDown(alca(), ponteiro(300, 150));
    fireEvent.pointerMove(camadaEdicao(), { ...ponteiro(300, 130), shiftKey: true });
    fireEvent.pointerUp(camadaEdicao(), ponteiro(300, 130));
    expect(desenhoPersistido().elementos[0].rotacao % 15).toBeCloseTo(0);
  });
});

describe("EditorDesenho — imagem do produto", () => {
  function renderizarComImagem() {
    function ComImagem({ children }: { children: ReactNode }) {
      const { dispatch } = useWizard();
      useEffect(() => {
        dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
        dispatch({ type: "DEFINIR_IMAGEM_UPLOAD", dataUrl: "data:image/png;base64,QUJD" });
      }, [dispatch]);
      return <>{children}</>;
    }
    return render(
      <WizardProvider>
        <ComImagem>
          <EditorDesenho />
          <MostrarDesenhoPersistido />
        </ComImagem>
      </WizardProvider>
    );
  }

  it("clicar na imagem seleciona (com opção de restaurar) e permite girar e espelhar", () => {
    renderizarComImagem();
    const hitImagem = camadaEdicao().querySelector("[data-clique=imagem]")!.firstElementChild as Element;
    fireEvent.pointerDown(hitImagem, ponteiro(500, 400));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 400));

    expect(screen.getByRole("button", { name: "Restaurar posição da imagem" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Duplicar" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));
    fireEvent.click(screen.getByRole("button", { name: "Espelhar vertical" }));
    expect(desenhoPersistido().imagem).toMatchObject({ rotacao: 90, espelhoV: true });
    expect(screen.getByAltText("Desenho do produto").style.transform).toBe("rotate(90deg) scale(1, -1)");

    fireEvent.click(screen.getByRole("button", { name: "Restaurar posição da imagem" }));
    expect(desenhoPersistido().imagem).toBeNull();
  });

  it("Delete não apaga a imagem", () => {
    renderizarComImagem();
    const hitImagem = camadaEdicao().querySelector("[data-clique=imagem]")!.firstElementChild as Element;
    fireEvent.pointerDown(hitImagem, ponteiro(500, 400));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.getByAltText("Desenho do produto")).toBeInTheDocument();
  });

  it("as setas do teclado movem a imagem selecionada", () => {
    renderizarComImagem();
    const hitImagem = camadaEdicao().querySelector("[data-clique=imagem]")!.firstElementChild as Element;
    fireEvent.pointerDown(hitImagem, ponteiro(500, 400));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 400));
    fireEvent.keyDown(window, { key: "ArrowUp", shiftKey: true });
    expect(desenhoPersistido().imagem.cy).toBe(555);
  });
});

describe("EditorDesenho — barra flutuante expansível", () => {
  it("começa recolhida (sem as opções do item) e expande ao selecionar um item", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: "Mais opções" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Girar 90°" })).toBeNull();

    colocarTexto();
    expect(screen.getByRole("button", { name: "Recolher opções" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeInTheDocument();
  });

  it("o botão de mais opções abre uma dica mesmo sem seleção e recolhe de novo", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByText(/Clique em um item do desenho/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recolher opções" }));
    expect(screen.queryByText(/Clique em um item do desenho/)).toBeNull();
  });

  it("dá para recolher com um item selecionado, e a escolha vale só para aquela seleção", () => {
    renderizar();
    colocarTexto();
    fireEvent.click(screen.getByRole("button", { name: "Recolher opções" }));
    expect(screen.queryByRole("button", { name: "Girar 90°" })).toBeNull();

    // outro item selecionado volta ao modo automático (expandido)
    fireEvent.click(screen.getByRole("button", { name: "Seta" }));
    fireEvent.pointerDown(fundo(), ponteiro(100, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(100, 500));
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeInTheDocument();
  });

  it("a barra tem alça para mover e botões com ícones decorativos (nome acessível só pelo texto)", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Mover barra de ferramentas" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar").querySelectorAll("svg[aria-hidden=true]").length).toBeGreaterThan(8);
  });
});

describe("EditorDesenho — apagar área e borracha", () => {
  class ImagemFalsa {
    naturalWidth = 1000;
    naturalHeight = 500;
    width = 1000;
    height = 500;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_valor: string) {
      setTimeout(() => this.onload?.(), 0);
    }
  }

  function ComImagem({ children }: { children: ReactNode }) {
    const { dispatch } = useWizard();
    useEffect(() => {
      dispatch({ type: "DEFINIR_TIPO", tipo: "outros" });
      dispatch({ type: "DEFINIR_IMAGEM_UPLOAD", dataUrl: "data:image/png;base64,QUJD" });
    }, [dispatch]);
    return <>{children}</>;
  }

  async function renderizarComImagemPosicionada() {
    vi.stubGlobal("Image", ImagemFalsa);
    render(
      <WizardProvider>
        <ComImagem>
          <EditorDesenho />
          <MostrarDesenhoPersistido />
        </ComImagem>
      </WizardProvider>
    );
    // a imagem ocupa x 50..950 e y 350..800 depois de carregar (proporção 2:1)
    await waitFor(() => expect(desenhoPersistido().imagem).not.toBeNull());
  }

  const apagamentos = () => desenhoPersistido().apagamentos ?? [];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("as duas ferramentas ficam desabilitadas sem imagem", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Apagar área" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Borracha" })).toBeDisabled();
  });

  it("com imagem as ferramentas ficam disponíveis e abrem as opções de apagar", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    expect(screen.getByRole("button", { name: "Borracha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Tamanho da borracha")).toHaveValue(40);
    expect(screen.queryByRole("button", { name: "Girar 90°" })).toBeNull();
  });

  it("Apagar área: arrastar marca a área, o botão apaga e a seleção some", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Apagar área" }));
    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(500, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 500));

    expect(camadaEdicao().querySelector("[data-selecao-area]")).not.toBeNull();
    expect(apagamentos()).toHaveLength(0); // ainda é só uma seleção

    fireEvent.click(screen.getByRole("button", { name: "Apagar área selecionada" }));
    expect(apagamentos()).toHaveLength(1);
    // centro (400,450) → u=(400-500)/900+0,5 ; v=(450-575)/450+0,5 ; meia-largura 100/900
    expect(apagamentos()[0]).toMatchObject({ u: 0.3889, v: 0.2222, mw: 0.1111, mh: 0.0556, rot: 0 });
    expect(camadaEdicao().querySelector("[data-selecao-area]")).toBeNull();
  });

  it("Apagar área: Delete apaga, Esc cancela, e um arrasto minúsculo não marca nada", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Apagar área" }));

    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(302, 402));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(302, 402));
    expect(camadaEdicao().querySelector("[data-selecao-area]")).toBeNull();

    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(400, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(400, 500));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(camadaEdicao().querySelector("[data-selecao-area]")).toBeNull();
    expect(apagamentos()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Apagar área" }));
    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(400, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(400, 500));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(apagamentos()).toHaveLength(1);
  });

  it("Apagar área: dá para desfazer e refazer o apagamento", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Apagar área" }));
    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(500, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 500));
    fireEvent.click(screen.getByRole("button", { name: "Apagar área selecionada" }));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(apagamentos()).toHaveLength(0);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(apagamentos()).toHaveLength(1);
  });

  it("Borracha: o traço apaga quadrados ao longo do caminho e é um único passo de desfazer", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    fireEvent.pointerDown(fundo(), ponteiro(400, 575));
    expect(camadaEdicao().querySelectorAll("[data-previa-borracha]")).toHaveLength(1);
    fireEvent.pointerMove(camadaEdicao(), ponteiro(500, 575));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 575));

    // 1 no início + 5 ao longo de 100 unidades (passo = metade do lado = 20)
    expect(apagamentos()).toHaveLength(6);
    expect(apagamentos()[0]).toMatchObject({ u: 0.3889, v: 0.5, mw: 0.0222, mh: 0.0222 });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(apagamentos()).toHaveLength(0);
  });

  it("Borracha: o tamanho configurado muda o quadrado e o quadradinho segue o mouse", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    fireEvent.change(screen.getByLabelText("Tamanho da borracha"), { target: { value: "90" } });

    fireEvent.pointerMove(camadaEdicao(), ponteiro(600, 600));
    const cursor = camadaEdicao().querySelector("[data-cursor-borracha]") as SVGRectElement;
    expect(cursor).toHaveAttribute("width", "90");
    expect(cursor).toHaveAttribute("x", "555");

    fireEvent.pointerDown(fundo(), ponteiro(600, 600));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(600, 600));
    expect(apagamentos()[0]).toMatchObject({ mw: 0.05, mh: 0.05 });
  });

  it("limita o tamanho da borracha entre 5 e 300", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    fireEvent.change(screen.getByLabelText("Tamanho da borracha"), { target: { value: "9999" } });
    expect(screen.getByLabelText("Tamanho da borracha")).toHaveValue(300);
    fireEvent.change(screen.getByLabelText("Tamanho da borracha"), { target: { value: "1" } });
    expect(screen.getByLabelText("Tamanho da borracha")).toHaveValue(5);
  });

  it("os apagamentos acompanham a imagem girada (carimbo com a rotação compensada)", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.pointerDown(camadaEdicao().querySelector("[data-clique=imagem]")!.firstElementChild as Element, ponteiro(500, 575));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 575));
    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));

    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    fireEvent.pointerDown(fundo(), ponteiro(500, 575));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 575));
    expect(apagamentos()[0]).toMatchObject({ u: 0.5, v: 0.5, rot: -90 });
  });

  it("Restaurar imagem original limpa todos os apagamentos (e dá para desfazer)", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Borracha" }));
    fireEvent.pointerDown(fundo(), ponteiro(400, 575));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(400, 575));
    expect(apagamentos()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Restaurar imagem original" }));
    expect(apagamentos()).toHaveLength(0);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(apagamentos()).toHaveLength(1);
  });

  it("trocar para outra ferramenta descarta uma seleção de área pendente", async () => {
    await renderizarComImagemPosicionada();
    fireEvent.click(screen.getByRole("button", { name: "Apagar área" }));
    fireEvent.pointerDown(fundo(), ponteiro(300, 400));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(500, 500));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(500, 500));
    fireEvent.click(screen.getByRole("button", { name: "Seta" }));
    expect(camadaEdicao().querySelector("[data-selecao-area]")).toBeNull();
  });
});

describe("EditorDesenho — colar imagem da área de transferência", () => {
  const arquivoPng = () => new File(["conteudo"], "print.png", { type: "image/png" });
  const areaDeTransferencia = (itens: { kind: string; type: string; getAsFile?: () => File | null }[]) => ({ clipboardData: { items: itens } });
  const imagemNaAreaDeTransferencia = () =>
    areaDeTransferencia([{ kind: "file", type: "image/png", getAsFile: () => arquivoPng() }]);

  beforeEach(() => {
    comprimirMock.mockReset().mockResolvedValue({ dataUrl: "data:image/jpeg;base64,COLADA", largura: 800, altura: 400 });
  });

  it("Ctrl+V com uma imagem cria um item novo, selecionado, no centro do quadro", async () => {
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());

    await waitFor(() => expect(desenhoPersistido().elementos).toHaveLength(1));
    expect(desenhoPersistido().elementos[0]).toMatchObject({
      tipo: "imagem",
      src: "data:image/jpeg;base64,COLADA",
      cx: 500,
      cy: 575,
      largura: 400,
      altura: 200, // proporção 2:1 preservada
    });
    expect(comprimirMock).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ larguraMaxima: 1200 }));
    // selecionado: as opções de posição aparecem, mas não as de cor
    expect(screen.getByRole("button", { name: "Girar 90°" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Cor")).toBeNull();
  });

  it("a imagem colada é desenhada no SVG e se comporta como os outros itens", async () => {
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());
    await waitFor(() => expect(elementos()).toHaveLength(1));
    const imagem = screen.getByTestId("camada-elementos").querySelector("g[data-elemento=imagem] image");
    expect(imagem).toHaveAttribute("href", "data:image/jpeg;base64,COLADA");

    fireEvent.click(screen.getByRole("button", { name: "Girar 90°" }));
    fireEvent.click(screen.getByRole("button", { name: "Espelhar horizontal" }));
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(desenhoPersistido().elementos[0]).toMatchObject({ rotacao: 90, espelhoH: true, cx: 520 });

    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(elementos()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(elementos()).toHaveLength(1);
  });

  it("só tem alças de canto e redimensiona mantendo a proporção", async () => {
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());
    await waitFor(() => expect(elementos()).toHaveLength(1));
    const alcas = Array.from(camadaEdicao().querySelectorAll("[data-alca]")).map((a) => a.getAttribute("data-alca"));
    expect(alcas).not.toContain("n");
    expect(alcas).toContain("se");

    // canto inferior direito: (500+200, 575+100) → arrasta para fora, só na horizontal
    fireEvent.pointerDown(camadaEdicao().querySelector("[data-alca=se]") as Element, ponteiro(700, 675));
    fireEvent.pointerMove(camadaEdicao(), ponteiro(900, 675));
    fireEvent.pointerUp(camadaEdicao(), ponteiro(900, 675));
    const imagem = desenhoPersistido().elementos[0];
    expect(imagem.largura / imagem.altura).toBeCloseTo(2);
    expect(imagem.largura).toBeGreaterThan(400);
  });

  it("colar é um passo só no histórico (Ctrl+Z remove a imagem colada)", async () => {
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());
    await waitFor(() => expect(elementos()).toHaveLength(1));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(elementos()).toHaveLength(0);
  });

  it("imagens muito altas são limitadas a 600 de altura, mantendo a proporção", async () => {
    comprimirMock.mockResolvedValue({ dataUrl: "data:image/jpeg;base64,ALTA", largura: 300, altura: 1200 });
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());
    await waitFor(() => expect(desenhoPersistido().elementos).toHaveLength(1));
    expect(desenhoPersistido().elementos[0]).toMatchObject({ altura: 600, largura: 150 });
  });

  it("colar texto (sem imagem) não faz nada", async () => {
    renderizar();
    fireEvent.paste(window, areaDeTransferencia([{ kind: "string", type: "text/plain" }]));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(comprimirMock).not.toHaveBeenCalled();
    expect(elementos()).toHaveLength(0);
  });

  it("colar dentro de um campo de texto continua sendo a colagem normal do campo", async () => {
    renderizar();
    colocarTexto();
    const campo = screen.getByLabelText("Texto do elemento");
    fireEvent.paste(campo, imagemNaAreaDeTransferencia());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(comprimirMock).not.toHaveBeenCalled();
    expect(elementos()).toHaveLength(1);
  });

  it("se a imagem não puder ser processada, avisa sem quebrar", async () => {
    comprimirMock.mockRejectedValue(new Error("imagem inválida"));
    renderizar();
    fireEvent.paste(window, imagemNaAreaDeTransferencia());
    expect(await screen.findByRole("status")).toHaveTextContent(/Não foi possível usar a imagem colada/);
    expect(elementos()).toHaveLength(0);
  });

  it("o botão Colar imagem lê a área de transferência do navegador", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { read: async () => [{ types: ["text/plain", "image/png"], getType: async () => new Blob(["x"], { type: "image/png" }) }] },
    });
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Colar imagem" }));
    await waitFor(() => expect(desenhoPersistido().elementos).toHaveLength(1));
    expect(desenhoPersistido().elementos[0].tipo).toBe("imagem");
    vi.unstubAllGlobals();
  });

  it("o botão avisa quando não há imagem copiada e quando o navegador nega o acesso", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { read: async () => [{ types: ["text/plain"], getType: async () => new Blob() }] } });
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Colar imagem" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Não há imagem na área de transferência/);

    vi.stubGlobal("navigator", { ...navigator, clipboard: { read: async () => Promise.reject(new Error("negado")) } });
    fireEvent.click(screen.getByRole("button", { name: "Colar imagem" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/não liberou o acesso/));
    vi.unstubAllGlobals();
  });
});
