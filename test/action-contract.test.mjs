import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { inspectBrowserActions } from '../lib/assertions.mjs';
import { classify, compareVerdicts } from '../lib/result.mjs';
import { parseSpec } from '../lib/spec.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [current, historical, baseline, candidate] = await Promise.all([
  read('cases/cart.json'), read('cases/cart-v1.json'), read('app/baseline.js'), read('app/candidate.js'),
]);
const spec = parseSpec(current);
const refresh = spec.behavior;
const control = spec.controls[0];

function runCart(side, clicks, reload, initialQuantity) {
  const storage = new Map();
  if (initialQuantity) storage.set(`fixproof.cart.${side}`, String(initialQuantity));
  const load = () => {
    const fields = Object.fromEntries(['quantity', 'cart-total', 'reset', 'increase', 'decrease'].map((id) => [`#${id}`, {
      value: '', disabled: false,
      addEventListener(_, callback) { this.click = callback; },
    }]));
    vm.runInNewContext(side === 'baseline' ? baseline : candidate, {
      document: { body: { dataset: { deployment: side } }, querySelector: (selector) => fields[selector] },
      localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    });
    return fields;
  };
  const readings = (fields) => ({
    quantity: String(fields['#quantity'].value), total: fields['#cart-total'].value,
  });
  const before = load();
  for (const target of clicks) {
    assert.equal(before[target].disabled, false);
    before[target].click();
  }
  const immediate = readings(before);
  return { immediate, observed: reload ? readings(load()) : immediate };
}

function authoredRecords(check, url, clicks, reload, observed) {
  const values = { fp_count_readout: observed.quantity, fp_total_readout: observed.total };
  const assertions = Object.entries(values).map(([key, value]) => ({
    operator: 'equals', expected: check.observations[key].equals,
    extracted_value: `{{${key}}}`, variable_refs: { [`{{${key}}}`]: value },
    passed: value === check.observations[key].equals,
  }));
  const passed = assertions.every((assertion) => assertion.passed);
  const clickRecords = clicks.map((selector, index) => ({
    action_type: 'click', step: index + 2, status: 'success', selectors: [{ selector }],
  }));
  const entries = [
    { action_type: 'navigate', step: 1, status: 'success', action_params: { url } }, ...clickRecords,
  ];
  if (reload) entries.push({ action_type: 'navigate', step: entries.length + 1, status: 'success', action_params: { url } });

  return {
    status: passed ? 'passed' : 'failed',
    runnerLog: clickRecords.map(({ step, selectors }) => [
      `[BrowserRunner] Starting-Node: dom_action Step: ${step}`,
      `[BrowserRunner] DOM Action: Clicked via DOM locator: ${selectors[0].selector} — success`,
    ].join('\n')).join('\n'),
    actions: [
      ...entries,
      ...Object.entries(values).map(([key, value]) => ({
        action_type: 'analyze', status: 'success', output_variable: key, output_value: value,
      })),
      { action_type: 'assert', status: passed ? 'success' : 'failed',
        action_params: { assertion_tree: { is_final: true, passed, sub_results: assertions } } },
    ],
  };
}

function evaluate({ side = 'baseline', check = refresh, clicks, reload = true, initialQuantity, edit }) {
  const activity = runCart(side, clicks, reload, initialQuantity);
  const url = spec[`${side}Url`];
  const records = authoredRecords(check, url, clicks, reload, activity.observed);
  edit?.(records);
  const proof = inspectBrowserActions({ ...records, check, url });
  const passed = records.status === 'passed';
  const result = classify(check, {
    exitCode: passed ? 0 : 1, end: { status: records.status, result_code: passed ? 100 : 710 },
    validation: { valid: true }, packPath: 'offline-authored-fixture.evidence',
    upload: { status: 'uploaded' }, steps: [{ status: passed ? 'done' : 'failed' }],
  }, proof);
  return { ...activity, asserted: records.status, verdict: result.verdict, ...(result.reason ? { reason: result.reason } : {}) };
}

const required = ['#reset', '#increase'];

test('offline cart and authored traces reproduce the real procedure and reject false greens', (t) => {
  const cases = [
    ['baselineOneIncrease', { clicks: required }, 'fail', '1', '$24.00'],
    ['candidateOneIncrease', { side: 'candidate', clicks: required }, 'pass', '2', '$48.00'],
    ['baselineTwoIncreases', { clicks: [...required, '#increase'] }, 'incomplete', '2', '$48.00'],
    ['missingReset', { side: 'candidate', clicks: ['#increase'] }, 'incomplete', '2', '$48.00'],
    ['missingReload', { clicks: required, reload: false }, 'incomplete', '2', '$48.00'],
    ['wrongResetTarget', { side: 'candidate', clicks: ['#decrease', '#increase'], initialQuantity: 2 }, 'incomplete', '2', '$48.00'],
    ['baselineLiveControl', { check: control, clicks: required, reload: false }, 'pass', '2', '$48.00'],
    ['candidateLiveControl', { side: 'candidate', check: control, clicks: required, reload: false }, 'pass', '2', '$48.00'],
  ];
  const results = {};
  for (const [name, input, verdict, quantity, total] of cases) {
    const actual = evaluate(input);
    assert.equal(actual.verdict, verdict, name);
    assert.deepEqual(actual.observed, { quantity, total }, name);
    results[name] = actual;
  }
  assert.equal(compareVerdicts(results.baselineOneIncrease, results.baselineTwoIncreases), 'incomplete');
  assert.equal(compareVerdicts(results.baselineOneIncrease, results.candidateOneIncrease), 'corrected');
  t.diagnostic(`Offline action-contract observations ${JSON.stringify(results)}`);
});

test('a green readout cannot excuse ambiguous or mismatched execution records', () => {
  const edits = [
    (record) => { record.runnerLog = ''; },
    (record) => { record.runnerLog = record.runnerLog.replace('#increase', '#decrease'); },
    (record) => { record.runnerLog = record.runnerLog.replace('Step: 3', 'Step: 2'); },
    (record) => { record.actions[2].selectors.push({ selector: '#decrease' }); },
    (record) => { record.actions[2].frame_info = { index: 1 }; },
    (record) => { record.actions[2].status = 'failed'; },
    (record) => { [record.actions[1], record.actions[2]] = [record.actions[2], record.actions[1]]; },
    (record) => { record.actions[3].action_params.url += '?other-page'; },
    (record) => { record.actions.push({ action_type: 'click', step: 12, status: 'success' }); },
  ];
  for (const edit of edits) {
    const result = evaluate({ side: 'candidate', clicks: required, edit });
    assert.equal(result.asserted, 'passed');
    assert.equal(result.verdict, 'incomplete');
  }
});

test('case schema 2 protects the unchanged business expectations with a required contract', () => {
  const old = JSON.parse(historical);
  assert.throws(() => parseSpec(historical), /version 2/);
  for (const [index, check] of spec.checks.entries()) {
    const previous = [old.behavior, ...old.controls][index];
    assert.equal(check.actions, previous.actions);
    assert.equal(check.expected, previous.expected);
    assert.deepEqual(Object.fromEntries(Object.entries(check.observations).map(([key, { read, equals }]) => [key, { read, equals }])), previous.observations);
  }
  const invalid = JSON.parse(current);
  invalid.behavior.actionContract = [{ type: 'reload' }];
  assert.throws(() => parseSpec(JSON.stringify(invalid)), /ordered action contract/);
});
