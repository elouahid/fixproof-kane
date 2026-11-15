import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

function relativeFile(root, file) {
  const path = relative(root, file);
  if (!path || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) {
    throw new Error('Select files within the FixProof project.');
  }
  return path.split(sep).join('/');
}

export async function projectFile(root, input, { source = false } = {}) {
  const project = await realpath(root);
  const requested = resolve(project, input);
  const selected = relativeFile(project, requested);
  const file = await realpath(requested);
  const path = relativeFile(project, file);
  if (source && [selected, path].some((name) => name.split('/').some((part) =>
    /^(?:\.git|\.fixproof|\.testmuai|node_modules|\.env(?:\..*)?)$/i.test(part)))) {
    throw new Error('Select candidate source files outside credential, dependency and private run directories.');
  }
  if (!/^[\p{L}\p{M}\p{N}._\-/ ]+$/u.test(path) || !/^[\p{L}\p{M}\p{N}._\-/ ]+$/u.test(selected)) {
    throw new Error('Selected project paths must use letters, digits, spaces, dots, dashes and underscores.');
  }
  if (!(await stat(file)).isFile()) throw new Error('Select individual files.');
  return { file, path };
}

export async function readSelectedSources(root, selectedPaths) {
  const sources = [];
  const seen = new Set();
  for (const input of selectedPaths) {
    const { file, path } = await projectFile(root, input, { source: true });
    if (seen.has(path)) throw new Error('Select each candidate source file once.');
    seen.add(path);
    sources.push({ path, sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
  }
  return sources;
}
