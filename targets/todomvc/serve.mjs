import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const local = (path) => readFile(new URL(path, import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assetNames = ['app.js', 'base.css', 'base.js', 'controller.js', 'helpers.js', 'index.css',
  'index.html', 'model.js', 'store.js', 'template.js', 'view.js'];
const upstream = new Map(await Promise.all(assetNames.map(async (name) => [name, await local('upstream/' + name)])));
const fixture = await local('fixture.js');
const adapterSha256 = sha256(await readFile(new URL(import.meta.url)));
const originalPage = upstream.get('index.html').toString('utf8');
const page = originalPage.replace('<script src="base.js"></script>', '')
  .replace('<script src="app.js"></script>', '<script src="fixture.js"></script>\n        <script src="app.js"></script>');
if (page.includes('<script src="base.js">') || !page.includes('<script src="fixture.js">')) {
  throw new Error('Expected pinned upstream scripts in index.html.');
}

async function build(side) {
  const assets = new Map(upstream);
  assets.set('fixture.js', fixture);
  assets.set('index.html', Buffer.from(page));
  if (side === 'candidate') assets.set('view.js', await local('candidate/view.js'));
  const manifest = {
    schema: 1,
    upstream: 'ff43b02e59dfa604386bb382034b2cd07c2bcd8a',
    adapterSha256,
    files: Object.fromEntries([...assets].sort(([a], [b]) => a < b ? -1 : 1)
      .map(([name, bytes]) => [name, sha256(bytes)])),
  };
  return { assets, manifest, version: 'sha256-' + sha256(JSON.stringify(manifest)) };
}

const baseline = await build('baseline');
const candidate = await build('candidate');
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--manifest') {
  console.log(JSON.stringify(Object.fromEntries(Object.entries({ baseline, candidate })
    .map(([side, { manifest, version }]) => [side, { version, ...manifest }])), null, 2));
} else if (args.length === 0) {
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };
  const server = createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const match = /^\/(baseline|candidate)\/([^/?]*)(?:\?[^#]*)?$/.exec(request.url);
    const target = match?.[1] === 'baseline' ? baseline : candidate;
    const file = match?.[2] || 'index.html';
    const bytes = match && target.assets.get(file);
    if (!bytes) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file)] + '; charset=utf-8',
      'Content-Length': bytes.length,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
      'X-FixProof-Version': target.version,
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
  server.on('error', (error) => {
    console.error('TodoMVC adapter: ' + error.message);
    process.exitCode = 1;
  });
  server.listen(8771, '127.0.0.1', () => console.log('TodoMVC on http://127.0.0.1:8771/{baseline,candidate}/'));
} else {
  console.error('Usage: node targets/todomvc/serve.mjs [--manifest]');
  process.exitCode = 1;
}
