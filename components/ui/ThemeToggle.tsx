"use client";

import { useEffect, useState } from "react";
import { resolverTemaInicial, salvarTema, type Tema } from "@/lib/tema";

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(() =>
    typeof window === "undefined" ? "claro" : resolverTemaInicial()
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
  }, [tema]);

  function alternar() {
    const novoTema: Tema = tema === "claro" ? "escuro" : "claro";
    setTema(novoTema);
    salvarTema(novoTema);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "claro" ? "Ativar tema escuro" : "Ativar tema claro"}
      className="rounded-full p-2 text-xl leading-none hover:bg-white/10"
    >
      {tema === "claro" ? "🌙" : "☀️"}
    </button>
  );
}
