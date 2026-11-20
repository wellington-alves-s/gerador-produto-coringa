import { neon } from "@neondatabase/serverless";

export type Consulta = <T = Record<string, unknown>>(texto: string, parametros?: unknown[]) => Promise<T[]>;

let injetada: Consulta | null = null;

/** Só para testes: troca o banco real por um em memória (`null` volta ao normal). */
export function definirConsulta(fn: Consulta | null): void {
  injetada = fn;
}

export const consultar: Consulta = async <T>(texto: string, parametros: unknown[] = []) => {
  if (injetada) return injetada<T>(texto, parametros);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está configurada neste ambiente.");
  return (await neon(url).query(texto, parametros)) as T[];
};
