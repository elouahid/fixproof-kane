const sides = ['baseline', 'candidate'];
const outcomes = new Set(['corrected', 'remained broken', 'regressed', 'passed in both versions', 'incomplete']);
const verdicts = new Set(['pass', 'fail', 'incomplete']);

function text(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function timestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
    ? value : null;
}

function resultView(result, target, labels) {
  const entries = isRecord(result?.observations) ? Object.entries(result.observations) : [];
  const observations = entries.flatMap(([name, value]) => {
    if (typeof value !== 'string' && typeof value !== 'number') return [];
    return [{ label: text(labels?.[name]) ?? name, value: String(value) }];
  });
  const sha256 = result?.evidence?.sha256;
  return {
    verdict: verdicts.has(result?.verdict) ? result.verdict : 'pending',
    observations,
    version: text(result?.version),
    preflightVersion: text(target?.version),
    reason: text(result?.reason),
    evidenceSha256: typeof sha256 === 'string' && /^[a-f0-9]{64}$/i.test(sha256) ? sha256 : null,
  };
}

export function reportView(report) {
  if (typeof report?.id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(report.id) ||
      !text(report.title) || !Array.isArray(report.checks) || !report.checks.length || !isRecord(report.targets)) {
    throw new Error('Choose a FixProof comparison report.json.');
  }

  const checks = report.checks.map((check) => {
    if (!text(check?.id) || !text(check.expected) || !outcomes.has(check.outcome)) {
      throw new Error('The selected report has an invalid check.');
    }
    return {
      id: check.id,
      expected: check.expected,
      outcome: check.outcome,
      ...Object.fromEntries(sides.map((side) => [side, resultView(check[side], report.targets[side], check.observationLabels)])),
    };
  });
  return {
    kind: 'saved',
    id: report.id,
    title: report.title,
    startedAt: timestamp(report.startedAt),
    finishedAt: timestamp(report.finishedAt),
    checks,
  };
}

const exampleLabels = { fp_count_readout: 'Quantity', fp_total_readout: 'Cart total' };
const exampleScreenshots = {
  refresh: { baseline: 'baseline-refresh.jpg', candidate: 'candidate-refresh.jpg' },
  'live-total': { baseline: 'baseline-control.jpg', candidate: 'candidate-control.jpg' },
};

export const exampleImageNames = Object.values(exampleScreenshots).flatMap(Object.values);

export function exampleView(report, unavailable) {
  const view = reportView({
    ...report,
    checks: report.checks.map((check) => ({ ...check, observationLabels: exampleLabels })),
  });
  view.kind = 'example';
  view.recordedDate = '2026-11-15';
  view.incompleteExample = reportView(unavailable).checks[0].candidate.reason;
  for (const check of view.checks) {
    for (const side of sides) {
      check[side].screenshot = exampleScreenshots[check.id]?.[side];
    }
  }
  return view;
}
