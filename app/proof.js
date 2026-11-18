'use strict';

const sides = ['baseline', 'candidate'];
const sideLabels = { baseline: 'Baseline', candidate: 'Candidate' };
const verdictLabels = { pass: 'Passed', fail: 'Failed', incomplete: 'Incomplete', pending: 'No result' };
const checkLabels = new Map([
  ['refresh', 'Persistence after reload'],
  ['live-total', 'Immediate cart update'],
  ['mark-all-after-reopening', 'Mark all after reopening a task'],
  ['reopen-one', 'Reopen one completed task'],
]);
const tones = new Map([
  ['corrected', 'good'], ['pass', 'good'], ['passed in both versions', 'good'],
  ['fail', 'bad'], ['remained broken', 'bad'], ['regressed', 'bad'],
]);
const legacyRoute = document.documentElement.dataset.entry === 'example';
const appRoot = new URL(legacyRoute ? '../' : './', location.href);

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function status(key, label) {
  const badge = element('span', label ?? key[0].toUpperCase() + key.slice(1), 'status');
  badge.dataset.tone = tones.get(key) ?? 'pending';
  return badge;
}

function summaryValues(observations) {
  const quantity = observations.find(row => row.label === 'Quantity');
  const total = observations.find(row => row.label === 'Cart total');
  if (quantity && total) {
    return quantity.value + (quantity.value === '1' ? ' item' : ' items') + ' · ' + total.value;
  }
  return observations.map(row => row.label + ' ' + row.value).join(' · ');
}

function evidenceId(index) {
  return 'evidence-' + (index + 1);
}

function renderRow(check, index, runUrl) {
  const row = element('tr');
  const checkCell = element('th');
  checkCell.scope = 'row';
  const link = element('a', checkLabels.get(check.id) ?? check.id);
  link.href = runUrl + '#' + evidenceId(index);
  link.setAttribute('aria-label', link.textContent + ' evidence');
  checkCell.append(link, status(check.outcome));
  row.append(checkCell);
  for (const side of sides) {
    const result = check[side];
    const cell = element('td');
    cell.append(element('span', summaryValues(result.observations) || 'No readouts', 'readout'),
      status(result.verdict, verdictLabels[result.verdict]));
    row.append(cell);
  }
  return row;
}

function observationList(observations) {
  if (!observations.length) return element('p', 'No observations recorded.');
  const list = element('dl', undefined, 'readouts');
  for (const { label, value } of observations) {
    const row = element('div');
    row.append(element('dt', label.replaceAll('_', ' ')), element('dd', value));
    list.append(row);
  }
  return list;
}

function renderResult(side, result, checkName) {
  const card = element('section', undefined, 'side');
  const heading = element('div', undefined, 'card-heading');
  heading.append(element('h4', sideLabels[side]), status(result.verdict, verdictLabels[result.verdict]));
  card.append(heading, observationList(result.observations));
  if (result.reason || result.verdict === 'pending') {
    card.append(element('p', result.reason ?? 'This check has no saved result for this build.', 'reason'));
  }

  const label = result.version ? 'Recorded build fingerprint' : 'Preflight build fingerprint';
  card.append(element('p', label, 'hash-label'),
    element('code', result.version ?? result.preflightVersion ?? 'Unavailable', 'digest'));
  if (result.evidenceSha256) {
    card.append(element('p', 'Validated pack SHA-256', 'hash-label'),
      element('code', result.evidenceSha256, 'digest'));
  }

  if (result.screenshot) {
    const parts = result.screenshot.split('/').map(encodeURIComponent);
    const path = parts.length === 1 ? 'browser/' + parts[0] : parts.join('/');
    const label = sideLabels[side] + ' browser capture for ' + checkName;
    const link = element('a', undefined, 'capture-link');
    link.href = new URL('proof/' + path, appRoot).href;
    const image = element('img');
    image.alt = label;
    image.loading = 'lazy';
    image.src = link.href;
    link.append(image, element('span', 'Open browser capture'));
    card.append(link);
  }
  return card;
}

function renderCheck(check, index) {
  const name = checkLabels.get(check.id) ?? check.id.replaceAll('-', ' ');
  const details = element('details', undefined, 'check');
  details.append(element('summary', name + ' evidence'));
  const body = element('div', undefined, 'evidence-body');
  body.id = evidenceId(index);
  body.tabIndex = -1;
  const expectedHeading = element('h3', 'Expected behavior');
  body.append(expectedHeading, element('p', check.expected));
  const evidence = element('div', undefined, 'sides');
  for (const side of sides) evidence.append(renderResult(side, check[side], name));
  body.append(evidence);
  details.append(body);
  return details;
}

