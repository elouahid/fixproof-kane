# Repair-brief handoff

The demonstration used an isolated copy of stable checkpoint `685e5052ddfde79a9c6edde5caf4293f364b41a4`. The starting candidate deliberately used the cart's buggy baseline code. In the saved case, both URLs point at loopback port `8751`. The action contract, expected values and control are the same as in the project case. Both runs use the isolated case SHA-256 `fd3c4e496757168131283e37d420d156f557cfcc1683105994e8dfb5d56a61e2`. [Isolated case](cart-repair.json)

## Failure and brief

Run `2a77f2c6-e2a3-4c0c-bed9-c32809ee00af` recorded a candidate failure. After exactly one increase and a reload, the candidate showed **1 item and $24.00** against **2 items and $48.00** expected. Both immediate-update controls passed. The baseline reload result was incomplete because Kane stopped before capturing the structured readings and terminal assertion. The overall command exited `2`. [Before report and validated pack references](before.json)

The exact export command ran from `.fixproof/repair-demo` in the project workspace.

```powershell
node repair-brief.mjs --report '.fixproof/runs/2a77f2c6-e2a3-4c0c-bed9-c32809ee00af/report.json' --case 'cases/cart-repair.json' --source 'app/candidate.js' > repair-brief.md
```

The [generated brief](repair-brief.md) has SHA-256 `d499ea711e7ad299cebaf8062f5a01c5e49fbc2151059ca311dc5c4bdf7e494d`. Its `app/candidate.js` reference is relative to the isolated project's root. The matching file at export time had SHA-256 `4bdd004a636d0d5e7c88b3443c249017a2eca2aa77425464fe6f857e2a08e3f9`.

## Proposal and applied edit

Meta received the exact exported brief and the bytes of the one selected synthetic source file. It proposed moving the storage write below the clamped quantity update. I reviewed the proposal and applied that edit only in the isolated candidate. The obsolete fixture comment was removed from the corrected candidate. The applied file has SHA-256 `f467396af5c96c8aec0c8893dbfe89000fd0656430110f0bd781bb42444f10fc`. Re-exporting against the old report flagged that the current file differed from the recorded local snapshot and still showed the old tested build fingerprint. [Actual Meta proposal](../providers/meta-repair-brief-proposal-answer.md) · [Request and usage](../providers/meta-repair-brief-proposal.json)

## Unchanged retest

The exact command printed in the brief ran from the same isolated project and exited `0` in run `b14bfe56-2679-4b26-b815-773ce9d1475b`. The case file and generated objectives matched the initial run. [After report and validated pack references](after.json)

```powershell
node compare.mjs "cases/cart-repair.json" --candidate-source "app/candidate.js"
```

| Check | Original candidate | Retested baseline | Retested candidate |
| --- | --- | --- | --- |
| Cart persistence | Fail · 1 item, $24.00 | Fail · 1 item, $24.00 | Pass · 2 items, $48.00 |
| Immediate cart update | Pass · 2 items, $48.00 | Pass · 2 items, $48.00 | Pass · 2 items, $48.00 |

The corrected candidate's tested fingerprint is `ed90d3abeacec729cbb79c71c2b353729b041dcf7da8078204513e99d7ee246a`. The baseline retained fingerprint `b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea`. The pack audit binds the fingerprints to the same-URL document responses recorded by Chrome.

Open the exact saved retest from the isolated project folder in PowerShell.

```powershell
$env:FIXPROOF_CART_PORT = '8752'
node app/server.mjs --report '.fixproof/runs/b14bfe56-2679-4b26-b815-773ce9d1475b/report.json'
```

Open [the saved retest](http://127.0.0.1:8752/). From a clean source ZIP, pass `evidence/repair-brief/after.json` to the same preview command to open the sanitized copy. The staged source in the archive is the working project. The original briefing reference points to the isolated buggy candidate at the time of export.

## Recording sequence

1. Open the saved failure and show the candidate's 1 item and $24.00 after reload. Point out the baseline's incomplete evidence and the passing control.
2. Show the generated brief with the case hash, exact action contract, observed failure, evidence digests, and the single selected source reference.
3. Show the actual proposed diff and the applied isolated edit. Run the brief's comparison command.
4. Open the exact saved retest and show the tested candidate fingerprint, post-reload readout, and both immediate-update controls.
