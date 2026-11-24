// main.ts — entrypoint: draws "The World on Tuesday" and writes it to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR when set, for local runs).
// Node 22, standard library only.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderPNG } from "./render.ts";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), renderPNG());
