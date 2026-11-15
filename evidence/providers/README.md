# Provider usage

FixProof verification runs with Kane. The coding and acceptance-review calls are development evidence. They do not determine the comparison verdict.

## Access and pricing on November 15, 2026

- Meta Model API returned HTTP 200 and the expected `OK` with `muse-spark-1.3` in standard mode. Its rates were $1.25 per million uncached input tokens, $0.15 per million cached input tokens and $4.25 per million output tokens. The signed-in billing view could not be read. The patch request relied on the stated available promotional balance, with the expiration unverified. [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) · [Meta reasoning](https://dev.meta.ai/docs/reasoning)
- Baseten's authenticated catalog listed the configured `meta-models/muse-spark-open-1026` at $1.25 per million input tokens and $4.25 per million output tokens with a zero request fee. That exact route returned HTTP 400 because its model version was deactivated. The original grant notice gave no expiration date, and current credit validity was unverified. [Exact catalog result](baseten-model-catalog.json) · [Baseten reasoning and billing](https://docs.baseten.co/inference/model-apis/reasoning)

## Requests

| Request | Outcome | Input | Output | Reasoning included in output | Estimated USD |
| --- | --- | ---: | ---: | ---: | ---: |
| [Meta availability](meta-availability.json) | HTTP 200, `OK` | 25 | 28 | 18 | $0.000150250 |
| [Meta cart patch](meta-cart-repair.json) | HTTP 200, focused correction proposed | 734 | 1,105 | 739 | $0.005613750 |
| [Meta action-contract review](meta-action-contract-review.json) | HTTP 200, action evidence reviewed | 2,105 | 1,054 | 603 | $0.007110750 |
| [Meta repair-brief proposal](meta-repair-brief-proposal.json) | HTTP 200, one-file diff proposed | 1,235 | 554 | 418 | $0.003898250 |
| [Baseten catalog](baseten-model-catalog.json) | HTTP 200, exact matched entry | — | — | — | — |
| [Baseten availability](baseten-availability-initial.json) | API error, first recorder missed HTTP status | Unknown | Unknown | Unknown | Unknown |
| [Baseten diagnostic](baseten-availability-diagnostic.json) | HTTP 400, configured model version deactivated | Unknown | Unknown | Unknown | Unknown |

The four Meta requests returned 4,099 input tokens and 2,741 output tokens, including 1,778 reasoning tokens. The estimated Meta total was $0.016773000. The first Baseten attempt's usage was unrecorded, and the diagnostic response returned no usage. No paid top-ups were made.

## Meta contribution

The [submitted prompt](meta-cart-repair-prompt.md) included the actual Kane Chrome observations from before and after a reload, the exact tested baseline version, the unchanged expectation and control, and the starting candidate source. The [returned proposal](meta-cart-repair-answer.md) located the write to local storage before the clamped quantity update and proposed moving it immediately after that update. It also identified the risk of changing the maximum item quantity. The proposal's exploratory statements are separate from the browser findings in the verification report.

The [action-contract review prompt](meta-action-contract-review-prompt.md) included the authored offline reproduction, the parser at checkpoint `22e9448`, and a sanitized excerpt of actual Kane action markers. One bounded request to `muse-spark-1.3` in Standard mode returned a design review. Meta recommended matching the ordered mutation sequence and binding each click to the successful DOM locator in the sealed runner log. It flagged fallback-only clicks, extra reloads, off-URL navigation, failed mutation attempts, and missing or misplaced witnesses as counterexamples. [Returned review](meta-action-contract-review-answer.md)

The action-contract request used the existing promotional authorization. Current Meta standard rates were verified again, and promotion expiry remained unverified. The repair used the recorded Baseten deactivation to avoid further requests to that route. [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits)

For the isolated repair-brief demonstration, one Standard-mode request sent the [generated failure brief and explicitly selected synthetic candidate source](meta-repair-brief-proposal-prompt.md) verbatim inside the request. The [returned diff](meta-repair-brief-proposal-answer.md) moves the storage write after the clamped quantity update and removes the regression-fixture comment. The [request record](meta-repair-brief-proposal.json) identifies the exact inputs and the complete request by SHA-256. The call used the existing promotional authorization. Published rates were rechecked with promotion expiry still unverified. [Meta pricing](https://dev.meta.ai/docs/pricing-rate-limits) · [Meta reasoning](https://dev.meta.ai/docs/reasoning)

## Baseten review brief

The deactivated route prevented a Baseten model review. The planned review was to inspect the candidate diff and the observed baseline mismatch, identify a specific way the patch could appear to fix refresh while damaging decrement or reset, and propose the smallest browser action sequence that would expose that regression. It would also check whether the evidence distinguished a real post-refresh observation from a value collected before refresh.

The local source review confirmed the candidate computes and clamps the next quantity before storing it, and shares that path across Increase and Decrease. A [supplemental Chrome check](../supplemental/chrome-quantity-boundaries.json) verified that the top quantity survived reload and kept Increase disabled, and that decreasing also survived reload. The Kane comparison uses the original one-click expectation and immediate-total control.
