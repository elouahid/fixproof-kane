const safeId = /^[a-z][a-z0-9_-]{0,39}$/;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseSpec(source) {
  const spec = JSON.parse(source);
  if (!hasText(spec?.title) || !hasText(spec.versionHeader) || !/^[a-z0-9-]+$/i.test(spec.versionHeader)) {
    throw new Error('Set a title and the HTTP response header that identifies each version.');
  }
  for (const side of ['baseline', 'candidate']) {
    const url = new URL(spec[`${side}Url`]);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Use HTTP(S) application URLs without credentials.');
    }
  }
  if (!Array.isArray(spec.controls) || spec.controls.length < 1 || spec.controls.length > 3) {
    throw new Error('Declare one to three control checks.');
  }
  const checks = [spec.behavior, ...spec.controls];
  const ids = new Set();
  for (const check of checks) {
    if (!hasText(check?.id) || !safeId.test(check.id) || ids.has(check.id) ||
        !hasText(check.actions) || !hasText(check.expected)) {
      throw new Error('Give each check a unique ID, actions, and an explicit expected behavior.');
    }
    if (check.samePageReload !== undefined && typeof check.samePageReload !== 'boolean') {
      throw new Error(`Set samePageReload to true or false for ${check.id}.`);
    }
    const fields = Object.entries(check.observations ?? {});
    if (!fields.length || fields.some(([key, field]) =>
      !safeId.test(key) || !hasText(field?.read) || !hasText(field?.equals))) {
      throw new Error(`Declare at least one named browser observation and its exact expected text for ${check.id}.`);
    }
    ids.add(check.id);
  }
  return { ...spec, checks };
}
