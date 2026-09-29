/* Kingdom Battles · Cinderwatch — capital render check in a real browser.
 *
 * tests/economy.test.mjs proves the tick maths against a DOM shim. This proves
 * the thing a player actually reads: the capital header of the SERVED build, in
 * real headless Chrome, over the DevTools protocol, is the true net rate.
 *
 * The field manual (index.html:45) promises income "minus the upkeep of the
 * troops you store". BUILD 4 shipped that charge in the HUD and never debited
 * it, and advertised the gross rate beside it. So this check asserts, against
 * the running page:
 *   1. 8 stored troops at full capital  -> UPKEEP 24, net -4 (a drain)
 *   2.  3 stored troops at full capital  -> net +11 (a gain)
 *   3. a REAL ~4s firing moves the crown bank by exactly that net, in both
 *      directions — the number on the header is the number the bank does
 *   4. the header labels the figure as the net, not the gross
 * and leaves a screenshot of each capital state in .task/evidence/.
 *
 * Dependency-free: node builtins only (node:http static server, the global
 * WebSocket for DevTools, child_process for Chrome). No npm install, no
 * Playwright.  Run: node tests/render_check.mjs
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const evidenceDir = join(root, '.task', 'evidence');
const shot = name => join(evidenceDir, name);

/* ---------- expectations, straight from the shipped data ---------- */
const GARRISON = 8;              // game.js MAX_GARRISON
const LIGHT_ROSTER = 3;
const PER_UNIT_UPKEEP = 3;       // game.js upkeep()
const FULL_INCOME = 20;          // sum of the 15 family incomes (game.js families)
const TICK_MS = 4000;            // game.js setInterval period
const MIN_TICK_WAIT = 3000;      // a real firing cannot land sooner than this
const MAX_TICK_WAIT = 9000;
const TICK_SLACK = 1500;         // how far a 4000ms period may drift

const netFor = roster => FULL_INCOME - roster * PER_UNIT_UPKEEP;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ---------- static file server for the real build ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

