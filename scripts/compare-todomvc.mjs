import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The target server must already be listening. The comparison owns all browser
// work and verdicts; this wrapper records the exit returned by its child process.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = ['compare.mjs', 'cases/todomvc-es5.json', '--candidate-source', 'targets/todomvc/candidate/view.js'];
const startedAt = new Date().toISOString();
const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
let stdout = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', text => {
  stdout += text;
  process.stdout.write(text);
});
const { code, signal } = await new Promise((done, reject) => {
  child.once('error', reject);
  child.once('close', (code, signal) => done({ code, signal }));
});
const finishedAt = new Date().toISOString();
const directory = /^Report directory: (.+)$/m.exec(stdout)?.[1].trim();
if (!directory || !/^[a-f0-9-]{36}$/.test(basename(directory)) ||
    resolve(directory) !== resolve(root, '.fixproof', 'runs', basename(directory))) {
  throw new Error('The comparison did not identify a local run directory. Its output is shown above.');
}
const bytes = await readFile(join(directory, 'report.json'));
const report = JSON.parse(bytes);
if (report.id !== basename(directory)) throw new Error('Run ID mismatch.');
const capture = {
  command: ['node', ...args], id: report.id, startedAt, finishedAt,
  comparisonExitCode: code, signal,
  reportSha256: createHash('sha256').update(bytes).digest('hex'),
  caseSha256: report.specSha256,
  provenance: 'Exit code from the Node child process that ran compare.mjs for this report.'
};
await writeFile(join(directory, 'process-capture.json'), JSON.stringify(capture, null, 2) + '\n', { flag: 'wx' });
process.exitCode = code ?? 2;
