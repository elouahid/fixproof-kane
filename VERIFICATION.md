# Recorded cart verification

**Corrected.** After one increase and a reload, Kane observed **1 item and $24.00** on the baseline and **2 items and $48.00** on the candidate. The working control passed in both builds.

The original paired comparison was recorded November 15, 2026 in Chrome with Kane CLI 0.10.4, run `4c8b13ad-7571-4436-9b6c-65794fe2b907`.

| Check | Expected behavior | Baseline | Candidate | Outcome |
| --- | --- | --- | --- | --- |
| Cart persistence | After the reload, Quantity is 2 and Cart total is $48.00. | 1 item · $24.00 | 2 items · $48.00 | **Corrected** |
| Immediate cart update | Immediately after increasing, Quantity is 2 and Cart total is $48.00. | 2 items · $48.00 | 2 items · $48.00 | **Passed in both versions** |

## Tested builds

| Deployment | URL | SHA-256 build fingerprint |
| --- | --- | --- |
| Baseline | `http://127.0.0.1:8741/baseline/` | `b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea` |
| Candidate | `http://127.0.0.1:8741/candidate/` | `ed90d3abeacec729cbb79c71c2b353729b041dcf7da8078204513e99d7ee246a` |

The fingerprints cover the served cart HTML, CSS and JavaScript. The server returns them in `X-FixProof-Version`. The browser screenshots show the build fingerprints, and the sealed navigation logs record them for the document fetches.

## Action-procedure repair

The supplied offline probe ran against checkpoint `22e9448a6db9409a546b6350af87b487a84b7fc7` before edits and reproduced the false correction. Both probes ran the actual cart JavaScript in stub DOM/storage with authored action records. Their provenance is offline. [Observed reproduction results](evidence/action-contract-offline.json)

| Offline path | Readout | Original checker | Repaired checker |
| --- | --- | --- | --- |
| Baseline, one Increase then reload | 1 item · $24.00 | Fail | Fail |
| Baseline, two Increases then reload | 2 items · $48.00 | Pass | **Incomplete** |
| Candidate, one Increase then reload | 2 items · $48.00 | — | Pass |
| Missing Reset, missing reload, or substituted Decrease | 2 items · $48.00 | — | **Incomplete** |
| Immediate-update control on both builds | 2 items · $48.00 | — | Pass |

Schema version 2 requires an ordered action contract. The checker binds each recorded click's step and single declared selector to the corresponding successful DOM click in the sealed runner log. It requires the exact number and order of actions and, for the persistence check, a successful same-URL reload before observing the values. Missing confirmations or conflicting action records leave the comparison incomplete. Meta reviewed the original failure and recommended the executed DOM binding and fallback rejection. [Provider review and usage](evidence/providers/README.md)

| Case file | Schema | SHA-256 |
| --- | --- | --- |
| `cases/cart-v1.json` | Original, implicit version 1 | `998e7c162a1345cc9c42ce40a375dc806e627927c44a8259c0c066943a82fb75` |
| `cases/cart.json` | Version 2 | `b537838948f879df662a6ff8df54e2b464a07c3c7f7d5a032c2fa77e5516b5f6` |

The action instructions, business expectations, observation requirements and both build fingerprints match the original. Local review of the original packs confirmed the ordered DOM clicks in both complete paired comparisons. The first pack and infrastructure-limited attempts retain their recorded incomplete status. [Historical Kane audit](evidence/action-contract-history.json)

## Fresh schema version 2 comparison

On November 15, 2026, run `b124064e-b08d-46f6-825f-3a6485ca4f6c` completed with exit `0`. The baseline failed the reload check at **1 item and $24.00**. The candidate passed at **2 items and $48.00**, and the immediate-update check passed at **2 items and $48.00** on both builds. Both instructions and expected values matched the previous comparison.

All four fresh packs passed Kane L1 validation and matched the ordered action contract. A separate pack audit confirmed two HTTP 200 document loads for each reload check and one for each control, with the expected build fingerprint on each response. The CLI obtains build fingerprints through preflight and post-run HEAD requests. The audit independently checked the actual document response headers. [Fresh comparison and pack references](evidence/action-contract-rerun.json)