async function serve() {
  const trace = process.env.KB_RENDER_DEBUG ? (...a) => console.log('  [serve]', ...a) : () => {};
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const rel = normalize(path === '/' ? '/index.html' : path).replace(/^([/\\])+/, '');
      const file = resolve(join(root, rel));
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('forbidden'); return; }
      const body = await readFile(file);
      trace('200', req.url, '->', rel);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch (e) {
      trace('404', req.url, e.code || e.message);
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise((res, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', res); });
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise(res => { server.closeAllConnections?.(); server.close(res); })
  };
}

/* ---------- DevTools protocol client over the global WebSocket ---------- */
class CDP {
  #ws; #id = 0; #pending = new Map(); #handlers = new Set();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', event => this.#dispatch(String(event.data)));
    ws.addEventListener('close', () => {
      for (const { reject, method } of this.#pending.values()) reject(new Error(`devtools socket closed during ${method}`));
      this.#pending.clear();
    });
  }

  static open(url) {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      const bail = () => rej(new Error(`cannot reach ${url}`));
      ws.addEventListener('open', () => res(new CDP(ws)), { once: true });
      ws.addEventListener('error', bail, { once: true });
    });
  }

  #dispatch(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.id !== undefined) {
      const entry = this.#pending.get(msg.id);
      if (!entry) return;
      this.#pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(`${entry.method} failed: ${msg.error.message}`));
      else entry.resolve(msg.result ?? {});
      return;
    }
    for (const handler of [...this.#handlers]) handler(msg);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#id;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((res, rej) => {
      this.#pending.set(id, { resolve: res, reject: rej, method });
      try { this.#ws.send(JSON.stringify(message)); } catch (e) { rej(e); }
    });
  }

  once(method, sessionId, timeoutMs = 30000) {
    return new Promise((res, rej) => {
      const handler = msg => {
        if (msg.method !== method) return;
        if (sessionId !== undefined && msg.sessionId !== sessionId) return;
        cleanup();
        res(msg.params ?? {});
      };
      const timer = setTimeout(() => { cleanup(); rej(new Error(`timed out waiting for ${method}`)); }, timeoutMs);
      const cleanup = () => { clearTimeout(timer); this.#handlers.delete(handler); };
      this.#handlers.add(handler);
    });
  }

  onEvent(handler) { this.#handlers.add(handler); return () => this.#handlers.delete(handler); }

  close() { try { this.#ws.close(); } catch { /* already gone */ } }
}

/* ---------- headless Chrome over the DevTools protocol ---------- */
const CHROME_CANDIDATES = [
  process.env.KB_CHROME, process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'
];

async function launchChrome(profileDir) {
  const bin = CHROME_CANDIDATES.find(candidate => candidate && existsSync(candidate));
  if (!bin) {
    throw new Error(`no Chrome binary found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}\nSet KB_CHROME=/path/to/chrome`);
  }
  const args = [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--mute-audio', '--disable-extensions', '--disable-sync', '--no-default-browser-check',
    // keep the page's setInterval honest: no throttling of background timers
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-ipc-flooding-protection',
    '--force-device-scale-factor=1', '--window-size=1280,1800', 'about:blank'
  ];
  const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const log = [];
  child.stdout.on('data', d => log.push(String(d)));
  child.stderr.on('data', d => log.push(String(d)));
  let exited = null;
  child.on('exit', (code, signal) => { exited = { code, signal }; });

  // the browser prints the DevTools ws url on stderr, but the file is the contract
  const portFile = join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`chrome exited early (code ${exited.code}):\n${log.join('')}`);
    try {
      const [port, path] = readFileSync(portFile, 'utf8').split('\n');
      if (port && path) return { child, bin, wsUrl: `ws://127.0.0.1:${port.trim()}${path.trim()}`, log };
    } catch { /* not written yet */ }
    await sleep(100);
  }
  throw new Error(`chrome never published a DevTools port:\n${log.join('')}`);
}

async function stopChrome(child) {
  if (!child || child.exitCode !== null) return;
  const gone = new Promise(res => child.once('exit', res));
  child.kill('SIGTERM');
  const raced = await Promise.race([gone.then(() => true), sleep(3000).then(() => false)]);
  if (!raced) { child.kill('SIGKILL'); await Promise.race([gone, sleep(2000)]); }
}

/* ---------- page session helpers ---------- */
/* the page's own complaints, so a failure says why instead of just "no KB" */
const pageLog = [];
function watch(cdp, sessionId) {
  const note = text => { pageLog.push(text); };
  cdp.onEvent(msg => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      note(`page threw: ${d.exception?.description || d.text}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      note(`console error: ${msg.params.args.map(a => a.value ?? a.description).join(' ')}`);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      note(`log error: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
    }
    if (msg.method === 'Network.loadingFailed') {
      note(`load failed: ${msg.params.errorText} ${msg.params.type}`);
    }
  });
}

async function newPageSession(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  try { await cdp.send('Log.enable', {}, sessionId); } catch { /* optional */ }
  try { await cdp.send('Network.enable', {}, sessionId); } catch { /* optional */ }
  // sw.js caches ./game.js?v=4; bypass it so every run reads the file on disk
  try { await cdp.send('Network.setBypassServiceWorker', { bypass: true }, sessionId); } catch { /* optional */ }
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1800, deviceScaleFactor: 1, mobile: false }, sessionId);
  watch(cdp, sessionId);
  return { targetId, sessionId };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`page evaluation failed: ${detail}`);
  }
  return result.result.value;
}

