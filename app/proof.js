'use strict';

const tones = new Map([
  ['corrected', 'good'],
  ['pass', 'good'],
  ['passed in both versions', 'good'],
  ['fail', 'bad'],
  ['remained broken', 'bad'],
  ['regressed', 'bad'],
  ['incomplete', 'pending'],
  ['pending', 'pending'],
]);

const checkLabels = new Map([
  ['refresh', 'Cart persistence after reload'],
  ['live-total', 'Immediate cart update'],
]);
const sideLabels = { baseline: 'Baseline', candidate: 'Candidate' };
const verdictLabels = { pass: 'Passed', fail: 'Failed', incomplete: 'Incomplete', pending: 'No result' };

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function status(key, label) {
  const badge = element('p', label ?? key[0].toUpperCase() + key.slice(1), 'status');
  badge.dataset.tone = tones.get(key) ?? 'pending';
  return badge;
}

function observationList(observations) {
  if (!observations.length) return element('p', 'No observations recorded.', 'evidence');
  const list = element('dl', undefined, 'readouts');
  for (const { label, value } of observations) {
    const row = element('div');
    row.append(element('dt', label.replaceAll('_', ' ')), element('dd', value));
    list.append(row);
  }
  return list;
}

function renderResult(side, result) {
  const card = element('section', undefined, 'card');
  const heading = element('div', undefined, 'card-heading');
  heading.append(element('h3', sideLabels[side]), status(result.verdict, verdictLabels[result.verdict]));
  card.append(heading, observationList(result.observations));

  if (result.reason || result.verdict === 'pending') {
    card.append(element('p', result.reason ?? 'This check has no saved result for this build.', 'reason'));
  }

  const version = result.version ?? result.preflightVersion;
  const tested = result.verdict === 'pass' || result.verdict === 'fail';
  const label = tested ? 'Tested version' : result.version ? 'Build fingerprint' : 'Preflight version';
  const versionLine = element('p', label, 'evidence');
  versionLine.append(element('code', version ?? 'Unavailable', 'version'));
  card.append(versionLine);

  if (result.evidenceSha256) {
    const proof = element('details');
    proof.append(element('summary', 'Validated pack SHA-256'), element('code', result.evidenceSha256, 'version'));
    card.append(proof);
  }

  if (result.screenshot) {
    const figure = element('figure');
    const link = element('a');
    link.href = '/proof/browser/' + encodeURIComponent(result.screenshot);
    const image = element('img');
    image.alt = sideLabels[side] + ' observation from the recorded browser run';
    image.loading = 'lazy';
    image.src = link.href;
    link.append(image);
    figure.append(link);
    card.append(figure);
  }
  return card;
}

function renderCheck(check, index) {
  const section = element('section', undefined, 'check');
  const heading = element('h2', checkLabels.get(check.id) ?? check.id.replaceAll('-', ' '));
  heading.id = 'check-' + index;
  section.setAttribute('aria-labelledby', heading.id);
  const header = element('div', undefined, 'card-heading');
  header.append(heading, status(check.outcome));
  const expected = element('p', undefined, 'expected');
  expected.append(element('strong', 'Expected behavior'), element('span', check.expected));
  const results = element('div', undefined, 'observations');
  results.append(renderResult('baseline', check.baseline), renderResult('candidate', check.candidate));
  section.append(header, expected, results);
  return section;
}

function renderDate(proof) {
  const date = proof.finishedAt ?? proof.startedAt ?? proof.recordedDate;
  if (!date) {
    document.querySelector('#run-date').textContent = 'Not recorded';
    return;
  }
  const hasTime = date.includes('T');
  const options = hasTime
    ? { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }
    : { dateStyle: 'medium', timeZone: 'UTC' };
  const formatted = new Intl.DateTimeFormat('en-GB', options).format(new Date(date));
  const time = element('time', hasTime ? formatted + ' UTC' : formatted);
  time.dateTime = date;
  document.querySelector('#date-label').textContent = proof.finishedAt ? 'Completed' : proof.startedAt ? 'Started' : 'Recorded';
  document.querySelector('#run-date').replaceChildren(time);
}

async function loadComparison() {
  const path = location.pathname === '/example/' ? '/proof/example.json' : '/proof/report.json';
  const response = await fetch(path);
  if (!response.ok) throw new Error('Comparison unavailable.');
  const proof = await response.json();
  const example = proof.kind === 'example';
  document.querySelector('#example-link').hidden = example;
  document.querySelector('#source-label').textContent = example ? 'Recorded example' : 'Saved comparison';
  document.querySelector('#case-title').textContent = proof.title;
  document.querySelector('#run-id').textContent = proof.id;
  renderDate(proof);
  document.querySelector('#checks').replaceChildren(...proof.checks.map(renderCheck));
  if (proof.incompleteExample) {
    document.querySelector('#incomplete-reason').textContent = proof.incompleteExample;
    document.querySelector('#incomplete-example').hidden = false;
  }
  document.querySelector('#comparison').hidden = false;
  document.querySelector('#loading').hidden = true;
}

loadComparison().catch(() => {
  document.querySelector('#loading').textContent = 'Comparison unavailable.';
});
