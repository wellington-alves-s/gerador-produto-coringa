import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { extname, basename } from "node:path";

const ORIGEM = "legado-php/uploads";
const DESTINO = "public/biblioteca/produtos";
const EXTENSOES_VALIDAS = [".jpg", ".jpeg", ".png", ".webp"];

function paraSlug(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

mkdirSync(DESTINO, { recursive: true });

const arquivos = readdirSync(ORIGEM).filter((nome) =>
  EXTENSOES_VALIDAS.includes(extname(nome).toLowerCase())
);

const itens = arquivos.map((arquivoOriginal) => {
  const extensao = extname(arquivoOriginal);
  const nomeBase = basename(arquivoOriginal, extensao);
  const slug = paraSlug(nomeBase);
  const arquivoDestino = `${slug}${extensao.toLowerCase()}`;

  copyFileSync(`${ORIGEM}/${arquivoOriginal}`, `${DESTINO}/${arquivoDestino}`);

  return {
    id: slug,
    nome: nomeBase.replace(/_/g, " "),
    categoria: slug.split("-")[0],
    arquivo: arquivoDestino,
  };
});

const conteudo = `import type { ItemBiblioteca } from "./biblioteca-tipos";

export const BIBLIOTECA: ItemBiblioteca[] = ${JSON.stringify(itens, null, 2)};
`;

writeFileSync("lib/biblioteca-dados.ts", conteudo);

console.log(`Migrados ${itens.length} arquivos para ${DESTINO}, manifesto escrito em lib/biblioteca-dados.ts`);
