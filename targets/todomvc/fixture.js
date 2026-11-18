(() => {
  // Use the same in-memory store and creation method as the application's new-todo field.
  const model = new window.app.Model(new window.app.Store("javascript-es5"));
  let alphaId;
  model.create("Alpha", ([created]) => { alphaId = created.id; });
  model.create("Beta");

  const list = document.querySelector(".todo-list");
  const master = document.querySelector(".toggle-all-label");
  master.id = "master-toggle";
  // The upstream label runs the bulk action through its own click handler.
  // Use its original text as the accessible name, excluding the CSS arrow.
  master.setAttribute("role", "button");
  master.setAttribute("aria-label", master.textContent.trim());
  document.querySelector(".todo-count").id = "remaining-count";
  // The application owns the rows and may replace them after a filter change.
  new MutationObserver(() => {
    const checkbox = list.querySelector(`li[data-id="${alphaId}"] .toggle`);
    if (checkbox) checkbox.id = "alpha-toggle";
  }).observe(list, { childList: true });
})();
