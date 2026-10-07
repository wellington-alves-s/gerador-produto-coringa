import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, type RefObject } from "react";
import { BarraFlutuante } from "./BarraFlutuante";

function barra() {
  return screen.getByRole("toolbar", { name: "Minha barra" });
}
const posicao = () => ({ x: parseFloat(barra().style.left), y: parseFloat(barra().style.top) });

function renderizar(props: { expandido?: boolean; ancora?: RefObject<HTMLElement | null> } = {}) {
  return render(
    <BarraFlutuante
      rotulo="Minha barra"
      ancora={props.ancora}
      expandido={props.expandido ?? false}
      principal={<button type="button">Principal</button>}
      expansao={<button type="button">Extra</button>}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1200);
  vi.stubGlobal("innerHeight", 800);
});

describe("BarraFlutuante", () => {
  it("mostra a linha principal e só renderiza a expansão quando expandida", () => {
    const { rerender } = renderizar();
    expect(screen.getByRole("button", { name: "Principal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Extra" })).toBeNull();

    rerender(
      <BarraFlutuante rotulo="Minha barra" expandido principal={<button type="button">Principal</button>} expansao={<button type="button">Extra</button>} />
    );
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });

  it("sem âncora, nasce no canto superior direito da janela", () => {
    renderizar();
    expect(barra().style.visibility).toBe("visible");
    expect(posicao().y).toBe(16);
    expect(posicao().x).toBeGreaterThan(1000);
  });

  it("com âncora, nasce no canto superior direito dela, logo no topo", () => {
    const ancora = createRef<HTMLDivElement>();
    render(<div ref={ancora} data-testid="croqui" />);
    vi.spyOn(ancora.current!, "getBoundingClientRect").mockReturnValue({
      left: 100, right: 1100, top: 300, bottom: 1300, width: 1000, height: 1000, x: 100, y: 300, toJSON: () => ({}),
    });
    renderizar({ ancora });
    expect(posicao()).toEqual({ x: 1100 - 16, y: 308 });
  });

  it("arrastar pela alça move a barra", () => {
    renderizar();
    const antes = posicao();
    const alca = screen.getByRole("button", { name: "Mover barra de ferramentas" });
    fireEvent.pointerDown(alca, { clientX: 500, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(alca, { clientX: 420, clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(alca, { pointerId: 1 });
    expect(posicao()).toEqual({ x: antes.x - 80, y: antes.y + 60 });

    // depois de soltar, mover o ponteiro não arrasta mais
    fireEvent.pointerMove(alca, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(posicao()).toEqual({ x: antes.x - 80, y: antes.y + 60 });
  });

  it("não deixa a barra sair da janela", () => {
    renderizar();
    const alca = screen.getByRole("button", { name: "Mover barra de ferramentas" });
    fireEvent.pointerDown(alca, { clientX: 500, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(alca, { clientX: -5000, clientY: -5000, pointerId: 1 });
    expect(posicao()).toEqual({ x: 8, y: 8 });
    fireEvent.pointerMove(alca, { clientX: 9000, clientY: 9000, pointerId: 1 });
    expect(posicao().x).toBeLessThanOrEqual(1200 - 8);
    expect(posicao().y).toBeLessThanOrEqual(800 - 56);
    fireEvent.pointerUp(alca, { pointerId: 1 });
  });

  it("as setas do teclado movem a barra quando a alça está focada", () => {
    renderizar();
    const antes = posicao();
    const alca = screen.getByRole("button", { name: "Mover barra de ferramentas" });
    fireEvent.keyDown(alca, { key: "ArrowDown" });
    fireEvent.keyDown(alca, { key: "ArrowLeft" });
    expect(posicao()).toEqual({ x: antes.x - 12, y: antes.y + 12 });
  });

  it("se a janela diminuir, a barra volta para dentro", () => {
    renderizar();
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("innerHeight", 300);
    fireEvent(window, new Event("resize"));
    expect(posicao().x).toBeLessThanOrEqual(500 - 8);
    expect(posicao().y).toBeLessThanOrEqual(300 - 56);
  });
});
