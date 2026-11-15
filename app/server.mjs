import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.FIXPROOF_CART_PORT ?? 8741);
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

const imageTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const evidenceDirectory = new URL('../evidence/', import.meta.url);

async function loadProof(pathname) {
  const filename = pathname.slice('/proof/'.length);
  const image = /^browser\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(png|jpe?g|webp)$/.exec(filename);
  if (filename !== 'demo.json' && !image) return null;

  try {
    const data = await readFile(new URL('demo.json', evidenceDirectory), 'utf8');
    if (filename === 'demo.json') return { body: data, type: 'application/json; charset=utf-8' };

    const { baseline, candidate } = JSON.parse(data);
    if (filename !== baseline?.screenshot && filename !== candidate?.screenshot) return null;
    return { body: await readFile(new URL(filename, evidenceDirectory)), type: imageTypes[image[1]] };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const resource = pathname.startsWith('/proof/')
    ? await loadProof(pathname).catch(() => null)
    : resources.get(pathname);
  if (!resource) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page not found');
    return;
  }

  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': resource.type,
  };
  if (resource.version) headers['X-FixProof-Version'] = resource.version;
  response.writeHead(200, headers).end(resource.body);
}).listen(port, host, () => {
  console.log(`FixProof preview http://${host}:${port}/`);
  for (const name of ['baseline', 'candidate']) {
    console.log(`${name} ${resources.get(`/${name}/`).version}`);
  }
});
