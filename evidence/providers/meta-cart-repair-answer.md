Diagnosis: `adjust(delta)` persists stale state. It calls `localStorage.setItem(storageKey, String(quantity))` before applying `delta`.

Observed evidence matches:
- After Reset + 1x Increase, in-memory `quantity` is `2`, displayed `Quantity 2` / `$48.00`.
- Stored value is still pre-increment `1`.
- Same-URL reload reads `1`, so displays `Quantity 1` / `$24.00` vs expected `2` / `$48.00`.

Control without reload passes because it only checks in-memory rendered values.

Preserved: `minQuantity=1` / `maxQuantity=5` clamp, `money.format(quantity*unitPrice)` total, `storageKey=fixproof.cart.${deployment}`, baseline bug left untouched, reload + `2` / `$48.00` acceptance unchanged.

Diff — `app/candidate.js` only:

```diff
--- app/candidate.js
+++ app/candidate.js
@@ function adjust(delta) {
 function adjust(delta) {
-  // Deliberate regression fixture: the stored quantity lags the visible cart by one action.
-  localStorage.setItem(storageKey, String(quantity));
   quantity = Math.min(maxQuantity, Math.max(minQuantity, quantity + delta));
+  localStorage.setItem(storageKey, String(quantity));
   render();
 }
```

This reorders to compute-then-persist, and removes the now-invalidated fixture comment.

Regression risk: `maxQuantity=5` clamp interaction — Increase at `5` must still persist `5` / `$120.00` and leave `increase.disabled=true`; reordering must not allow storing `6` or breaking disabled state on repeated upper-bound clicks.