async function load(cdp, sessionId, url) {
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await loaded;
  // the bundle is a classic <script src> at the end of the body, so KB exists
  // by load; poll anyway so a slow machine cannot flake the check
  for (let i = 0; i < 100; i++) {
    const ready = await evaluate(cdp, sessionId, '!!(window.KB && document.getElementById("capitalView"))');
    if (ready) return;
    await sleep(100);
  }
  const seen = await evaluate(cdp, sessionId, 'location.href + " | KB:" + typeof window.KB + " | ready:" + document.readyState');
  throw new Error(`the page loaded but window.KB never appeared (${seen})\n    page said: ${pageLog.slice(-6).join('\n    page said: ') || 'nothing'}`);
}

/* the capital header, exactly as a player sees it */
const READ_HUD = `(() => {
  const text = id => (document.getElementById(id) || {}).textContent;
  const view = document.getElementById('capitalView');
  const label = document.querySelector('#capitalView .development .count-label');
  return {
    crowns: Number(text('crownCount')),
    net: text('incomeCount'),
    upkeep: text('upkeepCount'),
    garrison: text('garrisonCount'),
    families: text('buildingCount'),
    rateLabel: label ? label.textContent.trim() : '',
    tip: text('capitalTip'),
    capitalVisible: !!view && view.classList.contains('is-visible'),
    stored: window.KB.state.units.length,
    income: window.KB.state.buildings.length,
    bank: window.KB.state.crowns
  };
})()`;

/* stage a capital and let it boot from localStorage, so the turn interval is
 * restarted by the load itself and the next firing is one real period away */
const STAGE = roster => `(() => {
  const state = {
    crowns: 2000, renown: 0, day: 1, level: 1, cleared: [], upgrades: [], achievements: [],
    buildings: window.KB.families(), units: window.KB.doctrines().slice(0, ${roster}), view: 'title'
  };
  window.KB.setState(state);
  window.KB.show('capital');
  return window.KB.state.units.length;
})()`;

