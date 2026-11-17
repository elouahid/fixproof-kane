# Public-post drafts

Drafts for user review only. Add the published repository and YouTube links before posting. Nothing here has been published.

## LinkedIn

I built FixProof with Codex for the Kane CLI Online Hackathon. It checks a proposed bug fix against the reported behavior and a nearby control, using Kane's actual browser evidence.

In this synthetic-cart demo, a deliberately flawed edit passes the reload check: the candidate keeps 2 items and $48.00. But the immediate-update control catches what that pass misses. The baseline shows 2 items and $48.00; the candidate still shows 1 item and $24.00. FixProof reports a regression.

The failed result becomes a repair brief with the observed values, evidence references, selected source, and the same rerun command. Codex restored the exact reviewed source. The fresh comparison passed both candidate checks: 2 items and $48.00 immediately after increasing and after reload, with the original case and controls unchanged.

Six fresh comparisons produced one confirmed regression, one complete successful retest, and four incomplete attempts. All four are retained as incomplete, including one where both candidate checks passed but a baseline screenshot was missing. This is a bounded example on a seeded defect, not a claim of general correctness or an automatically self-repairing app.

- Repository and repeat command · [add repository link]
- Recorded walkthrough · [add YouTube link]

## Hacker News

**Title**

Show HN: FixProof, check a bug fix and the behavior beside it

I built a small CLI workflow with Codex that takes a baseline URL, a candidate URL, an expected behavior, and a related control. It runs Kane on both builds and writes a report with the observations and evidence status. A repair-brief command exports the failure and an unchanged rerun command for a coding agent.

The latest demo deliberately introduces a flawed candidate edit in a synthetic cart. It passes the reload check at 2 items and $48.00, but fails the no-reload control at 1 item and $24.00 while the baseline passes at 2 and $48.00. The comparison exits `1` for that regression. Codex restored the exact reviewed source. The fresh comparison exited `0`, with the candidate showing 2 items and $48.00 both before and after reload.

The repository includes the local cart versions, case, repair brief, and sanitized browser evidence. The case and controls stayed unchanged across all six fresh comparisons. Four incomplete attempts are preserved, including one with passing candidate checks but a missing baseline screenshot. Codex wrote the deliberately flawed edit for this demonstration. FixProof evaluated it. You can inspect saved results locally and repeat live comparisons with Chrome and a Kane account with credits.

I'd be interested in which controls you keep next to a bug reproduction in your own workflow.

[add repository link] · [add YouTube link]

## Evidence for reviewing both drafts

[Flawed comparison: exit 1](../evidence/control-regression/flawed.json) · [Reviewed comparison: exit 0](../evidence/control-regression/reviewed.json) · [Repair brief](../evidence/control-regression/repair-brief.md) · [Four incomplete attempts](../evidence/control-regression/attempts/)
