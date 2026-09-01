import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const destino = join(process.cwd(), "public", "fonts");

const fontes = [
  {
    origem:
      "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
    destino: "fraunces-latin-wght-normal.woff2",
  },
  {
    origem:
      "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2",
    destino: "fraunces-latin-ext-wght-normal.woff2",
  },
  {
    origem:
      "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
    destino: "manrope-latin-wght-normal.woff2",
  },
  {
    origem:
      "node_modules/@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2",
    destino: "manrope-latin-ext-wght-normal.woff2",
  },
];

await mkdir(destino, { recursive: true });

await Promise.all(
  fontes.map((fonte) =>
    copyFile(fonte.origem, join(destino, fonte.destino)),
  ),
);

console.log("Fontes copiadas para public/fonts.");