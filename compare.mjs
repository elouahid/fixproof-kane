import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPackObservations } from './lib/assertions.mjs';
import { invokeKane } from './lib/kane.mjs';
import { objectiveFor } from './lib/objective.mjs';
import { classify, compareVerdicts } from './lib/result.mjs';
import { parseSpec } from './lib/spec.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const hash = (contents) => createHash('sha256').update(contents).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function readVersion(url, header) {
  const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) });
  if (response.status === 401 || response.status === 403) {
    return { category: 'authentication', reason: `Start URL returned HTTP ${response.status}.` };
  }
  if (!response.ok) return { category: 'infrastructure', reason: `Start URL returned HTTP ${response.status}.` };
  const version = response.headers.get(header);
  if (!version) return { category: 'evidence', reason: `Start URL did not identify its build via ${header}.` };
  return { version };
}

async function probe(url, header) {
  try {
    return await readVersion(url, header);
  } catch (error) {
    const code = error.cause?.code ?? error.name;
    return { category: 'infrastructure', reason: `Could not reach the start URL (${code}).` };
  }
}

function skipped(probeResult) {
  return { verdict: 'incomplete', category: probeResult.category, reason: probeResult.reason };
}

async function runCheck({ side, check, spec, initial, resultDir, runId }) {
  const url = spec[`${side}Url`];
  const outputDir = join(resultDir, side, check.id);
  const objective = objectiveFor(check, url);
  console.log(`Running ${side} / ${check.id} with Kane …`);
  const run = await invokeKane({ objective, url, outputDir, name: `fixproof-${runId}-${side}-${check.id}`, timeout: 180 });
  const finalVersion = await probe(url, spec.versionHeader);
  const browserEvidence = await readPackObservations({
    packPath: run.packPath, validation: run.validation, check, url, status: run.end?.status,
  });
  let result = classify(check, run, browserEvidence);
  if (initial.version !== finalVersion.version) {
    result = { ...result, verdict: 'incomplete', category: 'evidence', reason: 'The tested version could not be confirmed after the browser run.' };
  }
  const evidence = run.packPath && run.validation?.valid ? {
    path: relative(resultDir, run.packPath).replaceAll('\\', '/'),
    sha256: hash(await readFile(run.packPath)),
  } : null;
  return {
    ...result,
    version: initial.version,
    kaneVersion: run.stream?.cli_version ?? null,
    kaneCredits: run.end?.credits_consumed ?? run.end?.credits ?? null,
    evidence,
    upload: run.upload?.status ?? 'unknown',
    logDirectory: relative(resultDir, outputDir).replaceAll('\\', '/'),
  };
}

function markdown(report) {
  const observations = (side) => Object.entries(side?.observations ?? {})
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key.replaceAll('_', ' ')} = ${value}`).join(', ') || '—';
  const lines = [`# ${report.title}`, '', `Run ${report.id}`, '', `Started ${report.startedAt}`, ''];
  for (const side of ['baseline', 'candidate']) {
    const target = report.targets[side];
    lines.push(`- ${side} ${target.url} · ${target.version ?? 'build unavailable'}`);
  }
  for (const check of report.checks) {
    lines.push('', `## ${check.id} · ${check.outcome}`, '', check.expected, '',
      '| Version | Verdict | Browser observations | Evidence |', '| --- | --- | --- | --- |');
    for (const side of ['baseline', 'candidate']) {
      const result = check[side];
      const evidence = result?.evidence ? `[Validated Kane pack](${result.evidence.path})` : '—';
      lines.push(`| ${side} | ${result?.verdict ?? 'pending'} | ${observations(result).replaceAll('|', '\\|')} | ${evidence} |`);
    }
    for (const side of ['baseline', 'candidate']) {
      const result = check[side];
      if (result?.reason) lines.push('', `**${side} / ${result.category}** · ${result.reason}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const [casePath, mode, ...extra] = process.argv.slice(2);
  if (extra.length || (mode && mode !== '--baseline')) throw new Error('Usage: node compare.mjs [case.json] [--baseline]');
  const source = await readFile(casePath ? resolve(casePath) : join(root, 'cases', 'cart.json'), 'utf8');
  const spec = parseSpec(source);
  const id = randomUUID();
  const resultDir = join(root, '.fixproof', 'runs', id);
  await mkdir(resultDir, { recursive: true });
  await writeFile(join(resultDir, 'case.json'), source, { flag: 'wx' });
  const sides = mode ? ['baseline'] : ['baseline', 'candidate'];
  const targets = {};
  for (const side of ['baseline', 'candidate']) {
    targets[side] = { url: spec[`${side}Url`], ...await probe(spec[`${side}Url`], spec.versionHeader) };
  }
  const report = {
    schemaVersion: 2, caseSchemaVersion: spec.schemaVersion,
    id, title: spec.title, startedAt: new Date().toISOString(), finishedAt: null, specSha256: hash(source), targets,
    checks: spec.checks.map((check) => ({
      id: check.id, expected: check.expected, objectiveSha256: hash(objectiveFor(check)), outcome: 'incomplete',
      observationLabels: Object.fromEntries(Object.entries(check.observations).map(([key, field]) => [key, field.label ?? key])),
    })),
  };
  const save = () => Promise.all([
    writeFile(join(resultDir, 'report.json'), json(report)),
    writeFile(join(resultDir, 'report.md'), markdown(report)),
  ]);

  console.log(`Report directory: ${resultDir}`);
  const invalidTarget = sides.find((side) => !targets[side].version);
  for (const side of sides) {
    for (const [index, check] of spec.checks.entries()) {
      const initial = targets[side];
      const result = invalidTarget
        ? skipped(initial.version ? { category: 'execution', reason: `Browser run skipped because ${invalidTarget} preflight failed.` } : initial)
        : await runCheck({ side, check, spec, initial, resultDir, runId: id.slice(0, 8) });
      report.checks[index][side] = result;
      report.checks[index].outcome = compareVerdicts(report.checks[index].baseline, report.checks[index].candidate);
      console.log(`${side} / ${check.id} · ${result.verdict}${result.reason ? ` · ${result.reason}` : ''}`);
      await save();
    }
  }
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(`Read ${join(resultDir, 'report.md')}`);
  if (mode) process.exitCode = report.checks.some((check) => check.baseline?.verdict === 'incomplete') ? 2 : 0;
  else if (report.checks.some((check) => check.outcome === 'incomplete')) process.exitCode = 2;
  else if (report.checks.some((check) => check.candidate.verdict === 'fail')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FixProof: ${error.message}`);
  process.exitCode = 2;
});
