# FixProof repair brief

Resolve the incomplete checks and recover the missing evidence before proposing a source change. Keep the case and its controls unchanged.

- Run ID · `86ed19bd-40f1-4501-8b1d-cd10250b4b92`
- Case · `cases/cart.json` · SHA-256 `b537838948f879df662a6ff8df54e2b464a07c3c7f7d5a032c2fa77e5516b5f6`
- Recorded baseline build · b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea
- Recorded candidate build · af4300b0c08022c4d8d75b30c8ee6aa69c2d143dd68cbeb1eb0a61cb085ea5a4

Look up evidence in local run `.fixproof/runs/86ed19bd-40f1-4501-8b1d-cd10250b4b92` by check ID and side.

## Selected current candidate source

These are local file references. The recorded build fingerprint comes from the report.

- `app/candidate.js` · current SHA-256 `9046cf71cbb45c95c99a66bb779ff9cf7965ad61b7e2e9363a042fb8f6bc1e28` · Matches the local source hashes captured before and after the run.

## refresh · corrected

Expected behavior · After the reload, Quantity is 2 and Cart total is $48.00.

Required action contract

1. Click Reset cart (HTML ID reset).
1. Click Increase quantity (HTML ID increase).
1. Reload the same tested URL.

### Baseline · fail

- Quantity · 1 (expected 2)
- Cart total · $24.00 (expected $48.00)
- Kane evidence SHA-256 · `2fbac6c2845a8110b59f9e19da1503478d2a34f8ac98cb702ac125f4cdfd12da`

### Candidate · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `3fa27115eeb2f94d9086612eda7e9fa789a43eec588f7e214ffb461c1e378c27`

## live-total · incomplete

Expected behavior · Immediately after increasing, Quantity is 2 and Cart total is $48.00.

Required action contract

1. Click Reset cart (HTML ID reset).
1. Click Increase quantity (HTML ID increase).

### Baseline · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `f519811f5f7f176c506052968c89952933d95840f620671767a173ffade42c21`

### Candidate · incomplete

- Quantity · Unavailable (expected 2)
- Cart total · Unavailable (expected $48.00)
- Incomplete reason · The sealed browser actions and readouts do not substantiate all required observations.
- Kane evidence SHA-256 · `9d9af57565857e62224b07d9c091ca1ca67cdf0121bd3a7e4393f4b5269a83bd`

## Rerun the unchanged case and controls

Run from the FixProof project root.

```sh
node compare.mjs "cases/cart.json" --candidate-source "app/candidate.js"
```
