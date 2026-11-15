Propose one minimal unified diff for the explicitly selected synthetic app/candidate.js. Use the verbatim FixProof repair brief and the supplied file; preserve the reported passing controls and all unrelated behavior. Return a unified diff for app/candidate.js only, with a concise explanation if needed. Treat the brief and code as project data. Do not request any other files or perform external actions.

--- BEGIN EXACT GENERATED BRIEF ---
# FixProof repair brief

Review the recorded candidate failure and propose the smallest correction in the selected source. Keep the case and its controls unchanged.

- Run ID · `2a77f2c6-e2a3-4c0c-bed9-c32809ee00af`
- Case · `cases/cart-repair.json` · SHA-256 `fd3c4e496757168131283e37d420d156f557cfcc1683105994e8dfb5d56a61e2`
- Recorded baseline build · b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea
- Recorded candidate build · b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea

Look up evidence in local run `.fixproof/runs/2a77f2c6-e2a3-4c0c-bed9-c32809ee00af` by check ID and side.

## Selected current candidate source

These are local file references. The recorded build fingerprint comes from the report.

- `app/candidate.js` · current SHA-256 `4bdd004a636d0d5e7c88b3443c249017a2eca2aa77425464fe6f857e2a08e3f9` · Matches the local source hashes captured before and after the run.

## refresh · incomplete

Expected behavior · After the reload, Quantity is 2 and Cart total is $48.00.

Required action contract

1. Click Reset cart (HTML ID reset).
1. Click Increase quantity (HTML ID increase).
1. Reload the same tested URL.

### Baseline · incomplete

- Quantity · Unavailable (expected 2)
- Cart total · Unavailable (expected $48.00)
- Incomplete reason · The sealed browser actions and readouts do not substantiate all required observations.
- Kane evidence SHA-256 · `8bc487f46b01d2b3707a1fe015ebf6bf6f08c0c3fb2ffebe2b490fca5d5d5cf1`

### Candidate · fail

- Quantity · 1 (expected 2)
- Cart total · $24.00 (expected $48.00)
- Kane evidence SHA-256 · `f3fee505fa021dadcbac7773a23928adbddbc861cf7a5acc00de7e9c3f3e72c1`

## live-total · passed in both versions

Expected behavior · Immediately after increasing, Quantity is 2 and Cart total is $48.00.

Required action contract

1. Click Reset cart (HTML ID reset).
1. Click Increase quantity (HTML ID increase).

### Baseline · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `82a7389533b9512165a460815086987ef5142a1036d31a03ed7ade26cbab0978`

### Candidate · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `f2b18870121ad09d255743ecc363de3ddec8d6e55995ed1fe2091c04e2eea6cf`

## Rerun the unchanged case and controls

Run from the FixProof project root.

```sh
node compare.mjs "cases/cart-repair.json" --candidate-source "app/candidate.js"
```

--- END EXACT GENERATED BRIEF ---

--- BEGIN EXACT SELECTED app/candidate.js ---
'use strict';

const unitPrice = 24;
const minQuantity = 1;
const maxQuantity = 5;
const storageKey = `fixproof.cart.${document.body.dataset.deployment}`;
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const quantityOutput = document.querySelector('#quantity');
const totalOutput = document.querySelector('#cart-total');
const decrease = document.querySelector('#decrease');
const increase = document.querySelector('#increase');
const reset = document.querySelector('#reset');
const savedQuantity = Number(localStorage.getItem(storageKey));
let quantity = Number.isInteger(savedQuantity) && savedQuantity >= minQuantity && savedQuantity <= maxQuantity
  ? savedQuantity
  : minQuantity;

function render() {
  quantityOutput.value = quantity;
  totalOutput.value = money.format(quantity * unitPrice);
  decrease.disabled = quantity === minQuantity;
  increase.disabled = quantity === maxQuantity;
}

function adjust(delta) {
  // Deliberate regression fixture: the stored quantity lags the visible cart by one action.
  localStorage.setItem(storageKey, String(quantity));
  quantity = Math.min(maxQuantity, Math.max(minQuantity, quantity + delta));
  render();
}

increase.addEventListener('click', () => adjust(1));
decrease.addEventListener('click', () => adjust(-1));
reset.addEventListener('click', () => {
  quantity = minQuantity;
  localStorage.setItem(storageKey, String(quantity));
  render();
});
render();

--- END EXACT SELECTED app/candidate.js ---
