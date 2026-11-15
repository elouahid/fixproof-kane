'use strict';

const loading = document.querySelector('#loading');
const comparison = document.querySelector('#comparison');
const tones = new Map([
  ['corrected', 'good'],
  ['pass', 'good'],
  ['passes', 'good'],
  ['passed', 'good'],
  ['passed in both', 'good'],
  ['passed in both versions', 'good'],
  ['pass in both versions', 'good'],
  ['fail', 'bad'],
  ['failed', 'bad'],
  ['remained broken', 'bad'],
  ['regressed', 'bad'],
  ['incomplete', 'pending'],
]);

function setStatus(element, label) {
  element.textContent = label;
  element.dataset.tone = tones.get(label.toLowerCase()) ?? 'neutral';
}

function renderObservation(id, entry) {
  const card = document.getElementById(id);
  const field = (name) => card.querySelector(`[data-field="${name}"]`);
  field('observation').textContent = entry.observation;
  if (entry.outcome) {
    setStatus(field('outcome'), entry.outcome);
    field('outcome').hidden = false;
  }
  if (entry.version) {
    field('short-version').textContent = entry.version.slice(0, 12);
    field('full-version').textContent = entry.version;
    field('version').hidden = false;
  }
  if (entry.evidence) {
    field('evidence').textContent = entry.evidence;
    field('evidence').hidden = false;
  }
  if (entry.screenshot) {
    const figure = field('screenshot');
    const path = entry.screenshot.split('/').map(encodeURIComponent).join('/');
    const url = `/proof/${path}`;
    const image = figure.querySelector('img');
    image.addEventListener('load', () => { figure.hidden = false; });
    figure.querySelector('a').href = url;
    image.src = url;
  }
}

function renderControls(controls) {
  if (!controls?.length) return;
  const rows = controls.map(({ label, outcome, observation }) => {
    const row = document.createElement('li');
    const heading = document.createElement('h3');
    const status = document.createElement('p');
    const detail = document.createElement('p');
    heading.textContent = label;
    status.className = 'status';
    setStatus(status, outcome);
    detail.textContent = observation;
    row.append(heading, status, detail);
    return row;
  });
  document.querySelector('#control-list').replaceChildren(...rows);
  document.querySelector('#controls').hidden = false;
}

async function loadComparison() {
  const response = await fetch('/proof/demo.json');
  if (!response.ok) throw new Error('Comparison file unavailable');
  const proof = await response.json();
  if (!proof.expected || !proof.verdict || !proof.baseline?.observation || !proof.candidate?.observation) {
    throw new Error('Comparison fields missing');
  }

  document.querySelector('#case-title').textContent = proof.title ?? 'Cart quantity after refresh';
  document.querySelector('#expected').textContent = proof.expected;
  setStatus(document.querySelector('#verdict'), proof.verdict);
  renderObservation('baseline', proof.baseline);
  renderObservation('candidate', proof.candidate);
  renderControls(proof.controls);

  if (proof.incomplete) {
    const incomplete = document.querySelector('#incomplete');
    setStatus(incomplete.querySelector('[data-field="outcome"]'), proof.incomplete.outcome);
    incomplete.querySelector('[data-field="observation"]').textContent = proof.incomplete.observation;
    incomplete.hidden = false;
  }
  if (proof.evidenceSource) {
    const source = document.querySelector('#evidence-source');
    source.textContent = proof.evidenceSource;
    source.hidden = false;
  }
  comparison.hidden = false;
  loading.hidden = true;
}

loadComparison().catch(() => {
  loading.textContent = 'Comparison incomplete. Recorded evidence is unavailable.';
});
