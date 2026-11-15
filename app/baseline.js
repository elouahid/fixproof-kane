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
