/* Kingdom Battles · Cinderwatch — economy regression.
 *
 * The field manual (index.html:45) promises: "income flows from the building
 * families you own, minus the upkeep of the troops you store". BUILD 4 shipped
 * the charge in the HUD (game.js upkeep()) and never debited it, while the
 * capital header advertised the gross rate. This harness loads the real game.js
 * under a minimal DOM shim, captures the turn tick's registered setInterval
 * callback, fires it by hand, and asserts the crown movement that actually
 * happens — realised banking, not a grep over the source.
 *
 * Dependency-free: node: builtins only.  Run: node tests/economy.test.mjs
 */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'game.js'), 'utf8');

/* ---------- minimal DOM / timer shim ---------- */
function makeElement() {
  return {
    textContent: '', innerHTML: '', disabled: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }
  };
}

const elements = new Map();
const timers = [];
const storage = new Map();

const documentShim = {
  querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  },
  querySelectorAll: () => [],
  addEventListener() {},
  documentElement: makeElement()
};

const sandbox = {
  console,
  setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; },
  clearInterval() {},
  setTimeout,
  document: documentShim,
  localStorage: {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  },
  navigator: {},
  // The dev hooks (KB.setState) this test stages state through are gated behind ?kbdev=1.
  location: { search: '?kbdev=1' },
  URLSearchParams,
  matchMedia: () => ({ matches: false })
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.document = documentShim;
sandbox.matchMedia = () => ({ matches: false });

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });

const KB = sandbox.window.KB;
const text = selector => documentShim.querySelector(selector).textContent;
const crowns = () => KB.state.crowns;
const fire = () => timers[0].fn();

/* ---------- assertions ---------- */
const failures = [];
function check(name, ok, detail) {
  if (ok) console.log(`  ok   ${name} — ${detail}`);
  else { failures.push(name); console.log(`  FAIL ${name} — ${detail}`); }
}
const eq = (name, actual, expected) => check(name, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

/* ---------- fixture ---------- */
const ALL_FAMILIES = KB.families();
const ALL_TROOPS = KB.doctrines();
const FULL_INCOME = 20;          // sum of the 15 family incomes at full capital
const GARRISON = 8;              // shipped MAX_GARRISON
const PER_UNIT_UPKEEP = 3;

function scenario({ buildings, units, starting, view = 'capital' }) {
  KB.setState({ crowns: starting, buildings: [...buildings], units: [...units], view: 'title' });
  KB.show(view);
  return crowns();
}

console.log('kingdom-battles economy regression');

/* the harness itself must have a real turn tick to fire */
eq('turn tick registered', timers.length === 1 && timers[0].ms === 4000, true);

/* 1. A full garrison at full capital is net NEGATIVE, and the bank agrees. */
{
  const before = scenario({ buildings: ALL_FAMILIES, units: ALL_TROOPS.slice(0, GARRISON), starting: 2000 });
  const net = FULL_INCOME - GARRISON * PER_UNIT_UPKEEP;
  fire();
  eq('full garrison debits upkeep', crowns(), before + net);
  eq('upkeep readout', text('#upkeepCount'), `${GARRISON * PER_UNIT_UPKEEP} ♛`);
  eq('net HUD at full garrison', text('#incomeCount'), `${net}`);
  check('HUD rate equals the real per-turn movement', `${text('#incomeCount')}` === `${net}`,
    `#incomeCount ${text('#incomeCount')} vs realised ${crowns() - before}`);
  /* Every surface that quotes a per-turn rate must quote the NET. The world-map hint
   * (game.js:248) used to render gross income(), which told a player bleeding 4/firing
   * that they had "20/turn" to spend. The same lie, one screen over. */
  check('capital field note quotes the net, not gross', text('#capitalTip').includes(`${net}`),
    `#capitalTip ${JSON.stringify(text('#capitalTip'))}`);
  scenario({ buildings: ALL_FAMILIES, units: ALL_TROOPS.slice(0, GARRISON), starting: before, view: 'world' });
  check('world-map hint quotes the net, not gross', text('#worldHint').includes(`${net}`),
    `#worldHint ${JSON.stringify(text('#worldHint'))}`);
  KB.show('capital');
}

/* 2. A smaller roster is net POSITIVE, and successive firings compound. */
{
  const roster = 3;
  const before = scenario({ buildings: ALL_FAMILIES, units: ALL_TROOPS.slice(0, roster), starting: 500 });
  const net = FULL_INCOME - roster * PER_UNIT_UPKEEP;
  fire();
  const afterFirst = crowns();
  fire();
  eq('light roster credits income minus upkeep', afterFirst - before, net);
  eq('second firing repeats the same net', crowns() - afterFirst, net);
  eq('net HUD at light roster', text('#incomeCount'), `+${net}`);
}

/* 3. The floor holds: a drained capital is pinned at 0, never negative. */
{
  const before = scenario({ buildings: ALL_FAMILIES, units: ALL_TROOPS.slice(0, GARRISON), starting: 2 });
  fire();
  eq('net-negative turn floors at 0', crowns(), 0);
  fire();
  check('floor holds across firings', crowns() === 0, `crowns stayed ${crowns()}`);
  eq('HUD still shows the real rate while floored', text('#incomeCount'), `${FULL_INCOME - GARRISON * PER_UNIT_UPKEEP}`);
}

/* 4. Bare capital still trickles: the tick's minimum income is not upkeep. */
{
  const before = scenario({ buildings: [], units: [], starting: 10 });
  fire();
  eq('empty capital keeps the +1 trickle', crowns() - before, 1);
  eq('HUD matches the trickle', text('#incomeCount'), '+1');
}

/* 5. Upkeep scales with the stored roster, per firing. */
{
  const before = scenario({ buildings: ALL_FAMILIES, units: ALL_TROOPS.slice(0, 5), starting: 1000 });
  fire();
  eq('five stored troops', crowns() - before, FULL_INCOME - 5 * PER_UNIT_UPKEEP);
  eq('upkeep readout scales', text('#upkeepCount'), `${5 * PER_UNIT_UPKEEP} ♛`);
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall economy checks passed');
console.log(failures.length ? 'NET HUD: FAIL' : 'NET HUD: PASS');
process.exit(failures.length ? 1 : 0);
