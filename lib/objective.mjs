export function objectiveFor(check, url = '${appUrl}') {
  const fields = Object.entries(check.observations).map(
    ([name, { read }]) => `Store ${read} as '${name}'.`,
  );
  return [check.actions.replaceAll('${appUrl}', () => url), ...fields, `Verify: ${check.expected}`].join(' ');
}
