import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('a selected report is projected without exposing its files or account metadata', { timeout: 15000 }, async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'fixproof preview '));
  const file = join(folder, 'saved report.json');
  const id = 'b1d25088-aa22-436d-8ee4-de13bc544af0';
  const startedAt = '2026-11-15T21:00:01.135Z';
  const finishedAt = '2026-11-15T21:00:32.135Z';
  const report = {
    schemaVersion: 2,
    id,
    title: 'Saved comparison <img src="https://example.invalid/test">',
    startedAt,
    finishedAt,
    account: { email: 'private@example.invalid' },
    targets: {
      baseline: { version: 'build-1', url: 'https://example.invalid/?token=private-token' },
      candidate: { version: 'build-2' },
    },
    checks: [{
      id: 'save',
      expected: 'The change persists.',
      outcome: 'incomplete',
      observationLabels: { count: 'Quantity' },
      baseline: { verdict: 'fail', version: 'build-1', observations: { count: 1 } },
      candidate: {
        verdict: 'incomplete',
        reason: 'Browser action did not match the case contract.',
        logDirectory: 'private-logs',
        evidence: { path: 'secret-pack.evidence', sha256: 'a'.repeat(64) },
      },
    }],
  };
  await writeFile(file, JSON.stringify(report));
  const script = fileURLToPath(new URL('../app/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, '--report', file], {
    env: { ...process.env, FIXPROOF_CART_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const exit = once(child, 'exit');
  t.after(async () => {
    child.kill();
    await exit;
    await unlink(file);
    await rmdir(folder);
  });

  const address = await new Promise((resolve, reject) => {
    let output = '';
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const url = output.match(/FixProof preview (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (url) resolve(url[1]);
    });
    child.once('error', reject);
    child.once('exit', () => reject(new Error(output)));
  });

  const response = await fetch(new URL('/proof/report.json?file=private-logs', address));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  const body = await response.text();
  assert.doesNotMatch(body, /private@example|private-token|private-logs|secret-pack\.evidence/);
  const view = JSON.parse(body);
  assert.equal(view.kind, 'saved');
  assert.equal(view.id, id);
  assert.equal(view.title, report.title);
  assert.equal(view.startedAt, startedAt);
  assert.equal(view.finishedAt, finishedAt);
  assert.equal(view.checks[0].expected, 'The change persists.');
  assert.equal(view.checks[0].outcome, 'incomplete');
  assert.deepEqual(view.checks[0].baseline.observations, [{ label: 'Quantity', value: '1' }]);
  assert.equal(view.checks[0].baseline.version, 'build-1');
  assert.equal(view.checks[0].candidate.preflightVersion, 'build-2');
  assert.equal(view.checks[0].candidate.reason, report.checks[0].candidate.reason);
  assert.equal(view.checks[0].candidate.evidenceSha256, 'a'.repeat(64));
  assert.equal((await fetch(new URL('/proof/secret-pack.evidence', address))).status, 404);
  assert.equal((await fetch(new URL('/proof/browser/../../.git/config', address))).status, 404);

  const example = await fetch(new URL('/proof/example.json', address)).then((reply) => reply.json());
  assert.equal(example.kind, 'example');
  assert.notEqual(example.id, view.id);
  assert.equal(example.checks[0].outcome, 'corrected');
  assert.equal((await fetch(new URL('/example/', address))).status, 200);
  const screenshot = await fetch(new URL('/proof/browser/baseline-refresh.jpg', address), { method: 'HEAD' });
  assert.equal(screenshot.status, 200);
  assert.equal(screenshot.headers.get('content-type'), 'image/jpeg');
});
