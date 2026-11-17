# A passing bug check can hide a regression

On 17 November 2026, a deliberately flawed candidate passed the cart's reload check but broke its previously passing immediate-update control. FixProof reported **corrected + regressed**, with actual comparison exit **1**. After restoring the reviewed candidate, a fresh unchanged comparison reported **corrected + passed in both versions**, exit **0**.

| Check | Baseline | Deliberately flawed candidate | Reviewed candidate |
| --- | --- | --- | --- |
| One increase, then same-URL reload | FAIL · 1 item / $24.00 | PASS · 2 items / $48.00 | PASS · 2 items / $48.00 |
| One increase, without reload | PASS · 2 items / $48.00 | **FAIL · 1 item / $24.00** | PASS · 2 items / $48.00 |

The flawed source was deliberately constructed by Codex for this synthetic demonstration: it saves the changed quantity but omits `render()`. It was not a new model-provider proposal. The reviewed correction restores the previously accepted source from commit `9dc497c38a070fdb90536cccb2367dc94975ab6c`. FixProof itself applies no edits. The demonstration's source changes and rerun initiation were separate operator orchestration.

## Selected evidence

- [Rejected candidate report](flawed.json): run `4c562a74-0669-4e0d-a4ad-e2eb73693f8a`, exit 1. [Actual exported repair brief](repair-brief.md).
- [Reviewed candidate report](reviewed.json): run `0a44432b-c0fd-4179-a377-a2f3ee894d47`, exit 0.
- [Deliberately flawed source snapshot](deliberately-flawed-candidate.js) and [reviewed correction](reviewed-correction.diff). The distributed application's `app/candidate.js` remains the reviewed version.
- [Frozen case](case.json), byte-identical to [`cases/cart.json`](../../cases/cart.json), and [run manifest](manifest.json) containing exact commands, hashes, exits, source restoration and every attempt.

The literal repair brief's `app/candidate.js` reference describes the isolated project's flawed file **at export time**. It does not describe the current distributed application. Re-exporting against the reviewed current file correctly identifies a source-hash difference. The brief was exported locally; no new Meta or Baseten patch request was made for this demonstration.

## Every attempt is retained

All six comparisons used the same case bytes, expected values, controls and objective hashes. The actual process exits below were captured by the operator wrapper and checked against the saved outcomes; they were not invented from screenshots or a model conclusion.

| Order | Saved comparison | Exit | Result and limitation |
| --- | --- | --- | --- |
| 1 | [86ed19bd-40f1-4501-8b1d-cd10250b4b92](attempts/86ed19bd-40f1-4501-8b1d-cd10250b4b92.json) | 2 | Flawed reload passed; control incomplete because its sealed pack lacked the required readouts and terminal assertion. |
| 2 | [2d129aa4-d34f-45f3-9505-847afa518439](attempts/2d129aa4-d34f-45f3-9505-847afa518439.json) | 2 | Reviewed control passed; reload incomplete because the sealed runner log did not confirm the required DOM clicks. Kane's passing status alone was insufficient. |
| 3 | [4c562a74-0669-4e0d-a4ad-e2eb73693f8a](attempts/4c562a74-0669-4e0d-a4ad-e2eb73693f8a.json) | 1 | **Selected rejection:** flawed reload passed and the immediate control regressed. |
| 4 | [191b6e17-b448-4090-b0f5-e4ffecc6199e](attempts/191b6e17-b448-4090-b0f5-e4ffecc6199e.json) | 2 | Reviewed candidate passed both checks, but baseline reload had an execution failure; the paired comparison remained incomplete. |
| 5 | [86756c31-3dbc-45c0-90a0-1158048feb67](attempts/86756c31-3dbc-45c0-90a0-1158048feb67.json) | 2 | Baseline control upload failed; candidate stages could not start or continue and produced no packs. |
| 6 | [0a44432b-c0fd-4179-a377-a2f3ee894d47](attempts/0a44432b-c0fd-4179-a377-a2f3ee894d47.json) | 0 | **Selected reviewed retest:** baseline FAIL/PASS, reviewed candidate PASS/PASS. |

The [first attempt's actual brief](incomplete-repair-brief.md) correctly requests missing-evidence recovery before a source correction. Its incomplete outcome remains unchanged. No earlier baseline was substituted into a later report.

## Open the exact saved reports

From the repository root, run these in separate PowerShell terminals with the listed ports unused. These commands serve saved evidence and make no new Kane request.

```powershell
$env:FIXPROOF_CART_PORT = '8742'
node app/server.mjs --report 'evidence/control-regression/flawed.json'
```

[Rejected candidate preview](http://127.0.0.1:8742/).

```powershell
$env:FIXPROOF_CART_PORT = '8743'
node app/server.mjs --report 'evidence/control-regression/reviewed.json'
```

[Reviewed candidate preview](http://127.0.0.1:8743/). Confirm the displayed run ID matches the selected report. The preview's saved results describe their recorded builds; they are not a live test of whatever source is currently running.

## Exact reproduction and identities

Every actual comparison ran from the isolated demonstration project with its fixture server on the case's unchanged port 8741:

```sh
node compare.mjs cases/cart.json --candidate-source app/candidate.js
```

The conclusive failure brief was exported from that same isolated root using:

```sh
node repair-brief.mjs --report .fixproof/runs/4c562a74-0669-4e0d-a4ad-e2eb73693f8a/report.json --case cases/cart.json --source app/candidate.js
```

Those private raw-run paths are historical operator references, not bundled raw packs. To reproduce the scenario, use a separate checkout/copy, select the documented source snapshot, and keep the case unchanged. Reopening the saved reports above requires no rerun or fixture change.

| Identity | SHA-256 |
| --- | --- |
| Frozen case | `b537838948f879df662a6ff8df54e2b464a07c3c7f7d5a032c2fa77e5516b5f6` |
| Baseline served build | `b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea` |
| Flawed served build | `af4300b0c08022c4d8d75b30c8ee6aa69c2d143dd68cbeb1eb0a61cb085ea5a4` |
| Reviewed served build | `ed90d3abeacec729cbb79c71c2b353729b041dcf7da8078204513e99d7ee246a` |
| Flawed selected source | `9046cf71cbb45c95c99a66bb779ff9cf7965ad61b7e2e9363a042fb8f6bc1e28` |
| Reviewed selected source | `f467396af5c96c8aec0c8893dbfe89000fd0656430110f0bd781bb42444f10fc` |

Source hashes and served-build fingerprints have different scopes. The independent audit recomputed each build fingerprint from the HTML, CSS and selected JavaScript, then checked the fingerprint in the actual sealed document responses. It also checked pack hashes and local Kane L1 validation, exact executed DOM actions, same-URL reloads, readouts, assertions, captured exits and source stability. All available packs were validated, including incomplete attempts; a valid pack does not imply a complete test.

The public reports contain allowlisted derived fields. Original pack hashes identify private original evidence, not the rewritten summary bytes. Synthetic-cart screenshots are unchanged pack members, visually reviewed for publication. Raw packs, account metadata, credentials and host paths are excluded. Reported `kaneCredits` remain the CLI's recorded usage values, not an independent billing audit. These checks establish this synthetic cart behavior, not general application correctness or production readiness.
