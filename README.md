# FixProof

FixProof runs the same browser check on a baseline and a candidate, then reports what changed. Give it two application URLs, an expected behavior and one to three controls. Kane CLI drives Chrome. The report records each build fingerprint, browser readouts and the validated evidence pack.

The example cart uses synthetic data and a deliberately introduced bug. Increasing one $24.00 item to two shows $48.00 immediately. The baseline stores the previous quantity, so a reload drops back to one item and $24.00. The candidate stores the updated quantity. The no-reload check verifies that the live quantity and total still update.

## Open the local preview

Use Node.js 20 or later. From the project folder, run:

```sh
node app/server.mjs
```

Open [the local FixProof preview](http://127.0.0.1:8741/). The baseline and candidate links open independent cart deployments. Use **Reset cart** before an interaction.

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

## Use your own case

Copy `cases/cart.json`. Set the baseline and candidate URLs, and name the HTTP response header containing each build identifier. Both URLs need to answer `HEAD` and supply that header. The demo fingerprints the served cart HTML, CSS and JavaScript. Keep both builds stable during the run.

For each check, supply the browser actions, the expected behavior and the exact visible text to observe. Use the literal placeholder `${appUrl}` when an action needs to reopen the relevant version URL. `samePageReload` is optional. Set it to `true` to require a return to the same URL following a click, or `false` to require an on-page observation following a click. Use test accounts or synthetic data suitable for Kane’s evidence capture.

A conclusive result requires a compatible Kane exit and assertion outcome, a usable upload, a validated evidence pack, and matching browser action and field records. Authentication, infrastructure, upload and missing execution evidence can all produce an incomplete result. FixProof preserves every run and applies zero automatic edits. The documented correction used one candidate edit after the reproduced failure.

## Review materials

- [Actual before/after evidence](VERIFICATION.md)
- [Meta and Baseten contribution and usage](evidence/providers/README.md)
- [Submission fields](publication/SUBMISSION.md) and [two post drafts](publication/POSTS.md)