/* ---------- assertions ---------- */
const failures = [];
function check(name, ok, detail) {
  if (ok) console.log(`  ok   ${name} — ${detail}`);
  else { failures.push(name); console.log(`  FAIL ${name} — ${detail}`); }
}
const eq = (name, actual, expected) => check(name, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

/* wait for the game's own setInterval to fire, and report what it did */
async function awaitFiring(cdp, sessionId, from) {
  const started = Date.now();
  for (;;) {
    await sleep(100);
    const now = await evaluate(cdp, sessionId, 'window.KB.state.crowns');
    if (now !== from) return { crowns: now, delta: now - from, waited: Date.now() - started, at: Date.now() };
    if (Date.now() - started > MAX_TICK_WAIT) {
      throw new Error(`no turn tick fired within ${MAX_TICK_WAIT}ms (crowns still ${from})`);
    }
  }
}

async function capture(cdp, sessionId, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(file, Buffer.from(data, 'base64'));
  return file;
}

/* ---------- run ---------- */
console.log('kingdom-battles capital render check (real headless Chrome)');

const profileDir = join(tmpdir(), `kb-render-check-${process.pid}`);
const site = await serve();
let cdp = null;
let child = null;

try {
  const launched = await launchChrome(profileDir);
  child = launched.child;
  cdp = await CDP.open(launched.wsUrl);

  const { sessionId } = await newPageSession(cdp);
  const url = `${site.origin}/index.html`;
  await load(cdp, sessionId, url);
  check('served build booted in real Chrome', true, `${launched.bin} · ${url}`);

  /* ---- 1. full garrison, full capital: a deliberate drain ---- */
  eq('staged 8 stored troops', await evaluate(cdp, sessionId, STAGE(GARRISON)), GARRISON);
  await load(cdp, sessionId, url);            // restart the turn interval from the save
  const hudA = await evaluate(cdp, sessionId, READ_HUD);

  eq('8 units + 15 families: header shows UPKEEP 24', hudA.upkeep, `${GARRISON * PER_UNIT_UPKEEP} ♛`);
  eq('8 units + 15 families: header shows net -4', hudA.net, `${netFor(GARRISON)}`);
  eq('8 units + 15 families: garrison readout', hudA.garrison, `${GARRISON} / ${GARRISON}`);
  eq('8 units + 15 families: family readout', hudA.families, `15 / 15`);
  check('8 units + 15 families: the header calls the figure a net', /net of upkeep/i.test(hudA.rateLabel),
    `"${hudA.rateLabel}"`);
  eq('8 units + 15 families: capital view is the one on screen', hudA.capitalVisible, true);

  const fireA = await awaitFiring(cdp, sessionId, hudA.crowns);
  eq('8 units: the bank fell by exactly income - upkeep', fireA.delta, netFor(GARRISON));
  check('8 units: that was a real ~4s firing, not a scripted call', fireA.waited >= MIN_TICK_WAIT,
    `fired ${fireA.waited}ms after load (interval ${TICK_MS}ms)`);
  eq('8 units: the HUD rate equals the movement that just happened', `${hudA.net}`, `${fireA.delta}`);
  await capture(cdp, sessionId, shot('capital-8-units-net-minus-4.png'));

  /* a second firing proves the period, and that the drain repeats */
  const fireA2 = await awaitFiring(cdp, sessionId, fireA.crowns);
  eq('8 units: second firing repeats the same net', fireA2.delta, netFor(GARRISON));
  check('8 units: firings are one interval apart', Math.abs((fireA2.at - fireA.at) - TICK_MS) <= TICK_SLACK,
    `two firings ${fireA2.at - fireA.at}ms apart, expected ~${TICK_MS}ms`);

  /* ---- 2. light roster: the same header turns positive ---- */
  await evaluate(cdp, sessionId, STAGE(LIGHT_ROSTER));
  await load(cdp, sessionId, url);
  const hudB = await evaluate(cdp, sessionId, READ_HUD);

  eq('3 units + 15 families: header shows UPKEEP 9', hudB.upkeep, `${LIGHT_ROSTER * PER_UNIT_UPKEEP} ♛`);
  eq('3 units + 15 families: header shows net +11', hudB.net, `+${netFor(LIGHT_ROSTER)}`);
  eq('3 units + 15 families: garrison readout', hudB.garrison, `${LIGHT_ROSTER} / ${GARRISON}`);
  check('3 units + 15 families: the header calls the figure a net', /net of upkeep/i.test(hudB.rateLabel),
    `"${hudB.rateLabel}"`);

  const fireB = await awaitFiring(cdp, sessionId, hudB.crowns);
  eq('3 units: the bank rose by exactly income - upkeep', fireB.delta, netFor(LIGHT_ROSTER));
  check('3 units: that was a real ~4s firing, not a scripted call', fireB.waited >= MIN_TICK_WAIT,
    `fired ${fireB.waited}ms after load (interval ${TICK_MS}ms)`);
  eq('3 units: the HUD rate equals the movement that just happened', `${hudB.net}`, `+${fireB.delta}`);
  await capture(cdp, sessionId, shot('capital-3-units-net-plus-11.png'));

  /* ---- 3. the shipped field manual is the promise this check enforces ---- */
  const manual = (await readFile(join(root, 'index.html'), 'utf8')).includes('minus the upkeep of the troops you store');
  check('the served manual still promises the deduction', manual, 'index.html:45 · "…minus the upkeep of the troops you store"');
} catch (e) {
  failures.push('harness');
  console.log(`  FAIL harness — ${e && e.message ? e.message : e}`);
} finally {
  if (cdp) { try { await cdp.send('Browser.close'); } catch { /* browser may be gone */ } cdp.close(); }
  await stopChrome(child);
  await site.close();
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall capital render checks passed');
console.log(`screenshots: ${evidenceDir}`);
console.log(failures.length ? 'RENDER CHECK: FAIL' : 'RENDER CHECK: PASS');
process.exit(failures.length ? 1 : 0);
