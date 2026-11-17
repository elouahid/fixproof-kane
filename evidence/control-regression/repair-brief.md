# FixProof repair brief

Review the recorded candidate failure and propose the smallest correction in the selected source. Keep the case and its controls unchanged.

- Run ID · `4c562a74-0669-4e0d-a4ad-e2eb73693f8a`
- Case · `cases/cart.json` · SHA-256 `b537838948f879df662a6ff8df54e2b464a07c3c7f7d5a032c2fa77e5516b5f6`
- Recorded baseline build · b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea
- Recorded candidate build · af4300b0c08022c4d8d75b30c8ee6aa69c2d143dd68cbeb1eb0a61cb085ea5a4

Look up evidence in local run `.fixproof/runs/4c562a74-0669-4e0d-a4ad-e2eb73693f8a` by check ID and side.

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
- Kane evidence SHA-256 · `2064ca5d12572c8a7f94c5f3a872a0d689fd50387b586f842558cecf65e005fd`

### Candidate · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `dab7a8ed2821682f7c22c8c051dd64e9e932bd025cebaf53c9337969ea3cb270`

## live-total · regressed

Expected behavior · Immediately after increasing, Quantity is 2 and Cart total is $48.00.

Required action contract

1. Click Reset cart (HTML ID reset).
1. Click Increase quantity (HTML ID increase).

### Baseline · pass

- Quantity · 2 (expected 2)
- Cart total · $48.00 (expected $48.00)
- Kane evidence SHA-256 · `1b07ea9bb1449b4dd845aa7d45ba19e6b03cb9325912eb39b17810f9ff0d1bc5`

### Candidate · fail

- Quantity · 1 (expected 2)
- Cart total · $24.00 (expected $48.00)
- Kane evidence SHA-256 · `c3d68e647303eed1f9c329fbf4f0dfe33392bd14e1fb28171a37812708ad565d`

## Rerun the unchanged case and controls

Run from the FixProof project root.

```sh
node compare.mjs "cases/cart.json" --candidate-source "app/candidate.js"
```
