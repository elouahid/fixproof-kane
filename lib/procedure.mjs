export const nonMutating = new Set(['wait', 'analyze', 'assert']);

export function validActionContract(contract) {
  if (!Array.isArray(contract) || contract.length === 0) return false;
  const lastIsReload = contract.at(-1)?.type === 'reload';
  const clicks = lastIsReload ? contract.slice(0, -1) : contract;
  return clicks.length > 0 && clicks.every((action) =>
    action?.type === 'click' && typeof action.target?.id === 'string' && /^[a-z][a-z0-9_-]{0,69}$/i.test(action.target.id) &&
    typeof action.target.name === 'string' && /^[^\r\n\u0000]{1,100}$/.test(action.target.name) &&
    action.target.name.trim() === action.target.name);
}

function sameUrl(actual, expected) {
  try {
    return typeof actual === 'string' && new URL(actual).href === new URL(expected).href;
  } catch {
    return false;
  }
}

// An action record can contain a planned locator even when execution fell back to coordinates.
function executedDomClicks(log) {
  if (typeof log !== 'string') return [];
  const clicks = [];
  let domStep = null;
  for (const line of log.split(/\r?\n/)) {
    const start = /^\[BrowserRunner\] Starting-Node: (\S+) Step: (\d+)$/.exec(line);
    if (start) domStep = start[1] === 'dom_action' ? Number(start[2]) : null;
    const completed = /^\[BrowserRunner\] DOM Action: Clicked via DOM locator: (.+) — success$/.exec(line);
    if (completed) clicks.push({ step: domStep, selector: completed[1] });
  }
  return clicks;
}

function matchesTarget(record, execution, target) {
  const selectors = record.selectors;
  if (record.frame_info != null || !Array.isArray(selectors) || selectors.length !== 1) return false;
  const selector = selectors[0]?.selector;
  if (selector !== execution?.selector || record.step !== execution?.step) return false;
  const name = JSON.stringify(target.name);
  return selector === `#${target.id}` || selector === `internal:role=button[name=${name}i]` ||
    selector === `internal:role=button[name=${name}s]`;
}

export function verifyActionContract(actions, runnerLog, contract, url) {
  if (!validActionContract(contract)) return { issue: 'A valid action contract is required.' };
  const mutations = actions.filter((action) => !nonMutating.has(action.action_type));
  const [entry, ...procedure] = mutations;
  if (entry?.action_type !== 'navigate' || !sameUrl(entry.action_params?.url, url)) {
    return { issue: 'The first browser action must be navigation to the tested URL.' };
  }
  if (procedure.length !== contract.length) {
    return { issue: `Expected ${contract.length} actions after entry but recorded ${procedure.length}.` };
  }
  if (mutations.some((action, index) => action.status !== 'success' || !Number.isSafeInteger(action.step) ||
      (index > 0 && action.step <= mutations[index - 1].step))) {
    return { issue: 'The procedure contains an unsuccessful action or ambiguous step order.' };
  }

  const executed = executedDomClicks(runnerLog);
  if (executed.length !== contract.filter((action) => action.type === 'click').length) {
    return { issue: 'The runner log does not confirm the required number of DOM clicks.' };
  }
  const verified = [];
  for (const [index, expected] of contract.entries()) {
    const action = procedure[index];
    if (expected.type === 'reload') {
      const reload = action.action_type === 'refresh' ||
        (action.action_type === 'navigate' && sameUrl(action.action_params?.url, url));
      if (!reload) return { issue: `Action ${index + 1} must reload the tested URL.` };
      verified.push({ type: 'reload', step: action.step });
    } else {
      if (action.action_type !== 'click' || !matchesTarget(action, executed[index], expected.target)) {
        return { issue: `Action ${index + 1} must be a confirmed DOM click on ${expected.target.name}.` };
      }
      verified.push({ type: 'click', step: action.step, target: expected.target.name, selector: executed[index].selector });
    }
  }
  return { verified };
}
