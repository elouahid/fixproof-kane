# Public-post drafts

## LinkedIn

I built FixProof for the Kane CLI Online Hackathon to answer a question I hit in QA and development. Did the change fix the reported behavior, and does the adjacent behavior still work?

The demo uses a synthetic cart with a deliberate persistence bug. At two items, the cart showed $48.00. Reloading sent the baseline back to one item and $24.00. I took the actual Kane browser failure to the coding agent, applied a small persistence fix, and ran the same expectation again. The candidate kept two items and $48.00 after reload. The immediate quantity and total check passed on both builds.

One part I cared about was the outcome when a run is missing evidence. FixProof marks that comparison incomplete and reports what blocked it. Each completed result shows the expected behavior, both observations, and the build fingerprints.

- Repository and repeat command · [add repository link]
- Three-minute walkthrough · [add YouTube link]

## Hacker News

**Title**

Show HN: FixProof, a before/after browser check for bug fixes

I built a small CLI workflow that takes a baseline URL, a candidate URL, an expected behavior, and a related control. It runs the same browser check with Kane on both builds and writes a report with what the browser observed.

The example is a cart with a seeded bug. One click took the baseline to quantity 2 and $48.00, then reload dropped it to 1 and $24.00. The candidate persists the updated quantity. Kane observed 2 and $48.00 after reloading it, and the no-reload control passed in both builds. A run with missing evidence stays incomplete.

The repository includes the two local cart versions, the case file, and browser evidence excerpts. You can inspect the example locally and repeat the live comparison with a Kane account. I’d be interested in which controls you keep next to a bug reproduction in your own workflow.

[add repository link] · [add YouTube link]
