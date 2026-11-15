const assertionFailures = new Set([710, 720]);

const outcomeByVerdicts = {
  'fail:pass': 'corrected',
  'fail:fail': 'remained broken',
  'pass:fail': 'regressed',
  'pass:pass': 'passed in both versions',
};

export function compareVerdicts(baseline, candidate) {
  return outcomeByVerdicts[`${baseline?.verdict}:${candidate?.verdict}`] ?? 'incomplete';
}

export function classify(check, run, browserEvidence) {
  const end = run.end;
  const observations = browserEvidence?.observations ?? {};
  const result = {
    observations, browserActions: browserEvidence?.actions ?? [], observationSource: browserEvidence?.source ?? null,
    exitCode: run.exitCode, kaneCode: end?.result_code ?? null,
  };
  const incomplete = (category, reason) => ({ ...result, verdict: 'incomplete', category, reason });

  if (run.timedOut || run.exitCode === 3 || end?.result_code === 530) {
    return incomplete('execution', 'Kane timed out or was cancelled.');
  }
  if (run.status === 'authentication' || [550, 660].includes(end?.result_code)) {
    return incomplete('authentication', 'Kane reported missing or invalid authentication.');
  }
  if (end?.result_code === 560) {
    return incomplete('infrastructure', 'The Kane account has insufficient credits.');
  }
  if (run.launchError || run.exitCode === 2 || end?.result_code === 430 ||
      (end?.result_code >= 500 && end.result_code < 700)) {
    return incomplete('infrastructure', 'Kane could not start or continue the browser run.');
  }
  if (run.upload?.status === 'failed') {
    return incomplete('upload', 'Kane reported an upload failure.');
  }
  if (!end) return incomplete('execution', 'Kane did not emit a final result.');

  const passed = run.exitCode === 0 && end.status === 'passed' && end.result_code === 100;
  const confirmedBug = end.result_code === 740 && end.verdict?.confirmed === true;
  const failed = run.exitCode === 1 && end.status === 'failed' && (assertionFailures.has(end.result_code) || confirmedBug);
  if ((passed || failed) && run.upload?.status !== 'uploaded') {
    return incomplete('upload', 'Kane did not confirm upload to Test Manager.');
  }
  if (!run.packPath || !run.validation?.valid) {
    return incomplete('evidence', 'The sealed Kane evidence is missing or failed validation.');
  }
  if (!browserEvidence) {
    return incomplete('evidence', 'The sealed browser actions and readouts do not substantiate all required observations.');
  }

  const matches = Object.entries(check.observations).every(([key, field]) => observations[key] === field.equals);
  if (passed && matches) return { ...result, verdict: 'pass', category: 'application' };
  if (failed && !matches && run.steps.some((step) => step.status === 'failed')) {
    return { ...result, verdict: 'fail', category: 'application' };
  }
  return incomplete('execution', 'The Kane verdict and required observations do not establish this assertion.');
}
