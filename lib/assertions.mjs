import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resolveKaneRoot } from './kane.mjs';
import { nonMutating, verifyActionContract } from './procedure.mjs';

const browserLog = /^tests\/[^/]+\/logs\/0-(?:actions\.ndjson|run\.log)$/;
const maxPackSize = 64 * 1024 * 1024;
const maxLogSize = 4 * 1024 * 1024;

function observedText(value) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : null;
}

function sameLocator(left, right) {
  const locators = left?.action_params?.locators;
  return Array.isArray(locators) && locators.length > 0 && JSON.stringify(locators) === JSON.stringify(right?.action_params?.locators);
}

function readout(readouts, name) {
  return readouts.findLast((action) => action.output_variable === name);
}

function matchesAssertion(assertion, expected, observed, name, namedReadout, readouts) {
  if (assertion.operator !== 'equals' || observedText(assertion.expected) !== expected ||
      assertion.passed !== (observed === expected)) return false;

  const refs = assertion.variable_refs ?? {};
  const reference = assertion.extracted_value;
  const actual = Object.hasOwn(refs, reference) ? refs[reference] : reference;
  if (observedText(actual) !== observed) return false;
  const varKey = `{{${name}}}`;
  if (reference === varKey || observedText(refs[varKey]) === observed) return true;

  // Kane may use a separate assertion read of the same rendered element.
  const assertionRead = readout(readouts, assertion.store_key);
  return observedText(assertionRead?.output_value) === observed && sameLocator(namedReadout, assertionRead);
}

export function inspectBrowserActions({ actions, runnerLog, check, url, status }) {
  const procedure = verifyActionContract(actions, runnerLog, check.actionContract, url);
  if (procedure.issue) return { procedureIssue: procedure.issue };
  const passed = status === 'passed';
  const terminal = actions.findLastIndex((action) => action.action_type === 'assert');
  if (terminal < 0) return null;
  const final = actions[terminal];
  const tree = final.action_params?.assertion_tree;
  if (!Array.isArray(tree?.sub_results) || tree.passed !== passed || final.status !== (passed ? 'success' : 'failed') ||
    (passed && tree.is_final !== true) || actions.slice(terminal + 1).some((action) => !nonMutating.has(action.action_type))) return null;

  const prior = actions.slice(0, terminal);
  const lastMutation = prior.findLastIndex((action) => !nonMutating.has(action.action_type));
  const readouts = prior.slice(lastMutation + 1).filter((action) => action.action_type === 'analyze' && action.status === 'success');
  const observations = {};
  const matched = new Set();
  for (const [name, field] of Object.entries(check.observations)) {
    const namedReadout = readout(readouts, name);
    const observed = observedText(namedReadout?.output_value);
    if (!observed) return null;
    const assertions = tree.sub_results.filter((assertion) => matchesAssertion(assertion, field.equals, observed, name, namedReadout, readouts));
    if (assertions.length > 1 || (passed && assertions.length === 0) || matched.has(assertions[0])) return null;
    if (assertions.length === 1) matched.add(assertions[0]);
    observations[name] = observed;
  }
  const failedAssertions = tree.sub_results.filter((assertion) => assertion.passed === false);
  if (!passed && (failedAssertions.length === 0 || failedAssertions.some((assertion) => !matched.has(assertion)))) return null;

  const allMatch = Object.entries(observations).every(([name, observed]) => observed === check.observations[name].equals);
  if (allMatch !== passed) return null;
  return {
    observations,
    procedure: procedure.verified,
    source: 'sealed browser action records',
    actions: actions.slice(0, terminal + 1).map((action) => ({ type: action.action_type, status: action.status })),
  };
}

export async function readPackObservations({ packPath, validation, check, url, status }) {
  if (!packPath || validation?.valid !== true || !['passed', 'failed'].includes(status)) return null;
  try {
    const size = (await stat(packPath)).size;
    const root = resolveKaneRoot();
    if (!root || size > maxPackSize) return null;
    const { unzipSync } = createRequire(resolve(root, 'package.json'))('fflate');
    const members = unzipSync(await readFile(packPath), {
      filter: ({ name, originalSize }) => browserLog.test(name) && originalSize <= maxLogSize,
    });
    const paths = Object.keys(members);
    const path = paths.find((name) => name.endsWith('/0-actions.ndjson'));
    const runnerPath = path?.replace(/0-actions\.ndjson$/, '0-run.log');
    if (paths.length !== 2 || !runnerPath || !Object.hasOwn(members, runnerPath)) return null;
    const actions = Buffer.from(members[path]).toString('utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    return inspectBrowserActions({ actions, runnerLog: Buffer.from(members[runnerPath]).toString('utf8'), check, url, status });
  } catch {
    return null;
  }
}
