import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Página inicial", () => {
  it("tem um link para começar uma nova encomenda", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /Nova encomenda/ });
    expect(link).toHaveAttribute("href", "/criar/tipo");
  });
});
