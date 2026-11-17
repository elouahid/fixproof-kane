# FixProof

FixProof runs the same browser check on a baseline and a candidate, then reports what changed. Give it two application URLs, an expected behavior and one to three controls. Kane CLI drives Chrome. The report records each build fingerprint, browser readouts and the validated evidence pack.

The example cart uses synthetic data and a deliberately introduced bug. Increasing one $24.00 item to two shows $48.00 immediately. The baseline stores the previous quantity, so a reload drops back to one item and $24.00. The candidate stores the updated quantity. The no-reload check verifies that the live quantity and total still update.

## Open the local preview

Use Node.js 20 or later. From the project folder, run:

```sh
node app/server.mjs
```

Open [the local FixProof preview](http://127.0.0.1:8741/). With no report selected, it shows the recorded example. The baseline and candidate links open independent cart deployments. Use **Reset cart** before an interaction.

## Open a saved comparison

On Windows, leave the comparison server running and use a second port for the selected report. Replace the example path with the `report.json` path printed by the run.

```powershell
$env:FIXPROOF_CART_PORT = '8742'
node app/server.mjs --report '.fixproof/runs/<run-id>/report.json'
```

Open [the saved comparison](http://127.0.0.1:8742/) or the [recorded example](http://127.0.0.1:8742/example/). The server reads the selected report at startup and serves only its display fields. Restart the preview to open a different report. Reports from before timestamps were recorded show the date as unavailable.

## Repeat the Kane comparison

Install Chrome and sign in to a TestMu AI account with available Kane credits. The workflow was verified on Windows with Kane CLI 0.10.4. [Kane CLI quickstart](https://www.testmuai.com/docs/kane-cli-quickstart)

```sh
npm install --global @testmuai/kane-cli@0.10.4
kane-cli login --oauth
```

Leave the local server running and start the comparison in another terminal.

```sh
node compare.mjs cases/cart.json
```

Open `report.md` in the result directory printed by the command. The directory also contains `report.json`, the exact case, the original Kane output streams, and any sealed evidence packs. Keep generated `.fixproof/` folders private. Kane packs can contain TestMu AI account metadata and application network logs. The packaged screenshots and audit provide a review path from the recorded run. [Recorded verification](VERIFICATION.md) · [Kane evidence documentation](https://www.testmuai.com/docs/kane-cli-evidence)

The command exits `0` when all candidate checks pass with complete comparisons, `1` when a candidate check fails with evidence, and `2` when any comparison is incomplete. A baseline-only reproduction is available via `node compare.mjs cases/cart.json --baseline`. It preserves its runs and exits `0` when the baseline results are conclusive, including a reproduced bug.

## Export a repair brief

From the project root, select a completed comparison report, its exact case file, and each candidate source file you want the coding agent to inspect. Repeat `--source` for additional files.

```powershell
node repair-brief.mjs --report '.fixproof/runs/<run-id>/report.json' --case 'cases/cart.json' --source 'app/candidate.js' > repair-brief.md
```

The brief includes the required procedure, observed results, evidence digests, and a command to repeat the same case and controls. Its source references are project-relative and include current SHA-256 hashes. Give the agent the brief and access to only those files. Review the proposed edit, then run the command printed in the brief.

To record local source hashes for future briefs, run the comparison with `--candidate-source` once per selected file. FixProof captures the hashes before and after the run. If the hashes were stable, the brief identifies current files that differ from the saved snapshot. The report's build fingerprints identify the tested deployments. Local snapshots record file identity at the comparison boundaries.

```powershell
node compare.mjs cases/cart.json --candidate-source app/candidate.js
```

## Use your own case

Copy `cases/cart.json`. Set the baseline and candidate URLs, and name the HTTP response header containing each build identifier. Both URLs need to answer `HEAD` and supply that header. The demo fingerprints the served cart HTML, CSS and JavaScript. Keep both builds stable during the run.

For each check, supply the browser instructions, the expected behavior, the exact visible text to observe, and an ordered `actionContract`. Schema version `2` supports named button clicks with an HTML ID and accessible name, followed by an optional same-page reload. Use the literal placeholder `${appUrl}` when an instruction needs to reopen the tested URL. Extra, missing, wrong-target or unconfirmed actions leave the result incomplete. The original `cases/cart-v1.json` is retained for historical comparison. Use test accounts or synthetic data suitable for Kane’s evidence capture.

A conclusive result requires a compatible Kane exit and assertion outcome, a usable upload, a validated evidence pack, and matching browser action and field records. Authentication, infrastructure, upload and missing execution evidence can all produce an incomplete result. FixProof preserves every run and applies zero automatic edits. The documented correction used one candidate edit after the reproduced failure.

## Review materials

- [Final recording walkthrough](publication/RECORDING.md) and [cart control demonstration reports](evidence/control-regression/README.md).

- [Actual before/after evidence](VERIFICATION.md)
- [Repair brief and demonstrated handoff](evidence/repair-brief/README.md)
- [Meta and Baseten contribution and usage](evidence/providers/README.md)
- [Submission fields](publication/SUBMISSION.md) and [two post drafts](publication/POSTS.md)
