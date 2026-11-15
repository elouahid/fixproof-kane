Persist the updated quantity so reload restores the visible cart; keeps `live-total` behavior unchanged.
```diff
--- a/app/candidate.js
+++ b/app/candidate.js
@@ -20,9 +20,8 @@ function render() {
 }
 
 function adjust(delta) {
-  // Deliberate regression fixture: the stored quantity lags the visible cart by one action.
-  localStorage.setItem(storageKey, String(quantity));
   quantity = Math.min(maxQuantity, Math.max(minQuantity, quantity + delta));
+  localStorage.setItem(storageKey, String(quantity));
   render();
 }
 
```
