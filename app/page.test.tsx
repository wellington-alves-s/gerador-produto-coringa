import { describe, it, expect, vi } from "vitest";
import { redirect } from "next/navigation";
import Home from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Página inicial", () => {
  it("redireciona direto para a seleção de tipo de croqui", () => {
    Home();
    expect(redirect).toHaveBeenCalledWith("/criar/tipo");
  });
});
