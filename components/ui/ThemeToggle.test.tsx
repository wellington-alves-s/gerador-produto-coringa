import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("alterna a classe dark no <html> ao clicar", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const botao = screen.getByRole("button");

    await user.click(botao);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(botao);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
