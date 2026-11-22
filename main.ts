// main.ts — the Ember Pact entry program (Node 22, standard library only).
//
// It hands the game in: copies this repository's game/ and screenshots/
// beside this file into /output (or $MAKEFUN_OUTPUT_DIR outside the grader)
// and writes /output/dossier.json with buildDossier from the vendored
// make.fun library, so the judge reads exactly the files handed in.
// The program is deterministic: two runs write the same bytes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of handing in a half-built entry.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — refusing to hand in an empty game');
}
if (!existsSync(join(here, 'screenshots'))) {
  throw new Error('screenshots/ is missing — the judge needs the game’s own screenshots');
}

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's caps, as the kit's scorer states them: at most 4 screenshots
// of 256 KiB, game/ within 993 files and 48 MiB, paths within 1000 bytes,
// and the dossier text capped at 160 KiB.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
