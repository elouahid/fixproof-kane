import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { objectiveFor } from '../lib/objective.mjs';

const runCommand = promisify(execFile);
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const folder = await mkdtemp(join(tmpdir(), 'fixproof brief '));
  const files = [];
  const dirs = ['app', 'cases', 'lib'];
  t.after(async () => {
    for (const path of files) await unlink(join(folder, path));
    for (const path of dirs) await rmdir(join(folder, path));
    await rmdir(folder);
  });
  for (const dir of dirs) await mkdir(join(folder, dir));
  async function save(path, contents) {
    await writeFile(join(folder, path), contents);
    if (!files.includes(path)) files.push(path);
  }
  for (const path of ['repair-brief.mjs', 'lib/objective.mjs', 'lib/procedure.mjs', 'lib/result.mjs', 'lib/source-selection.mjs', 'lib/spec.mjs']) {
    await save(path, await readFile(new URL(`../${path}`, import.meta.url)));
  }

  const casePath = 'cases/cart case.json';
  const sourcePath = 'app/candidat é.js';
  const secondSource = 'app/helper.js';
  const spec = JSON.parse(await readFile(new URL('../cases/cart.json', import.meta.url), 'utf8'));
  spec.candidateUrl += '?token=private-case-url';
  spec.behavior.observations.account_email = { label: 'Account email', read: 'account email', equals: 'private@example.invalid' };
  const caseBytes = JSON.stringify(spec);
  const report = {
    schemaVersion: 2, caseSchemaVersion: 2, id: 'ba130132-f43a-49db-b230-b6db08b7954a',
    startedAt: '2026-11-15T20:35:00Z', finishedAt: '2026-11-15T20:35:15Z', specSha256: hash(caseBytes),
    account: { id: 'private-account-id' },
    targets: {
      baseline: { url: spec.baselineUrl, version: 'base-v1' },
      candidate: { url: spec.candidateUrl, version: 'candidate-v1' },
    },
    candidateSource: {
      stable: true,
      files: [
        { path: sourcePath, sha256: hash('old source') },
        { path: secondSource, sha256: hash('unchanged source') },
        { path: 'app/unselected.js', sha256: hash('unrelated code') },
      ],
    },
    checks: [spec.behavior, ...spec.controls].map((check) => ({
      id: check.id, expected: check.expected, objectiveSha256: hash(objectiveFor(check)),
      actionContract: check.actionContract,
      outcome: check.id === 'refresh' ? 'remained broken' : 'incomplete',
      baseline: {
        verdict: check.id === 'refresh' ? 'fail' : 'pass',
        observations: { fp_count_readout: check.id === 'refresh' ? '1' : '2', fp_total_readout: check.id === 'refresh' ? '$24.00' : '$48.00' },
      },
      candidate: check.id === 'refresh' ? {
        verdict: 'fail',
        observations: { fp_count_readout: '1', fp_total_readout: '$24.00', account_email: 'private@example.invalid', unrelated: 'unrelated observation' },
        evidence: { sha256: 'a'.repeat(64), path: 'C:/private/test-pack.evidence' },
        logDirectory: 'C:/private/logs',
      } : {
        verdict: 'incomplete', reason: 'Kane did not finish. Check https://example.invalid/?token=private-link and Bearer private-auth.',
      },
    })),
  };
  await save(casePath, caseBytes);
  await save(sourcePath, 'private-source-body');
  await save(secondSource, 'unchanged source');
  await save('app/unselected.js', 'unrelated code');
  await save('.env', 'private-config-value');

  async function run(...sourcePaths) {
    await save('report.json', JSON.stringify(report));
    return runCommand(process.execPath, ['repair-brief.mjs', '--report', 'report.json', '--case', casePath,
      ...sourcePaths.flatMap((path) => ['--source', path])], { cwd: folder, windowsHide: true });
  }
  return { report, sourcePath, secondSource, run };
}

test('repair brief includes proven results and only selected source hashes', async (t) => {
  const { report, sourcePath, secondSource, run } = await fixture(t);
  const { stdout } = await run(sourcePath, secondSource);
  for (const expected of [
    report.id, report.specSha256, 'base-v1', 'candidate-v1', 'Reset cart (HTML ID reset)',
    'Increase quantity (HTML ID increase)', 'Reload the same tested URL.', 'Quantity · 1 (expected 2)',
    'Cart total · $24.00 (expected $48.00)', 'live-total · incomplete', 'Kane did not finish.',
    'a'.repeat(64), sourcePath, secondSource, hash('private-source-body'),
    'Differs from the local source hashes captured before and after the run',
    'Matches the local source hashes captured before and after the run.',
    `node compare.mjs "cases/cart case.json" --candidate-source "${sourcePath}" --candidate-source "${secondSource}"`,
  ]) assert.ok(stdout.includes(expected), expected);
  for (const excluded of [
    'private-case-url', 'private-link', 'private-auth', 'private-account-id', 'private@example.invalid',
    'private-source-body', 'unrelated observation', 'unselected.js', 'test-pack.evidence', 'private/logs',
  ]) assert.ok(!stdout.includes(excluded), excluded);

  delete report.candidateSource;
  const unknown = await run(sourcePath);
  assert.match(unknown.stdout, /Source state during the recorded run is unverified/);
  assert.match(unknown.stdout, /Recover missing evidence for the incomplete checks/);
  report.checks[0].candidate.verdict = 'incomplete';
  report.checks[0].outcome = 'incomplete';
  const incomplete = await run(sourcePath);
  assert.match(incomplete.stdout, /recover the missing evidence before proposing a source change/);
});

test('repair brief refuses mismatched selection, contradictory checks and private paths', async (t) => {
  const { report, sourcePath, run } = await fixture(t);
  const digest = report.specSha256;
  report.specSha256 = '1'.repeat(64);
  await assert.rejects(run(sourcePath), /selected case bytes do not match/);
  report.specSha256 = digest;
  await assert.rejects(run('../external.js'), /within the FixProof project/);
  await assert.rejects(run('.env'), /outside credential/);
  await assert.rejects(run(sourcePath, `./${sourcePath}`), /each candidate source file once/);
  const expected = report.checks[0].expected;
  report.checks[0].expected = 'An unrelated expectation.';
  await assert.rejects(run(sourcePath), /report checks and outcomes must match/);
  report.checks[0].expected = expected;
  report.checks[0].candidate.verdict = 'pass';
  report.checks[0].outcome = 'corrected';
  report.checks[1].candidate.verdict = 'pass';
  report.checks[1].outcome = 'passed in both versions';
  await assert.rejects(run(sourcePath), /failing or incomplete candidate check/);
});