Chrome verified that the saved comparison preview matched the exact `report.json`, including its run ID, timestamp, expectations, observations, build fingerprints, and outcomes. A separate preflight report produced while the comparison server was stopped displayed its incomplete reasons. Open the exact completed local report from the project folder in PowerShell.

```powershell
$env:FIXPROOF_CART_PORT = '8742'
node app/server.mjs --report '.fixproof/runs/b124064e-b08d-46f6-825f-3a6485ca4f6c/report.json'
```

Open [the saved comparison](http://127.0.0.1:8742/). The source ZIP also includes `evidence/action-contract-rerun.json`, a derived copy with the same preview fields and public-safe evidence references. Pass that path to `--report` from an unpacked copy. The recorded example is available at `/example/`.

## Full rerun after the free credit grant

On November 15, 2026, `node compare.mjs cases/cart.json` completed with exit `0` in run `7fb17965-6f59-463d-a4fd-406478de64c7`. The case file, both objective hashes, and both build fingerprints matched the original comparison. The baseline again showed **1 item and $24.00** after reload. The candidate retained **2 items and $48.00**, and both immediate-update controls passed at **2 items and $48.00**.

All four fresh Kane evidence packs passed L1 validation. Chrome recorded two HTTP 200 document loads for each reload check and one for each control, with the correct build fingerprint on every response. The fresh screenshots matched the packaged JPEGs byte-for-byte. [Fresh rerun results and evidence digests](evidence/free-credit-rerun.json)

## From failure to correction

1. The defect was deliberately introduced in the synthetic baseline. The first Kane run clicked **Reset cart**, clicked **Increase quantity** once and reloaded. Its screenshot showed [2 items and $48.00 before reload](evidence/browser/original-before.jpg) and [1 item and $24.00 after reload](evidence/browser/original-after.jpg). It recorded a failing assertion, but `run_end.final_state` omitted both readings, so the first machine result stayed incomplete.
2. Meta received those actual readings, the sealed evidence identifier, the unchanged expectation and the cart source. It proposed persisting the clamped quantity immediately after updating it. Codex applied that one correction to the candidate. [Meta prompt, proposal and usage](evidence/providers/README.md)
3. The repeated Kane path explicitly navigated to the same URL again. The expected values and the immediate-update control stayed fixed. The paired comparison produced four validated evidence packs. Kane stopped the baseline assertion at its first failed field. The evidence reader was updated to accept that short-circuit only when all requested readings are present and the failed assertion maps to a recorded mismatch. Rechecking the same sealed records established the outcomes above. [Machine-readable results](evidence/comparison.json) · [Independent pack audit and screenshots](evidence/browser/README.md)

## Incomplete path

A separate repeat changed only the candidate URL to `/unavailable/`. Its actual HTTP 404 stopped preflight, left both comparisons **incomplete**, and returned exit `2`. [Recorded preflight report](evidence/incomplete.json)

Before the free credit grant, a repeat reproduced both baseline results and then returned insufficient credits (`560`) on both candidate runs. That comparison returned exit `2` and remains recorded as incomplete. [Recorded credit-limited repeat](evidence/credit-limited-repeat.json)

## Focused regression probe

Meta flagged the cart’s upper limit. An independent real Chrome probe increased to five items, verified the disabled increase button and **$120.00**, and reloaded. It then decreased to two and confirmed **$48.00** persisted after another reload. [Supplemental Chrome readings](evidence/supplemental/chrome-quantity-boundaries.json)

## Repair brief and unchanged retest

The separate handoff demonstration deliberately seeded the known bug in an isolated candidate. The saved candidate failed at **1 item and $24.00** after reload. Meta received the generated brief and one selected source file. The reviewed edit was applied in the isolated copy, and the exact command in the brief exited `0` with **2 items and $48.00** on the corrected candidate. Both controls passed. The earlier incomplete baseline capture is preserved in the original report. [Handoff, run IDs, replay commands and recording sequence](evidence/repair-brief/README.md)
