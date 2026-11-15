import assert from 'node:assert/strict';
import test from 'node:test';
import { classify, compareVerdicts } from '../lib/result.mjs';

const check = { observations: { count: { equals: '2' } } };
const browser = (count) => ({ observations: { count }, source: 'fixture', actions: [] });
const successful = {
  exitCode: 0,
  end: { status: 'passed', result_code: 100 },
  validation: { valid: true },
  packPath: 'run.evidence',
  upload: { status: 'uploaded' },
  steps: [{ status: 'done' }],
};
const failed = {
  ...successful, exitCode: 1,
  end: { status: 'failed', result_code: 740, verdict: { confirmed: true } },
  steps: [{ status: 'failed' }],
};

test('a verified browser mismatch and a verified pass form a correction', () => {
  const red = classify(check, failed, browser('1'));
  const green = classify(check, successful, browser('2'));
  assert.equal(compareVerdicts(red, green), 'corrected');
  assert.equal(compareVerdicts(red, red), 'remained broken');
  assert.equal(compareVerdicts(green, red), 'regressed');
  assert.equal(compareVerdicts(green, green), 'passed in both versions');
});

test('a Kane pass without the sealed browser readings remains incomplete', () => {
  const missing = classify(check, successful, null);
  assert.equal(missing.category, 'evidence');
  assert.equal(compareVerdicts(missing, classify(check, successful, browser('2'))), 'incomplete');
});

test('an invalid pack or a reading that contradicts Kane blocks a verdict', () => {
  assert.equal(classify(check, { ...successful, validation: { valid: false } }, browser('2')).category, 'evidence');
  assert.equal(classify(check, successful, browser('1')).verdict, 'incomplete');
  assert.equal(classify(check, failed, browser('2')).verdict, 'incomplete');
});

test('early auth, browser startup, timeout and upload failures have separate causes', () => {
  assert.equal(classify(check, { exitCode: 2, status: 'authentication' }).category, 'authentication');
  assert.equal(classify(check, { exitCode: 2 }).category, 'infrastructure');
  assert.equal(classify(check, { exitCode: 3 }).category, 'execution');
  assert.equal(classify(check, { exitCode: 1, upload: { status: 'failed' } }).category, 'upload');
  const credits = classify(check, { exitCode: 1, end: { status: 'failed', result_code: 560 } });
  assert.equal(credits.verdict, 'incomplete');
  assert.equal(credits.reason, 'The Kane account has insufficient credits.');
});
