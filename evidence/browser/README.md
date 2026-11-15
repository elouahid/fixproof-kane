# Kane browser evidence

Each JPEG is a byte-for-byte copy of a screenshot from a Kane CLI 0.10.4 evidence pack. The cart uses a synthetic product and local test data. The SHA-256 digests identify the independently validated source packs. The raw packs can contain account and Test Manager metadata and are held locally.

## Original failure observation

After one quantity increase and a reload, the cart should show quantity **2** and cart total **$48.00**.

- [Original before reload](original-before.jpg) shows quantity **2** and **$48.00**.
- [Original after reload](original-after.jpg) shows quantity **1** and **$24.00** on the same baseline build. The actions log records a successful browser refresh, and the network log records two HTTP 200 document requests to `/baseline/`.

Kane reported result code `710`. Both recorded assertion actuals agreed with the screenshots. The final event omitted the named values from `final_state`, so the initial structured result was incomplete. This evidence was used as the input for the patch proposal. The revised run used an explicit same-page navigation and distinct observation names while retaining the same expected behavior.

Source pack `164ad520-8508-44bf-bf5e-344b3fe2f1df.evidence`, SHA-256 `ef3ee73c3e109dd71947190f2848dc7113d52a82542d3aceff4e804f2bb8f24f`. The screenshots are pack steps `4-0-4` and `6-0-6`.

## Original paired comparison

The original paired comparison is run `4c8b13ad-7571-4436-9b6c-65794fe2b907`. The build identifiers below were visible in the screenshots and matched the `X-FixProof-Version` headers on the Chrome document requests.

- Baseline `b82cc3bc8ee2c04133b8043ea58af147cab9c504a09818441f3d5103b7a50fea`
- Candidate `ed90d3abeacec729cbb79c71c2b353729b041dcf7da8078204513e99d7ee246a`

| Screenshot | Observed quantity and total | Kane result | Chrome document requests | Source pack SHA-256 |
| --- | --- | --- | ---: | --- |
| [Baseline after reload](baseline-refresh.jpg) | 1 and $24.00 | Failed, `740` | 2 × HTTP 200 | `8e97a0d60257e994d8efe86822e33a3af51719f314e15b2490f088370b8f647e` |
| [Candidate after reload](candidate-refresh.jpg) | 2 and $48.00 | Passed, `100` | 2 × HTTP 200 | `c9857e581665577503fa7aa608adb40a4c99b04448816b319cadfdcc0084d691` |
| [Baseline with no reload](baseline-control.jpg) | 2 and $48.00 | Passed, `100` | 1 × HTTP 200 | `dacdf536b0589163f8e4eeb6b8448bc436467618b10c6d3ceab21befad497e3c` |
| [Candidate with no reload](candidate-control.jpg) | 2 and $48.00 | Passed, `100` | 1 × HTTP 200 | `e603b7a664994d1026e5ba05808874e8e5cbb34f67672475eb30a3850f3e0dfc` |

The baseline reload run saved both visible values before Kane stopped at the first mismatch, quantity 1 where it expected 2. The candidate reload and both live-total runs had separate successful quantity and total subassertions. The packs passed Kane's L1 validation. The reload screenshots came from pack step `7-0-7` and the control screenshots from pack step `5-0-5`.

## Full rerun

Run `7fb17965-6f59-463d-a4fd-406478de64c7` reproduced the same results. Its four validated evidence packs have distinct IDs and SHA-256 digests. Each contained a result screenshot that matched the corresponding file above byte-for-byte. [Fresh evidence manifest](../free-credit-rerun.json)
