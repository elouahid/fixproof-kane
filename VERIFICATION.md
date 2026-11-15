# Recorded cart verification

**Corrected.** After one increase and a reload, Kane observed **1 item and $24.00** on the baseline and **2 items and $48.00** on the candidate. The working control passed in both builds.

Recorded November 15, 2026 in Chrome with Kane CLI 0.10.4. Comparison `4c8b13ad-7571-4436-9b6c-65794fe2b907`.

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

## From failure to correction

1. The defect was deliberately introduced in the synthetic baseline. The first Kane run clicked **Reset cart**, clicked **Increase quantity** once and reloaded. Its screenshot showed [2 items and $48.00 before reload](evidence/browser/original-before.jpg) and [1 item and $24.00 after reload](evidence/browser/original-after.jpg). It recorded a failing assertion, but `run_end.final_state` omitted both readings, so the first machine result stayed incomplete.
2. Meta received those actual readings, the sealed evidence identifier, the unchanged expectation and the cart source. It proposed persisting the clamped quantity immediately after updating it. Codex applied that one correction to the candidate. [Meta prompt, proposal and usage](evidence/providers/README.md)
3. The repeated Kane path explicitly navigated to the same URL again. The expected values and the immediate-update control stayed fixed. The paired comparison produced four validated evidence packs. Kane stopped the baseline assertion at its first failed field. The evidence reader was updated to accept that short-circuit only when all requested readings are present and the failed assertion maps to a recorded mismatch. Rechecking the same sealed records established the outcomes above. [Machine-readable results](evidence/comparison.json) · [Independent pack audit and screenshots](evidence/browser/README.md)

## Incomplete path

A separate repeat changed only the candidate URL to `/unavailable/`. Its actual HTTP 404 stopped preflight, left both comparisons **incomplete**, and returned exit `2`. [Recorded preflight report](evidence/incomplete.json)

A later run of the documented command reproduced both baseline results. Kane then reported insufficient credits (`560`) on both candidate runs. That comparison returned exit `2` and is incomplete. New live runs require available Kane credits. [Recorded credit-limited repeat](evidence/credit-limited-repeat.json)

## Focused regression probe

Meta flagged the cart’s upper limit. An independent real Chrome probe increased to five items, verified the disabled increase button and **$120.00**, and reloaded. It then decreased to two and confirmed **$48.00** persisted after another reload. [Supplemental Chrome readings](evidence/supplemental/chrome-quantity-boundaries.json)