function showLinkedEvidence() {
  const body = document.getElementById(location.hash.slice(1));
  if (!body?.matches('#checks .evidence-body')) return;
  const panel = body.parentElement;
  panel.open = true;
  const summary = panel.querySelector('summary');
  summary.focus({ preventScroll: true });
  summary.scrollIntoView();
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

function renderIntro(proof) {
  const exit = proof.comparisonExit;
  const headline = document.querySelector('#case-title');
  let source = proof.kind === 'example' ? 'Earlier recorded example' : 'Recorded comparison';
  let explanation = '';
  headline.textContent = proof.title;
  if (proof.recording === 'flawed' && exit?.code === 1) {
    source = 'Recorded comparison · Synthetic cart';
    headline.textContent = 'Flawed correction rejected';
    explanation = 'The reload check passed. The immediate-update control caught a stale quantity and total.';
  } else if (proof.recording === 'reviewed' && exit?.code === 0) {
    source = 'Recorded comparison · Synthetic cart';
    headline.textContent = 'Reviewed correction passed';
    explanation = 'In this separate run, the restored candidate updated the cart immediately and retained the change after reload.';
  } else if (proof.recording === 'todomvc' && exit?.code === 0) {
    source = 'Recorded comparison · TodoMVC JavaScript ES5';
    headline.textContent = 'Mark all after reopening a task';
    explanation = 'The original app left both tasks active. The local correction completed both, and reopening one task still worked on each build.';
  } else if (exit?.code === 2) {
    explanation = 'The recorded comparison was incomplete. See each check for the available evidence.';
  }

  document.title = headline.textContent + ' · FixProof';
  document.querySelector('#source-label').textContent = source;
  const copy = document.querySelector('#explanation');
  copy.textContent = explanation;
  if (proof.recording === 'todomvc') {
    const issue = element('a', 'TodoMVC issue #2310');
    issue.href = 'https://github.com/tastejs/todomvc/issues/2310';
    copy.append(' ', issue);
  }
  copy.hidden = !explanation;
  const badge = document.querySelector('#exit-badge');
  badge.textContent = exit ? 'Exit ' + exit.code : 'Exit unavailable';
  badge.dataset.tone = exit ? ['good', 'bad', 'pending'][exit.code] : 'pending';
  const note = document.querySelector('#exit-source');
  if (exit) {
    note.textContent = 'Comparison process exit recorded by the operator wrapper.';
    document.querySelector('#capture-note').textContent = exit.provenance;
    document.querySelector('#capture-hash').textContent = exit.captureSha256;
    document.querySelector('#capture').hidden = false;
  } else {
    note.textContent = 'A verified comparison-process exit is unavailable for this report.';
  }
}

async function loadComparison() {
  const run = new URLSearchParams(location.search).get('run');
  document.querySelector('#home-link').href = appRoot.href;
  const recordings = ['flawed', 'reviewed', 'todomvc'];
  for (const key of recordings) {
    document.querySelector('#' + key + '-link').href = new URL('?run=' + key, appRoot).href;
  }
  if (run !== null && !recordings.includes(run)) throw new Error('Unknown recorded comparison.');
  const file = run ?? (legacyRoute ? 'example' : 'report');
  const response = await fetch(new URL('proof/' + file + '.json', appRoot));
  if (!response.ok) throw new Error('Comparison unavailable.');
  const proof = await response.json();
  renderIntro(proof);
  let runUrl = '';
  if (recordings.includes(proof.recording)) {
    const runLink = document.querySelector('#' + proof.recording + '-link');
    runLink.setAttribute('aria-current', 'page');
    runUrl = runLink.href;
    const source = document.querySelector('#manifest-link');
    const saved = document.querySelector('#saved-report-link');
    if (proof.recording === 'todomvc') {
      const directory = 'https://github.com/elouahid/fixproof-kane/blob/d378c32ef89b6beef37702212142790edd23ecb7/evidence/todomvc/runs/' + proof.id + '/';
      source.href = directory + 'process-capture.json';
      source.textContent = 'Process receipt';
      saved.href = directory + 'report.json';
    } else {
      saved.href = new URL(proof.recording + '.json', source.href).href;
    }
    document.querySelector('#recorded-sources').hidden = false;
  }
  document.querySelector('#results').replaceChildren(...proof.checks.map((check, index) => renderRow(check, index, runUrl)));
  document.querySelector('#case-name').textContent = proof.title;
  document.querySelector('#run-id').textContent = proof.id;
  renderDate(proof);
  document.querySelector('#checks').replaceChildren(...proof.checks.map(renderCheck));
  if (proof.incompleteExample) {
    document.querySelector('#incomplete-reason').textContent = proof.incompleteExample;
    document.querySelector('#incomplete-example').hidden = false;
  }
  if (proof.currentCarts) {
    document.querySelector('#baseline-link').href = new URL('baseline/', appRoot).href;
    document.querySelector('#candidate-link').href = new URL('candidate/', appRoot).href;
    document.querySelector('#example-link').href = new URL('example/', appRoot).href;
    document.querySelector('#example-link').hidden = proof.kind === 'example';
    document.querySelector('#local-resources').hidden = false;
  }
  document.querySelector('#comparison').hidden = false;
  document.querySelector('#loading').hidden = true;
  window.addEventListener('hashchange', showLinkedEvidence);
  showLinkedEvidence();
}

loadComparison().catch(() => {
  document.querySelector('#loading').textContent = 'Comparison unavailable. Choose a recorded comparison above to continue.';
});
