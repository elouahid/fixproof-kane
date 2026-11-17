# FixProof recording walkthrough

The local review video runs **3:07**. The MP4 includes offline synthetic English narration, selectable captions and chapters. The script below can also be recorded in your own voice. The standalone control segment shows the two labelled comparison reports referenced below.

## Open the two reports

Use two PowerShell terminals at the project root. Keep each server running while recording.

```powershell
$env:FIXPROOF_CART_PORT = '8742'
node app/server.mjs --report 'evidence/control-regression/flawed.json'
```

Open <http://127.0.0.1:8742/> for run `4c562a74-0669-4e0d-a4ad-e2eb73693f8a`.

```powershell
$env:FIXPROOF_CART_PORT = '8743'
node app/server.mjs --report 'evidence/control-regression/reviewed.json'
```

Open <http://127.0.0.1:8743/> for run `0a44432b-c0fd-4179-a377-a2f3ee894d47`.

## Screen sequence and narration

**0:00–0:18 · Why a cart fix needs two checks**

Show the two labelled baseline screenshots from the earlier paired comparison. Point to the item count and total in each.

> This cart has one twenty-four-dollar tote. On the left, Kane increased the quantity and the cart showed forty-eight dollars. On the right, a separate check added the same tote and reloaded the page. The cart lost the change. FixProof lets us test both moments again when someone proposes a fix.

**0:18–0:37 · The failure that went into the repair brief**

Open evidence/repair-brief/before.json with the report viewer. Show the candidate failure and the incomplete baseline.

> Here is the saved comparison used for an earlier repair handoff. The candidate came back with one item after reload. Kane could not substantiate the baseline readout in that particular run, so FixProof left that side incomplete. We could still hand a developer the measured candidate failure and the exact steps.

**0:37–0:58 · From an observed failure to a reviewed edit**

Show the generated earlier repair brief and Meta’s saved proposal. Highlight the storage write followed by render in the reviewed candidate.

> The repair brief includes the expected steps, the observed values, evidence digests and the source file selected for review. In this earlier handoff, Meta proposed saving the quantity after the arithmetic. The reviewed correction also redraws the screen immediately. That reviewed file is the one we will restore in the new demonstration.

**0:58–1:18 · Freeze both checks before comparing builds**

Open the frozen case and point to the reset, single increase and optional reload. Show the case digest.

> For the new comparison, the case was frozen before Kane ran. Each check starts by resetting the cart and increasing quantity exactly once. Only the first check reopens the same URL. The immediate-update control reads the page without reloading. Both expect two items and forty-eight dollars, on both builds.

**1:18–1:39 · What if the update is saved but never drawn?**

Show the deliberately labelled flawed source and the build fingerprint. Point out the missing redraw after persistence.

> To challenge the control, Codex deliberately constructed one flawed candidate in an isolated copy. It stores the new quantity and leaves out the redraw inside the adjustment handler. The unchanged page still renders at startup. This demonstration edit was made specifically to exercise the checker. Meta’s proposal belongs to the earlier handoff.

**1:39–1:54 · The persistence check passes**

Open the flawed report with the existing viewer. On Cart persistence after reload, point to both verdicts, the observations and tested fingerprints.

> Here is the saved Kane report for the flawed build. After the reload, the candidate shows two items and forty-eight dollars. The baseline still loses the change. On the persistence check alone, FixProof has evidence of a correction.

**1:54–2:13 · The control rejects the flawed correction**

Within the same flawed report, move to Immediate cart update. Show Regressed, the two conflicting readouts and the recorded comparison process exit.

> Now read the immediate update in that very same report. The baseline shows two and forty-eight dollars. The candidate still shows one and twenty-four dollars. FixProof labels the control regressed and returns exit one. An earlier attempt with incomplete control evidence was retained separately.

**2:13–2:36 · Restore the reviewed candidate and rerun**

Switch to the reviewed report in its own tab. Show its different run ID, restored candidate fingerprint and reload result.

> Next, the previously reviewed candidate was restored in the isolated cart. This is a separate comparison. Look at its new run ID and its different candidate fingerprint. With the same baseline, case, actions and expected values, the restored candidate keeps two items and forty-eight dollars after reload. Four other comparisons ended incomplete and remain available individually.

**2:36–2:53 · Both immediate readouts match**

In the reviewed report, open Immediate cart update. Show Passed in both versions, the two quantities and the recorded comparison exit.

> On the immediate check, both the baseline and the restored candidate now show two items and forty-eight dollars. The reviewed candidate passed both checks, and the command returned zero. Each check in this saved report links its verdict to its own build and validated evidence digest.

**2:53–3:07 · Reopen either report**

Close with the two saved report filenames and the exact preview command. Keep their comparison IDs separate.

> You can reopen either report locally. The exported repair brief records the control failure and the rerun command. For this cart, the second check tells the developer whether the customer sees the right total at the moment they click.

Four additional comparisons from this demonstration exited 2. Their individual reports are retained in `evidence/control-regression/attempts/`.

The earlier Meta proposal and brief are preserved under `evidence/repair-brief/` and `evidence/providers/`. The isolated flawed patch was constructed for the regression demonstration. Each displayed comparison uses its own recorded outcome.
