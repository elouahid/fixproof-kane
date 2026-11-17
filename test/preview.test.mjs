import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRecordedDemo } from '../app/recorded-demo.mjs';

async function startServer(t, args = []) {
  const script = fileURLToPath(new URL('../app/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [script, ...args], {
    env: { ...process.env, FIXPROOF_CART_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const exit = once(child, 'exit');
  t.after(async () => { child.kill(); await exit; });
  return new Promise((resolve, reject) => {
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
}

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
  t.after(async () => {
    await unlink(file);
    await rmdir(folder);
  });
  const address = await startServer(t, ['--report', file]);

  const response = await fetch(new URL('/proof/report.json?file=private-logs', address));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  const body = await response.text();
  assert.doesNotMatch(body, /private@example|private-token|private-logs|secret-pack\.evidence/);
  const view = JSON.parse(body);
  assert.equal(view.kind, 'saved');
  assert.equal(view.comparisonExit, null);
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
  assert.equal(example.comparisonExit, null);
  assert.notEqual(example.id, view.id);
  assert.equal(example.checks[0].outcome, 'corrected');
  const exampleShell = await fetch(new URL('/example/', address));
  assert.equal(exampleShell.status, 200);
  assert.match(await exampleShell.text(), /data-entry="example"/);
  const screenshot = await fetch(new URL('/proof/browser/baseline-refresh.jpg', address), { method: 'HEAD' });
  assert.equal(screenshot.status, 200);
  assert.equal(screenshot.headers.get('content-type'), 'image/jpeg');
});

const evidence = new URL('../evidence/control-regression/', import.meta.url);

test('default preview opens the flawed recording and serves the reviewed recording and their evidence', async (t) => {
  const address = await startServer(t);
  assert.match(await fetch(address).then((reply) => reply.text()), /data-entry="report"/);
  const defaultReport = await fetch(new URL('proof/report.json', address)).then((reply) => reply.json());
  assert.equal(defaultReport.recording, 'flawed');
  for (const [name, exitCode] of [['flawed', 1], ['reviewed', 0]]) {
    const saved = JSON.parse(await readFile(new URL(name + '.json', evidence)));
    const view = await fetch(new URL('proof/' + name + '.json', address)).then((reply) => reply.json());
    assert.equal(view.id, saved.id);
    assert.equal(view.recording, name);
    assert.equal(view.currentCarts, true);
    assert.deepEqual(view.comparisonExit, {
      code: exitCode, provenance: saved.comparisonExitProvenance, captureSha256: saved.executionCaptureSha256,
    });
    if (name === 'flawed') assert.deepEqual(defaultReport, view);
    for (const [index, check] of view.checks.entries()) {
      assert.equal(check.outcome, saved.checks[index].outcome);
      for (const side of ['baseline', 'candidate']) {
        const image = await fetch(new URL('proof/' + check[side].screenshot, address));
        assert.equal(image.headers.get('content-type'), 'image/jpeg');
        const sha256 = createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex');
        assert.equal(sha256, saved.checks[index][side].screenshot.sha256);
      }
    }
  }
});

test('recorded subprocess exits follow the exact report bytes, including incomplete attempts', async () => {
  const demo = await loadRecordedDemo();
  const manifest = JSON.parse(await readFile(new URL('manifest.json', evidence)));
  for (const attempt of manifest.attempts) {
    const bytes = await readFile(new URL(attempt.summary, evidence));
    const exact = await demo.projectReport(bytes);
    assert.equal(exact.comparisonExit.code, attempt.capturedComparisonExitCode);
    assert.equal(exact.comparisonExit.captureSha256, attempt.executionCaptureSha256);
    const changed = JSON.parse(bytes);
    changed.title += ' (edited)';
    const modified = await demo.projectReport(Buffer.from(JSON.stringify(changed)));
    assert.equal(modified.comparisonExit, null);
    assert.equal(modified.recording, null);
    assert.equal(modified.checks[0].candidate.screenshot, undefined);
  }
});
