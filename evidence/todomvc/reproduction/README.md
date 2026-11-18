# Reproducing TodoMVC issue #2310 in Chrome

TodoMVC’s ES5 implementation showed **2 items left** after the user tried to complete the list. The same checkout passed the two-click control. These files capture the original feasibility check with real browser clicks on the unmodified upstream distribution. The two procedures each started on a freshly loaded page with two active tasks. [Upstream issue](https://github.com/tastejs/todomvc/issues/2310) · [Pinned requirement](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/app-spec.md#mark-all-as-complete)

| Procedure after adding tasks `a` and `b` | Expected footer | Recorded footer |
| --- | --- | --- |
| Click the master toggle, uncheck `a`, then click the master toggle again | 0 items left | [2 items left](primary-after-final.png) |
| Click the master toggle, then uncheck `a` | 1 item left | [1 item left](control-after-prefix.png) |

Immediately before the final master click, the master checkbox was still checked even though `a` was active. The last click then left both tasks active. The stored observations include the native checkbox states, titles, footer and capture times from Chrome 157.0.8103.79. [Browser readouts](observations.json)

## Repeat on the upstream checkout

```sh
git clone https://github.com/tastejs/todomvc.git todomvc-checkout
git -C todomvc-checkout checkout --detach ff43b02e59dfa604386bb382034b2cd07c2bcd8a
python -m http.server 8779 --bind 127.0.0.1 --directory todomvc-checkout/examples/javascript-es5/dist
```

Open `http://127.0.0.1:8779/` in a browser. Type `a` in the task field and press Enter, then do the same for `b`. Click the chevron to the left of the task field for the master toggle. Click the circle beside `a` for an individual toggle. Follow the rows above separately, refreshing and entering the two tasks before each. The upstream store keeps these tasks in page memory.

With Chrome and Python Selenium installed, a second terminal can repeat the same mouse and keyboard actions programmatically. The optional `--driver` argument takes a matching ChromeDriver path.

```sh
python evidence/todomvc/reproduction/probe.py http://127.0.0.1:8779/
```

The tested application comes from TodoMVC (MIT). Its standalone distribution bundles `todomvc-common` 1.0.5 (MIT) and Sindre Sorhus’s `todomvc-app-css` 2.4.2 (CC BY 4.0). The captures show the original styling. [Pinned distribution](https://github.com/tastejs/todomvc/tree/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/examples/javascript-es5/dist) · [TodoMVC license](https://github.com/tastejs/todomvc/blob/ff43b02e59dfa604386bb382034b2cd07c2bcd8a/license.md) · [App CSS](https://www.npmjs.com/package/todomvc-app-css/v/2.4.2) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
