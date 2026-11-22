// serve.ts — serve game/ on http://localhost:8080 for local play-testing.
// Node 22 standard library only; run with `node serve.ts`.

import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

createServer((req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(join(root, path)).pipe(res);
}).listen(8080, () => console.log('Ember Pact at http://localhost:8080'));
