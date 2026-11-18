# TodoMVC test target

This is the JavaScript ES5 example from TodoMVC revision `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`. The TodoMVC team developed the application. FixProof exercises its reported bulk-completion defect locally. The requirement specifies that the master checkbox follows changes to individual items. [Original issue, scenario 2](https://github.com/tastejs/todomvc/issues/2310) · [Pinned specification](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/app-spec.md#mark-all-as-complete)

## Start the two builds

From the FixProof repository root, run the following command using Node.js 20 or later.

```sh
node targets/todomvc/serve.mjs
```

Open the [baseline](http://127.0.0.1:8771/baseline/) or the [candidate](http://127.0.0.1:8771/candidate/). Each page load starts a fresh in-memory list with two active items named Alpha and Beta. Both builds use the same fixture. To perform the reported sequence manually, click the master chevron, click Alpha's checkbox, then click the master chevron again. The application's footer shows how many items remain active.

The adapter loads its assets into memory at startup. Restart it after editing a candidate. The candidate serves `candidate/view.js` in place of the pinned upstream `view.js`. The remaining files come from the same upstream distribution and the same fixture. Every successful asset response carries the build’s `X-FixProof-Version` header. To print the underlying per-file hashes for the files on disk, run the following command.

```sh
node targets/todomvc/serve.mjs --manifest
```

The version is SHA-256 of the UTF-8 JSON serialization of the adapter schema number, upstream revision, adapter source digest and alphabetically sorted asset digests. It includes the HTML bytes **after** fixture insertion, the fixture script, the selected view and the other distributed assets. Two routes serving identical bytes from this adapter have the same fingerprint.

## Fixture and attribution

`fixture.js` uses TodoMVC's own `Model.create` and named in-memory store before app initialization. It adds three DOM IDs to existing elements for stable selection. These identify the master label, Alpha's checkbox and the footer count. TodoMVC handles every click, computes the count and renders the result. The adapter omits the informational sidebar script from the served HTML to keep the browser local. The original script remains available in the upstream snapshot. [Fixture](fixture.js) · [Adapter](serve.mjs)

The eleven files under `upstream/` are original Git blob bytes from the pinned distribution. Their SHA-256 digests and the bundled npm package versions are recorded in the manifest. [Pinned distribution](https://github.com/tastejs/todomvc/tree/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/examples/javascript-es5/dist) · [Original asset manifest](upstream.json)

- The TodoMVC example is under the MIT license. Copyright belongs to Addy Osmani, Sindre Sorhus, Pascal Hartig and Stephen Sawchuk. The original page credits Oscar Godson and Christoph Burgmer. [Upstream license](licenses/todomvc.md)
- `base.js` and `base.css` are unchanged from `todomvc-common` 1.0.5 by TasteJS under the MIT license. The distributed JavaScript credits Underscore for its template module. [Package license](licenses/todomvc-common.txt) · [Underscore](https://underscorejs.org/)
- `index.css` is unchanged from `todomvc-app-css` 2.4.2 by Sindre Sorhus under CC BY 4.0. [Package license](licenses/todomvc-app-css.txt) · [License and attribution terms](https://creativecommons.org/licenses/by/4.0/)
