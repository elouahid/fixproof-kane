import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { reportView } from './report-view.mjs';

const directory = new URL('../evidence/control-regression/', import.meta.url);

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function capturedExit(report, attempt) {
  const { comparisonExitCode: code, comparisonExitProvenance: provenance, executionCaptureSha256: captureSha256 } = report;
  if (![0, 1, 2].includes(code) || typeof provenance !== 'string' || !provenance.trim() ||
      !/^[a-f0-9]{64}$/.test(captureSha256)) return null;
  if (!attempt || report.id !== attempt.id || report.originalReportSha256 !== attempt.originalReportSha256 ||
      code !== attempt.capturedComparisonExitCode || captureSha256 !== attempt.executionCaptureSha256) return null;
  return { code, provenance, captureSha256 };
}

export async function loadRecordedDemo() {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'));
  const reports = {};
  const images = new Map();
  const curatedById = new Map();
  for (const name of ['flawed', 'reviewed']) {
    const bytes = await readFile(new URL(`${name}.json`, directory));
    const report = JSON.parse(bytes);
    const view = reportView(report);
    const selected = manifest.selectedReports[name];
    const attempt = manifest.attempts.find((item) => item.id === view.id);
    const capture = capturedExit(report, attempt);
    if (!capture || view.id !== selected.id || digest(bytes) !== selected.sha256 ||
        selected.sha256 !== attempt.summarySha256 || capture.code !== selected.comparisonExitCode) {
      throw new Error(`The ${name} recording does not match its evidence manifest.`);
    }
    view.recording = name;
    view.comparisonExit = capture;
    for (const [index, check] of view.checks.entries()) {
      if (!['refresh', 'live-total'].includes(check.id)) throw new Error('Unexpected recorded cart check.');
      for (const side of ['baseline', 'candidate']) {
        const file = `${view.id}/${side}-${check.id}.jpg`;
        const evidencePath = `attempts/${file}`;
        const screenshot = report.checks[index][side].screenshot;
        const image = await readFile(new URL(evidencePath, directory));
        if (screenshot?.path !== evidencePath || screenshot.sha256 !== digest(image) ||
            screenshot.sha256 !== manifest.artifacts[evidencePath]?.sha256) {
          throw new Error(`Screenshot does not match the recorded evidence for ${name}/${check.id}/${side}.`);
        }
        check[side].screenshot = `recordings/${file}`;
        images.set(check[side].screenshot, image);
      }
    }
    reports[name] = view;
    curatedById.set(view.id, view);
  }

  async function projectReport(bytes) {
    const report = JSON.parse(bytes);
    const view = reportView(report);
    const hash = digest(bytes);
    const attempt = manifest.attempts.find((item) => item.id === view.id &&
      (item.summarySha256 === hash || item.originalReportSha256 === hash));
    if (!attempt) return view;
    const curated = curatedById.get(view.id);
    if (curated) return curated;
    if (hash === attempt.summarySha256) {
      view.comparisonExit = capturedExit(report, attempt);
    } else {
      const summary = await readFile(new URL(`attempts/${view.id}.json`, directory));
      if (digest(summary) === attempt.summarySha256) view.comparisonExit = capturedExit(JSON.parse(summary), attempt);
    }
    return view;
  }

  return { reports, images, projectReport };
}
