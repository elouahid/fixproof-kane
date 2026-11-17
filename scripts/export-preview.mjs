import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRecordedDemo } from '../app/recorded-demo.mjs';

const app = new URL('../app/', import.meta.url);
const output = fileURLToPath(new URL('../dist/preview/', import.meta.url));
const { reports, images } = await loadRecordedDemo();
const files = new Map();

for (const [source, destination] of [
  ['proof.html', 'index.html'], ['proof.css', 'proof.css'], ['proof.js', 'proof.js'],
]) {
  files.set(destination, await readFile(new URL(source, app)));
}
for (const name of ['flawed', 'reviewed']) {
  files.set(`proof/${name}.json`, JSON.stringify({ ...reports[name], currentCarts: false }));
}
files.set('proof/report.json', files.get('proof/flawed.json'));
for (const [path, bytes] of images) {
  files.set(`proof/${path}`, bytes);
}

// A static host serves every file in the uploaded folder. Refuse to mix the
// export with extra files from another build or a manually added report.
async function checkExisting(directory, prefix = '') {
  if (!(await lstat(directory)).isDirectory()) throw new Error(`Expected a directory: ${directory}`);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isFile() && files.has(path)) continue;
    if (entry.isDirectory() && [...files.keys()].some((name) => name.startsWith(path + '/'))) {
      await checkExisting(join(directory, entry.name), path + '/');
      continue;
    }
    throw new Error(`Unexpected entry in dist/preview: ${path}. Move it before exporting.`);
  }
}

await mkdir(output, { recursive: true });
await checkExisting(output);
for (const [path, bytes] of files) {
  const destination = join(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
console.log('Saved both recorded comparisons to dist/preview/. Serve this folder with a static HTTP server.');
