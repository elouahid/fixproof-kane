import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { objectiveFor } from './lib/objective.mjs';
import { compareVerdicts } from './lib/result.mjs';
import { projectFile, readSelectedSources } from './lib/source-selection.mjs';
import { parseSpec } from './lib/spec.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const sides = ['baseline', 'candidate'];
const verdicts = new Set(['pass', 'fail', 'incomplete']);
const digest = /^[a-f0-9]{64}$/i;
const runId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const sensitiveField = /password|passphrase|passcode|\botp\b|api[ _-]?key|access[ _-]?token|authorization|secret|username|e[ -]?mail|account[ _-]?id/i;

function display(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return 'Unavailable';
  return String(value)
    .replace(/https?:\/\/[^\s<>]+/gi, '[URL omitted]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email omitted]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [value omitted]')
    .replace(/\b(?:sk-[\w-]{6,}|gh[pousr]_[\w-]{6,}|github_pat_[\w-]{6,})\b/gi, '[credential omitted]')
    .replace(/\b(password|api[ _-]?key|token|secret)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1 [value omitted]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
    .replace(/[\\`*_[\]<>|]/g, '\\$&') || 'Unavailable';
}

function matchChecks(report, spec) {
  if (report?.schemaVersion !== 2 || report.caseSchemaVersion !== spec.schemaVersion ||
    typeof report.id !== 'string' || !runId.test(report.id) ||
    !report.finishedAt || !Number.isFinite(Date.parse(report.finishedAt)) ||
    !Array.isArray(report.checks) || report.checks.length !== spec.checks.length ||
    !sides.every((side) => report.targets?.[side] &&
      (report.targets[side].url === undefined || report.targets[side].url === spec[`${side}Url`]))) {
    throw new Error('Select a completed FixProof report whose case and targets match.');
  }

  const indexed = new Map(report.checks.map((check) => [check?.id, check]));
  const pairs = spec.checks.map((check) => {
    const result = indexed.get(check.id);
    if (!result || check.expected !== result.expected || sha256(objectiveFor(check)) !== result.objectiveSha256 ||
      (result.actionContract !== undefined && !isDeepStrictEqual(check.actionContract, result.actionContract)) ||
      !sides.every((side) => verdicts.has(result[side]?.verdict)) ||
      result.outcome !== compareVerdicts(result.baseline, result.candidate)) {
      throw new Error('The report checks and outcomes must match the selected case.');
    }
    return { check, result };
  });
  if (!pairs.some(({ result }) => ['fail', 'incomplete'].includes(result.candidate.verdict))) {
    throw new Error('Select a report with a failing or incomplete candidate check.');
  }
  return pairs;
}

function renderCheck({ check, result }) {
  const fields = Object.entries(check.observations);
  const redactedFields = fields.filter(([key, field]) => sensitiveField.test([key, field.label, field.read].join(' ')));
  const privateValues = redactedFields.flatMap(([key, field]) =>
    [field.equals, ...sides.map((side) => result[side].observations?.[key])]);
  const redact = (value) => typeof value === 'string' ? privateValues.reduce((message, secret) =>
    typeof secret === 'string' && secret.length ? message.replaceAll(secret, '[sensitive value omitted]') : message, value) : value;
  const lines = [`## ${check.id} · ${result.outcome}`, '', `Expected behavior · ${display(redact(check.expected))}`, '', 'Required action contract', ''];
  for (const action of check.actionContract) {
    const target = action.type === 'click' ? `${display(action.target.name)} (HTML ID ${display(action.target.id)})` : null;
    lines.push(`1. ${target ? `Click ${target}.` : 'Reload the same tested URL.'}`);
  }
  for (const side of sides) {
    const recorded = result[side];
    lines.push('', `### ${side === 'baseline' ? 'Baseline' : 'Candidate'} · ${recorded.verdict}`, '');
    for (const [key, field] of fields) {
      const hidden = redactedFields.some(([name]) => name === key);
      const observed = hidden ? '[sensitive value omitted]' : display(recorded.observations?.[key]);
      const expected = hidden ? '[sensitive value omitted]' : display(field.equals);
      lines.push(`- ${display(field.label ?? key)} · ${observed} (expected ${expected})`);
    }
    if (recorded.verdict === 'incomplete') lines.push(`- Incomplete reason · ${display(redact(recorded.reason))}`);
    if (recorded.evidence && typeof recorded.evidence.sha256 === 'string' && digest.test(recorded.evidence.sha256)) {
      lines.push(`- Kane evidence SHA-256 · \`${recorded.evidence.sha256}\``);
    }
  }
  return lines;
}

function renderSources(report, sources) {
  const evidence = report.candidateSource;
  const recorded = evidence?.stable === true && Array.isArray(evidence.files) ? evidence.files : [];
  return sources.map(({ path, sha256 }) => {
    const matches = recorded.filter((file) => file?.path === path);
    const old = matches.length === 1 && typeof matches[0].sha256 === 'string' && digest.test(matches[0].sha256)
      ? matches[0].sha256.toLowerCase() : null;
    const status = old === sha256 ? 'Matches the local source hashes captured before and after the run.'
      : old ? `Differs from the local source hashes captured before and after the run (\`${old}\`).` : 'Source state during the recorded run is unverified.';
    return `- \`${path}\` · current SHA-256 \`${sha256}\` · ${status}`;
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    report: { type: 'string' }, case: { type: 'string' }, source: { type: 'string', multiple: true },
  } });
  if (!values.report || !values.case || !values.source?.length || values.source.some((path) => !path)) {
    throw new Error('Usage: node repair-brief.mjs --report <path> --case <path> --source <path> [--source <path> ...]');
  }

  const selectedCase = await projectFile(root, values.case);
  const [caseBytes, reportBytes] = await Promise.all([readFile(selectedCase.file), readFile(values.report)]);
  const report = JSON.parse(reportBytes);
  if (report?.specSha256 !== sha256(caseBytes)) throw new Error('The selected case bytes do not match the report case SHA-256.');
  const spec = parseSpec(caseBytes.toString('utf8'));
  const checks = matchChecks(report, spec);
  const sources = await readSelectedSources(root, values.source);

  const hasFailure = checks.some(({ result }) => result.candidate.verdict === 'fail');
  const hasIncomplete = checks.some(({ result }) => result.candidate.verdict === 'incomplete');
  const task = hasFailure ? 'Review the recorded candidate failure and propose the smallest correction in the selected source.'
    : 'Resolve the incomplete checks and recover the missing evidence before proposing a source change.';
  const shellPath = (path) => `"${path.startsWith('-') ? `./${path}` : path}"`;
  const rerun = [`node compare.mjs ${shellPath(selectedCase.path)}`, ...sources.map(({ path }) => `--candidate-source ${shellPath(path)}`)].join(' ');
  const lines = [
    '# FixProof repair brief', '',
    `${task}${hasFailure && hasIncomplete ? ' Recover missing evidence for the incomplete checks before accounting for them in the correction.' : ''} Keep the case and its controls unchanged.`, '',
    `- Run ID · \`${report.id}\``,
    `- Case · \`${selectedCase.path}\` · SHA-256 \`${report.specSha256}\``,
    `- Recorded baseline build · ${display(report.targets.baseline.version)}`,
    `- Recorded candidate build · ${display(report.targets.candidate.version)}`, '',
    `Look up evidence in local run \`.fixproof/runs/${report.id}\` by check ID and side.`, '',
    '## Selected current candidate source', '',
    'These are local file references. The recorded build fingerprint comes from the report.', '',
    ...renderSources(report, sources), '',
    ...checks.flatMap((entry) => [...renderCheck(entry), '']),
    '## Rerun the unchanged case and controls', '',
    'Run from the FixProof project root.', '',
    '```sh', rerun, '```', '',
  ];
  process.stdout.write(lines.join('\n'));
}

main().catch((error) => {
  const message = error instanceof SyntaxError ? 'The selected case or report contains invalid JSON.'
    : error.code ? 'Could not read the selected files or arguments.' : error.message;
  console.error(`FixProof repair brief: ${message}`);
  process.exitCode = 2;
});
