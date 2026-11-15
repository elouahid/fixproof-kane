import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { exampleImageNames, exampleView, reportView } from './report-view.mjs';

const host = '127.0.0.1';
const port = Number(process.env.FIXPROOF_CART_PORT ?? 8741);
const [option, reportPath, ...extra] = process.argv.slice(2);
if (option !== undefined && (option !== '--report' || !reportPath || extra.length)) {
  console.error('Usage: node app/server.mjs [--report path/to/report.json]');
  process.exit(2);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const evidenceDirectory = new URL('../evidence/', import.meta.url);
const [recorded, unavailable] = await Promise.all([
  readJson(new URL('comparison.json', evidenceDirectory)),
  readJson(new URL('incomplete.json', evidenceDirectory)),
]);
const example = exampleView(recorded, unavailable);
let selected;
if (reportPath) {
  try {
    selected = reportView(await readJson(reportPath));
  } catch (error) {
    const reason = error instanceof SyntaxError ? 'Invalid JSON.' : error.code ?? error.message;
    console.error(`Could not open the selected FixProof report. ${reason}`);
    process.exit(2);
  }
}

const [template, stylesheet] = await Promise.all([
  readFile(new URL('./cart.html', import.meta.url), 'utf8'),
  readFile(new URL('./cart.css', import.meta.url), 'utf8'),
]);

const resources = new Map();
for (const name of ['baseline', 'candidate']) {
  const script = await readFile(new URL(`./${name}.js`, import.meta.url), 'utf8');
  const version = createHash('sha256')
    .update(template).update('\0').update(stylesheet).update('\0').update(script)
    .digest('hex');
  const html = template.replaceAll('{{deployment}}', name).replaceAll('{{version}}', version);

  resources.set(`/${name}/`, { version, body: html, type: 'text/html; charset=utf-8' });
  resources.set(`/${name}/cart.css`, { version, body: stylesheet, type: 'text/css; charset=utf-8' });
  resources.set(`/${name}/cart.js`, { version, body: script, type: 'text/javascript; charset=utf-8' });
}

const previewFiles = [
  ['/', 'proof.html', 'text/html'],
  ['/proof.css', 'proof.css', 'text/css'],
  ['/proof.js', 'proof.js', 'text/javascript'],
];
await Promise.all(previewFiles.map(async ([route, filename, type]) => {
  const body = await readFile(new URL(`./${filename}`, import.meta.url), 'utf8');
  resources.set(route, { body, type: `${type}; charset=utf-8` });
}));
resources.set('/example/', resources.get('/'));

const jsonResource = (value) => ({ body: JSON.stringify(value), type: 'application/json; charset=utf-8' });
resources.set('/proof/report.json', jsonResource(selected ?? example));
resources.set('/proof/example.json', jsonResource(example));

for (const name of exampleImageNames) {
  const path = `browser/${name}`;
  const body = await readFile(new URL(path, evidenceDirectory));
  resources.set(`/proof/${path}`, { body, type: 'image/jpeg' });
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const pathname = new URL(request.url, 'http://localhost').pathname;
  const resource = resources.get(pathname);
  if (!resource) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page not found');
    return;
  }

  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': resource.type,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  if (resource.version) headers['X-FixProof-Version'] = resource.version;
  response.writeHead(200, headers).end(resource.body);
});
server.listen(port, host, () => {
  console.log(`FixProof preview http://${host}:${server.address().port}/`);
  for (const name of ['baseline', 'candidate']) {
    console.log(`${name} ${resources.get(`/${name}/`).version}`);
  }
});
