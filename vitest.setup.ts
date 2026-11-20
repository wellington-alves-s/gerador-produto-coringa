import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// O rascunho do croqui fica no sessionStorage (ver lib/wizard-storage.ts): sem isto ele vazaria de um teste para o próximo.
beforeEach(() => {
  if (typeof window !== "undefined") window.sessionStorage.clear();
});
