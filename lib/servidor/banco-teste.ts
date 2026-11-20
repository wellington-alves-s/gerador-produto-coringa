import { PGlite } from "@electric-sql/pglite";
import type { Consulta } from "./banco";
import { COMANDOS_ESQUEMA } from "./esquema";

/** Postgres em memória (PGlite) com o esquema aplicado, para os testes de servidor. */
export async function criarBancoDeTeste(): Promise<Consulta> {
  const pg = new PGlite();
  for (const comando of COMANDOS_ESQUEMA) await pg.query(comando);
  return async <T>(texto: string, parametros: unknown[] = []) => (await pg.query<T>(texto, parametros)).rows;
}
