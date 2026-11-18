# TodoMVC · Mark all after reopening one task

On TodoMVC’s JavaScript ES5 app, “Mark all” completed two tasks. Reopening one of them left the master checkbox checked. Clicking “Mark all” again reopened both tasks. The app’s own footer displayed **2 items left** when the specification called for **0**. This is scenario 2 of a bug reported independently in TodoMVC. The first reproduction used ordinary keyboard input and mouse clicks on the unmodified upstream distribution. [Issue #2310](https://github.com/tastejs/todomvc/issues/2310) · [Pinned requirement](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/app-spec.md#mark-all-as-complete) · [Unmodified Chrome reproduction](reproduction/README.md)

## Inspect the corrected comparison

Every cell comes from run `295349b1-92f7-4b39-8549-67953ea9cdcb`. Select a readout to open the original Kane browser capture. The comparison process exited **0**. [Full recorded report](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/report.json) · [Process receipt](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/process-capture.json) · [Evidence audit](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/audit.json)

| Frozen procedure, starting with two active tasks | Expected footer | Baseline | Local correction |
| --- | --- | --- | --- |
| Mark all → reopen Alpha → mark all again | 0 items left | [2 items left · failed](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/baseline-mark-all-after-reopening.jpg) | [0 items left · passed](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/candidate-mark-all-after-reopening.jpg) |
| Mark all → reopen Alpha | 1 item left | [1 item left · passed](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/baseline-reopen-one.jpg) | [1 item left · passed](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/candidate-reopen-one.jpg) |

To open this saved run in the FixProof viewer, run the following from the project root in PowerShell. Node.js 20 or later is sufficient. The report, screenshots and receipt are included.

```powershell
$env:FIXPROOF_CART_PORT = '8767'
node app/server.mjs --report evidence/todomvc/runs/295349b1-92f7-4b39-8549-67953ea9cdcb/report.json
```

Open [the local saved report](http://127.0.0.1:8767/). Expand a check for its expected text, screenshot, pack digest and build fingerprint. Each attempt below can be opened the same way using its own report path.

## From failure to local correction

Before editing source, both endpoints served the same original view. Run `8680b040-e985-4090-b39f-3e161d99cd51` reproduced the primary failure on both endpoints and passed both controls. FixProof returned **1** and exported a repair brief containing the readouts, the source digest and the frozen rerun command. [Before report](runs/8680b040-e985-4090-b39f-3e161d99cd51/report.json) · [Brief supplied to Codex](briefs/8680b040-e985-4090-b39f-3e161d99cd51.md)

Codex changed one assignment in the local candidate. TodoMVC was writing the checked state to the clickable label. The next click reads the native checkbox, so the renderer now writes to that checkbox. The control tests the intermediate state immediately before the faulty final click. Verification covers this sequence on these two local builds. [Original view](../../targets/todomvc/upstream/view.js) · [Corrected view](../../targets/todomvc/candidate/view.js)

| Identity | Recorded value |
| --- | --- |
| Upstream application revision | `ff43b02e59dfa604386bb382034b2cd07c2bcd8a` |
| Frozen case SHA-256 | `4e7b0de1382f4e5a7023b75d7affb530f46b1056b1a168a885d99246e0dd8cc6` |
| Tested baseline build | `sha256-1f9dba67c86494bbd019f8843b283233004af53ced7f4c1abe57c431ece9d538` |
| Tested candidate build | `sha256-24778b49a471337950f699122434ac1fcbf064e095da46509d3ee7d339f5868a` |

Both builds seed Alpha and Beta through TodoMVC’s own model and store. The shared fixture identifies the existing clickable label, row checkbox and real footer. The master label has a button role and its existing text as its accessible name. TodoMVC handles the clicks and calculates the readout. The server fingerprints the adapter and served bytes. Only `view.js` differed in the final comparison. [Case](../../cases/todomvc-es5.json) · [Frozen record](freeze.json) · [Build manifests](tested-builds.json) · [Independent HTTP and browser check](diagnostics/final-target-parity.json) · [Target setup and licenses](../../targets/todomvc/README.md)

## Repeat the live comparison

Use Chrome and an authenticated Kane CLI installation with credits. The recorded executions used CLI 0.10.4. From the repository root, start the two builds in one terminal.

```sh
node targets/todomvc/serve.mjs
```

With the server running, repeat the frozen comparison from a second terminal.

```sh
node scripts/compare-todomvc.mjs
```

The command starts four new Kane browser sessions and writes a new report and its measured process exit under `.fixproof/runs/<run-id>/`. A future execution can return incomplete when Kane cannot substantiate a required click. The saved comparisons above can be viewed offline with no credits or account. Raw private Kane packs include additional session metadata. The review package includes the exact comparison reports, measured receipts, pack digests and the original JPEGs for conclusive rows.

## All four comparisons

| Attempt | What this execution established | Recorded exit | Kane credits, rounded |
| --- | --- | ---: | ---: |
| [Initial selector fixture](runs/15b9bd8e-a344-4718-b856-d03ea3e0201b/report.json) | Kane selected the master label by visible text. The frozen contract could not confirm any of the four procedures. | 2 | 85.156660 |
| [Shared accessible locator](runs/c87e04de-ed53-4384-b417-4c57f40155e3/report.json) | Baseline failed the primary and passed the control. The unmodified candidate’s control passed. Its primary lacked executed DOM-click confirmations. | 2 | 70.992348 |
| [Unmodified pair](runs/8680b040-e985-4090-b39f-3e161d99cd51/report.json) | Both primary checks failed and both controls passed. This run supplied the coding-agent brief. | 1 | 73.268678 |
| [One-line correction](runs/295349b1-92f7-4b39-8549-67953ea9cdcb/report.json) | Baseline failed the primary. Candidate passed the primary. Both passed the control. | 0 | 67.220712 |

Across 16 browser checks, Kane’s per-session meters recorded **296.638397 credits**. The account’s available-balance readings before and after were 10,270.414 and 9,940.5796. The CLI did not itemize the difference between that account-level change and the per-session total. The integration used one in-session Codex correction and zero separate Meta or Baseten API requests. There was no paid top-up. Codex token usage is unavailable. The earlier Meta-assisted cart repair remains a separate case. [Fixture revision](fixture-revision.json) · [Cart compatibility check](diagnostics/cart-verification.json)

All 16 sealed packs passed Kane’s local validation and were finalized. Seven primary packs, including the final baseline, emitted both `l1.failure.status_disagrees` and `l1.failure.missing`. FixProof’s existing evaluation separately checks the executed click sequence, named readout, terminal assertion and upload outcome. The first two comparisons still have an incomplete overall result. All 176 successful application resource responses in the four comparisons carried their expected local build header. [Per-pack diagnostics and digests](diagnostics/pack-validation.json)

The recording addition shows the upstream issue, the first complete failure, the changed assignment and the separately recorded successful comparison. [Timed narration and submission wording](../../publication/TODOMVC-REVIEW.md)
