# FixProof submission update for review

## Project description

FixProof helps a developer answer two questions after a bug fix. Did the reported behavior change, and does a nearby behavior still work? It runs the same frozen browser checks on a baseline and a candidate with Kane CLI, then verifies the recorded actions and visible results. A developer can reopen the evidence or give the failure and selected source to a coding agent.

In our synthetic cart, a deliberately flawed fix passed the reload check but regressed the immediate total. FixProof exited 1. The reviewed cart correction passed both checks in a separate comparison and exited 0.

We also tested a reported bug in TodoMVC, an independently developed open-source app. After reopening one task, “Mark all” left two tasks active. A coding agent received the recorded failure and made a one-line local correction. On the unchanged retest, TodoMVC’s footer showed zero active tasks on the candidate and two on the baseline. The control showed one active task on both builds. That comparison exited 0. [TodoMVC report and screenshots](../evidence/todomvc/README.md)

## How we used the tools

Codex developed FixProof and made the local TodoMVC edit from the exported brief. Kane CLI drove Chrome against both builds, recorded the clicks and assertions, and sealed the evidence. FixProof checked the recorded procedure and exact footer values before reporting a verdict. The earlier cart demonstration also includes a separate Meta patch proposal. [TodoMVC coding-agent brief](../evidence/todomvc/briefs/8680b040-e985-4090-b39f-3e161d99cd51.md) · [Earlier cart handoff](../evidence/repair-brief/README.md)

## Recording guide

The local review MP4 runs **3:57.188**. The first 3:07 is the existing cart walkthrough. The new segment uses offline synthetic English narration and selectable captions. To review just the addition, start at **3:07**. The verified file is `fixproof-todomvc-review.mp4` (5,790,877 bytes). [Media checksum, timing and verification](todomvc-video.json) · [Original cart recording guide](RECORDING.md)

**3:07–3:20 · Open the original issue.** Show the issue heading and scenario 2. [Issue #2310](https://github.com/tastejs/todomvc/issues/2310)

> Does the same workflow work outside the cart? A user reported a bug in the TodoMVC JavaScript example. After reopening one task, the master switch should complete both tasks again.

**3:20–3:33 · Show the first complete comparison.** Point to the original baseline screenshot from run `8680b040` and the footer. [Original baseline capture](../evidence/todomvc/runs/8680b040-e985-4090-b39f-3e161d99cd51/baseline-mark-all-after-reopening.jpg)

> In the first complete Kane comparison, we marked Alpha and Beta complete, reopened Alpha, and clicked the master switch again. The original app showed two items left. We expected zero.

**3:33–3:42 · Show the local source edit.** Highlight the single changed assignment in the view. [Brief](../evidence/todomvc/briefs/8680b040-e985-4090-b39f-3e161d99cd51.md) · [Candidate source](../targets/todomvc/candidate/view.js)

> The coding agent received the failure evidence and the original JavaScript view. The one-line correction writes the checked state to the native checkbox instead of its label.

**3:42–3:57 · Show the unchanged retest.** Open run `295349b1`. Point to the primary row, the control directly below it and exit 0. [Saved report](../evidence/todomvc/runs/295349b1-92f7-4b39-8549-67953ea9cdcb/report.json) · [Local viewer](http://127.0.0.1:8767/)

> In a separate retest, the same three clicks now left zero active tasks. Stopping after reopening Alpha still showed one item left on both builds. The comparison exited zero. You can reopen this saved report locally.

## Review and publication timing

The external result covers scenario 2 of TodoMVC issue #2310, on the pinned ES5 build in Chrome. The correction is local. The review package retains both incomplete executions and the original complete reports. [Upstream issue](https://github.com/tastejs/todomvc/issues/2310) · [All four attempts](../evidence/todomvc/README.md#all-four-comparisons)

The existing submission points to the published repository, cart preview and 3:07 walkthrough. Review the new local video and source together before choosing which revision to publish. The requested publication target is **November 19, 2026 at 17:00 Casablanca**. The official deadline is **19:29 Casablanca** that day. [Published source](https://github.com/elouahid/fixproof-kane) · [Published cart preview](https://elouahid.github.io/fixproof-kane/) · [Published video](https://youtu.be/SW1Dju1sNsQ) · [Organizer schedule](https://www.kaneclihack.sh/)
