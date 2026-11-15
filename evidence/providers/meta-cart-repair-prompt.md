You are the coding agent proposing the first bounded correction for FixProof's synthetic cart fixture. Use the real browser mismatch below and the exact initially identical candidate JavaScript. Return a short diagnosis grounded in the observed values, the smallest applicable unified diff against app/candidate.js (including removing an invalidated fixture comment if appropriate), and one specific regression risk. Preserve clamp bounds, displayed total, storage key, baseline fixture, and acceptance expectations. Limit the diff to app/candidate.js. Make no claims about executing the patch.

## Actual before-change execution

Kane CLI 0.10.4 drove a Chrome browser. Validated sealed L1 evidence run 164ad520-8508-44bf-bf5e-344b3fe2f1df. Baseline build SHA-256 b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea.

The browser clicked Reset cart, clicked Increase quantity exactly once, and reloaded exactly the same URL (the HAR records its second document GET). Before reload, the Chrome screenshot displayed Quantity 2 and Cart total $48.00. After reload, the screenshot displayed Quantity 1 and Cart total $24.00. Raw Kane ASSERT observations record expected 2, actual 1 and expected $48.00, actual $24.00. The automated structured comparison labeled that run incomplete because its required final_state was missing. The screenshots, navigation and raw assertion details are the observed defect evidence.

## Unchanged expected behavior and control

The expected behavior is Quantity 2 and Cart total $48.00 after reloading the same URL directly after the single Increase. The adjacent control clicks Reset then Increase once and checks Quantity 2 and Cart total $48.00 without reloading. Keep the reload and case objective unchanged. The current baseline script below has the deliberately introduced bug. The starting candidate has the identical script. Propose the fix only to the candidate.

## Starting candidate source
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
