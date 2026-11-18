import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isDigest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

async function optionalFile(path, maxSize) {
  try {
    const stat = await lstat(path);
    if (stat.isFile() && stat.size <= maxSize) return await readFile(path);
  } catch {
    // An absent or unreadable optional artifact leaves the report available.
  }
  return null;
}

async function jsonArtifact(path) {
  const bytes = await optionalFile(path, 256 * 1024);
  if (!bytes) return null;
  try {
    return { data: JSON.parse(bytes), sha256: digest(bytes) };
  } catch {
    return null;
  }
}

export async function attachReportArtifacts(directory, bytes, report, view) {
  const hash = digest(bytes);
  const [receipt, screenshots] = await Promise.all([
    jsonArtifact(join(directory, 'process-capture.json')),
    jsonArtifact(join(directory, 'screenshots.json')),
  ]);
  const capture = receipt?.data;
  if (capture?.id === report.id && isDigest(report.specSha256) && capture.caseSha256 === report.specSha256 &&
      capture.reportSha256 === hash && capture.signal === null && [0, 1, 2].includes(capture.comparisonExitCode)) {
    view.comparisonExit = {
      code: capture.comparisonExitCode,
      provenance: 'Exit code recorded by the comparison wrapper. The receipt matches this report’s bytes, run ID and frozen case digest.',
      captureSha256: receipt.sha256,
    };
  }

  const images = new Map();
  const manifest = screenshots?.data;
  if (manifest?.reportSha256 !== hash || !Array.isArray(manifest.images)) return images;
  for (const check of view.checks) {
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(check.id)) continue;
    for (const side of ['baseline', 'candidate']) {
      const file = `${side}-${check.id}.jpg`;
      const entries = manifest.images.filter((entry) => entry?.side === side && entry.checkId === check.id);
      if (entries.length !== 1 || entries[0].file !== file || !isDigest(entries[0].sha256)) continue;
      const image = await optionalFile(join(directory, file), 16 * 1024 * 1024);
      if (!image || image[0] !== 0xff || image[1] !== 0xd8 || digest(image) !== entries[0].sha256) continue;
      const route = `selected/${file}`;
      check[side].screenshot = route;
      images.set(route, image);
    }
  }
  return images;
}
