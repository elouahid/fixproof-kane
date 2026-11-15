import { spawn, spawnSync } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageName = '@testmuai/kane-cli';
const context = fileURLToPath(new URL('../cases/kane-context.md', import.meta.url));

export function resolveKaneRoot() {
  const roots = [];
  try {
    roots.push(dirname(require.resolve(`${packageName}/package.json`)));
  } catch {
    // A global npm install is outside Node's project module search path.
  }
  for (const entry of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    roots.push(join(entry, 'node_modules', packageName));
    roots.push(join(entry, '..', 'lib', 'node_modules', packageName));
  }

  return roots.find((root) => existsSync(join(root, 'bin', 'kane-cli.cjs'))) ?? null;
}

function resolveKane() {
  const root = resolveKaneRoot();
  if (root) {
    const launcher = join(root, 'bin', 'kane-cli.cjs');
    const resolver = join(root, 'bin', 'resolve-runtime.cjs');
    const entry = join(root, 'dist', 'index.js');
    // Run the pinned runtime directly when available so we can bound its lifetime.
    if (process.env.KANE_CLI_SYSTEM_NODE !== '1' && existsSync(resolver) && existsSync(entry)) {
      const bundledNode = require(resolve(resolver))();
      if (bundledNode) return { command: bundledNode, prefix: [entry] };
    }
    return { command: process.execPath, prefix: [launcher] };
  }

  if (process.platform !== 'win32') return { command: 'kane-cli', prefix: [] };
  throw new Error('Kane CLI was not found. Install @testmuai/kane-cli with npm and check PATH.');
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
    spawnSync(join(systemRoot, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], {
      timeout: 3000,
      windowsHide: true,
      stdio: 'ignore',
    });
    child.kill('SIGKILL');
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') child.kill('SIGKILL');
  }
}

function runCommand({ command, prefix }, args, cwd, timeoutMs) {
  return new Promise((done) => {
    const child = spawn(command, [...prefix, ...args], {
      cwd,
      detached: process.platform !== 'win32',
      env: { ...process.env, KANE_CLI_USER_AGENT: 'codex', FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    let launchError = null;
    let timedOut = false;
    let hardStop;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
      hardStop = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        finish(null, null);
      }, 2000);
    }, timeoutMs);

    function finish(exitCode, signal) {
      clearTimeout(timer);
      clearTimeout(hardStop);
      done({ exitCode, signal, timedOut, launchError, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    }

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => { launchError = error.code ?? error.message; });
    child.once('close', finish);
  });
}

function readEvents(stdout) {
  const events = [];
  for (const line of stdout.toString('utf8').split(/\r?\n/)) {
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object' && !Array.isArray(event)) events.push(event);
    } catch {
      // Keep the original stream on disk, including any non-NDJSON commentary.
    }
  }
  return events;
}

async function findPack(end, stderr, cwd) {
  const hint = /`kane-cli evidence serve ([^`\r\n]+\.evidence)`/i.exec(stderr)?.[1];
  if (hint && isAbsolute(hint) && (await stat(hint).catch(() => null))?.isFile()) return hint;

  const directories = [join(cwd, '.testmuai', 'evidence')];
  if (typeof end?.session_dir === 'string' && isAbsolute(end.session_dir)) {
    directories.unshift(join(end.session_dir, 'evidence'));
  }
  for (const path of directories) {
    const files = await readdir(path, { withFileTypes: true }).catch(() => []);
    const packs = files.filter((file) => file.isFile() && file.name.endsWith('.evidence'));
    if (packs.length === 1) return join(path, packs[0].name);
  }
  return null;
}

async function validatePack(kane, path, cwd) {
  const result = await runCommand(kane, ['evidence', 'validate', path, '--json'], cwd, 30000);
  const report = readEvents(result.stdout).find((event) => typeof event.valid === 'boolean') ?? null;
  return { valid: result.exitCode === 0 && !result.timedOut && report?.valid === true, exitCode: result.exitCode, report };
}

async function uploadInfo(end, stderr, diagnostics, source) {
  const url = typeof end?.test_url === 'string' && end.test_url.trim() ? end.test_url : null;
  if (url) return { status: 'uploaded', url };

  const sessionDir = end?.session_dir ?? (source && dirname(dirname(source)));
  const sessionLog = typeof sessionDir === 'string' && isAbsolute(sessionDir)
    ? await readFile(join(sessionDir, 'tui.log'), 'utf8').catch(() => '')
    : '';
  if (/\bPIPELINE_COMPLETE\b/.test(sessionLog)) return { status: 'uploaded', url: null };
  const failed = /\bupload\b[^\r\n]{0,100}\b(?:failed|failure)\b/i.test(`${stderr}\n${diagnostics}`) ||
    /\b(?:DIRECT_UPLOAD_ERROR|PIPELINE_FAILED)\b/.test(sessionLog);
  return { status: failed ? 'failed' : 'unknown', url: null };
}

export async function invokeKane({ objective, url, outputDir, name, timeout = 120, maxSteps = 16 }) {
  const cwd = resolve(outputDir);
  await mkdir(cwd, { recursive: true });

  let kane;
  let result;
  try {
    kane = resolveKane();
    const args = [
      'run', '--url', url, '--agent', '--headless', '--target', 'desktop',
      '--mode', 'action', '--bug-detection', 'off', '--assertion-mode', 'dom',
      '--assertion-failure-mode', 'stop', '--final-validation', 'off',
      '--global-context', context, '--local-context', context, '--max-steps', String(maxSteps),
      '--timeout', String(timeout),
    ];
    if (name) args.push('--name', name);
    args.push('--', objective);
    // Leave time for evidence sealing and Test Manager after the CLI's run timeout.
    result = await runCommand(kane, args, cwd, (timeout + 60) * 1000);
  } catch (error) {
    result = { exitCode: null, signal: null, timedOut: false, launchError: error.message, stdout: Buffer.alloc(0), stderr: Buffer.from(error.message) };
  }

  const { stdout, stderr, ...processResult } = result;
  await Promise.all([
    writeFile(join(cwd, 'run.ndjson'), stdout, { flag: 'wx' }),
    writeFile(join(cwd, 'stderr.log'), stderr, { flag: 'wx' }),
  ]);
  const events = readEvents(stdout);
  const ends = events.filter((event) => event.type === 'run_end');
  const end = ends.length === 1 ? ends[0] : null;
  const runStderr = stderr.toString('utf8');
  const diagnostics = events.filter((event) => event.type === 'error').map((event) => event.message).join('\n');
  const authFailure = !end && /\b(?:not authenticated|auth resolution failed|token refresh failed|no credentials found)\b/i.test(`${runStderr}\n${diagnostics}`);
  const source = await findPack(end, runStderr, cwd);
  let packPath = null;
  let validation = null;
  if (source && kane) {
    const destination = join(cwd, 'run.evidence');
    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL);
      packPath = destination;
      validation = await validatePack(kane, destination, cwd);
    } catch (error) {
      validation = { valid: false, exitCode: null, report: null, error: error.code ?? error.message };
    }
    await writeFile(join(cwd, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`, { flag: 'wx' });
  }

  return {
    ...processResult,
    status: authFailure ? 'authentication' : end?.status ?? 'incomplete',
    stream: events.find((event) => event.type === 'stream_start') ?? null,
    end,
    steps: events.filter((event) => typeof event.step === 'number' || typeof event.step_index === 'number'),
    packPath,
    validation,
    upload: await uploadInfo(end, runStderr, diagnostics, source),
  };
}
