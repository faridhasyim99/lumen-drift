// LUMEN DRIFT v2 — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies this directory's game/ and screenshots/
// beside it into the output directory and writes output/dossier.json, the
// summary the judge reads, using the vendored make.fun library. The grader
// runs it with /output as the destination; outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output, for example:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const source = join(repoRoot, name);
  if (!existsSync(source)) {
    throw new Error(`missing ${name}/ beside main.ts — nothing to hand in`);
  }
  cpSync(source, join(outputDir, name), { recursive: true });
}

// Count the plain files under a directory, so the build line can say
// what actually went in instead of only how big the dossier came out.
function countFiles(dir) {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) count += countFiles(path);
    else count += 1;
  }
  return count;
}

mkdirSync(outputDir, { recursive: true });
copyTree('game');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps: the text budget shapes the dossier's bytes, and the
// rest refuse an entry the scorer would refuse outright — more than four
// screenshots, one over 256 KiB, a game/ over 993 files or 48 MiB in all, or
// a path under game/ over 1000 bytes. game/ counts beside /output's own
// 1000-entry cap, which it shares with screenshots/ and dossier.json.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);

// One line for the person checking the build: what went in and how big the
// dossier came out. The grader reads the files, not this line.
const dossierBytes = Buffer.byteLength(dossier, 'utf8');
const gameFiles = countFiles(join(outputDir, 'game'));
const shotFiles = countFiles(join(outputDir, 'screenshots'));
console.log(
  `lumen-drift-v2: ${gameFiles} game files + ${shotFiles} screenshots copied to ${outputDir}, dossier.json ${dossierBytes} bytes`,
);
