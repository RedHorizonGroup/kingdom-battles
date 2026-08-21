const KEY = 'kingdom-battles-cinderwatch-v3';
const MAX_GARRISON = 8;
const initial = { version: 3, crowns: 300, renown: 0, day: 1, buildings: [], units: [], view: 'capital', battle: null };

const families = [
  { id: 'barracks', name: 'Barracks', cost: 45, requires: [], desc: 'Infantry house. Produces Scouts and opens the first doctrine.', crest: 'barracks', income: 3 },
  { id: 'fletchery', name: 'Fletchery', cost: 70, requires: ['barracks'], desc: 'Archers train here. Pair it with Barracks for a balanced line.', crest: 'fletchery', income: 2 },
  { id: 'mansion', name: 'Mansion', cost: 95, requires: ['barracks'], desc: 'Bosses rally the realm and add crowns each turn.', crest: 'mansion', income: 2 },
  { id: 'stables', name: 'Stables', cost: 110, requires: ['barracks'], desc: 'Cavalry charge. Requires an infantry foundation.', crest: 'stables', income: 1 },
  { id: 'mage-tower', name: 'Mage Tower', cost: 130, requires: ['fletchery'], desc: 'Wizards bend the battlefield with ranged power.', crest: 'mage', income: 1 },
  { id: 'cave', name: 'Cave', cost: 140, requires: ['mansion'], desc: 'Trolls hold the heavy front and soak pressure.', crest: 'cave', income: 1 },
  { id: 'factory', name: 'Factory', cost: 155, requires: ['mansion', 'stables'], desc: 'Catapults turn a prepared economy into keep pressure.', crest: 'factory', income: 1 },
  { id: 'mountaintop-cave', name: 'Mountaintop Cave', cost: 180, requires: ['mage-tower', 'cave'], desc: 'Dragons are the rarest aerial doctrine.', crest: 'mountain', income: 1 },
  { id: 'workshop', name: 'Workshop', cost: 105, requires: ['barracks'], desc: 'Rams breach gates when infantry makes the opening.', crest: 'workshop', income: 2 },
  { id: 'alchemist-shop', name: 'Alchemist Shop', cost: 125, requires: ['fletchery', 'workshop'], desc: 'Bombers reward a ranged plus siege combination.', crest: 'alchemist', income: 1 },
  { id: 'iron-works', name: 'Iron Works', cost: 190, requires: ['factory'], desc: 'Cannons anchor the late-game line.', crest: 'iron', income: 1 },
  { id: 'blacksmith', name: 'Blacksmith', cost: 150, requires: ['stables', 'workshop'], desc: 'Tempers equipment and raises deployed unit power.', crest: 'blacksmith', income: 1 },
  { id: 'hall-of-fame', name: 'Hall of Fame', cost: 220, requires: ['mansion', 'blacksmith'], desc: 'Bosses become a lasting renown engine.', crest: 'hall', income: 3 },
  { id: 'pit-to-hell', name: 'Pit to Hell', cost: 240, requires: ['cave', 'alchemist-shop'], desc: 'A risky infernal doctrine with decisive damage.', crest: 'pit', income: 0 },
  { id: 'gateway-to-heaven', name: 'Gateway to Heaven', cost: 260, requires: ['mountaintop-cave', 'hall-of-fame'], desc: 'The capstone route. Your realm has a legend.', crest: 'gateway', income: 0 }
];

const doctrines = [
  { id: 'scout', name: 'Scout', crest: 'scout', color: '#6e9d62', cost: 28, power: 8, health: 16, requires: ['barracks'], hint: 'Barracks' },
  { id: 'archer', name: 'Archer', crest: 'fletchery', color: '#4f82df', cost: 42, power: 12, health: 13, requires: ['barracks', 'fletchery'], hint: 'Barracks + Fletchery' },
  { id: 'boss', name: 'Boss', crest: 'mansion', color: '#b97a4a', cost: 64, power: 18, health: 32, requires: ['barracks', 'mansion'], hint: 'Barracks + Mansion' },
  { id: 'cavalry', name: 'Cavalry', crest: 'stables', color: '#e5b85c', cost: 58, power: 20, health: 20, requires: ['barracks', 'stables'], hint: 'Barracks + Stables' },
  { id: 'wizard', name: 'Wizard', crest: 'mage', color: '#9a79e5', cost: 70, power: 25, health: 14, requires: ['fletchery', 'mage-tower'], hint: 'Fletchery + Mage Tower' },
  { id: 'troll', name: 'Troll', crest: 'cave', color: '#86a86b', cost: 75, power: 17, health: 48, requires: ['mansion', 'cave'], hint: 'Mansion + Cave' },
  { id: 'catapult', name: 'Catapult', crest: 'factory', color: '#c58a58', cost: 82, power: 34, health: 22, requires: ['mansion', 'stables', 'factory'], hint: 'Mansion + Stables + Factory' },
  { id: 'dragon', name: 'Dragon', crest: 'mountain', color: '#e56b45', cost: 110, power: 48, health: 30, requires: ['mage-tower', 'cave', 'mountaintop-cave'], hint: 'Mage Tower + Cave + Mountaintop Cave' },
  { id: 'ram', name: 'Ram', crest: 'workshop', color: '#c6a66e', cost: 68, power: 29, health: 26, requires: ['barracks', 'workshop'], hint: 'Barracks + Workshop' },
  { id: 'bomber', name: 'Bomber', crest: 'alchemist', color: '#d88856', cost: 76, power: 32, health: 15, requires: ['fletchery', 'workshop', 'alchemist-shop'], hint: 'Fletchery + Workshop + Alchemist Shop' },
  { id: 'cannon', name: 'Cannon', crest: 'iron', color: '#b4c0c2', cost: 96, power: 42, health: 20, requires: ['factory', 'iron-works'], hint: 'Factory + Iron Works' },
  { id: 'infernal', name: 'Infernal', crest: 'pit', color: '#d34f56', cost: 105, power: 55, health: 18, requires: ['cave', 'alchemist-shop', 'pit-to-hell'], hint: 'Cave + Alchemist Shop + Pit to Hell' }
];

let deferredInstall;
let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved && saved.version === 3 ? { ...initial, ...saved, battle: null } : { ...initial };
  } catch { return { ...initial }; }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify({ ...state, battle: null }));
  const status = document.querySelector('#saveStatus');
  if (status) status.textContent = 'Saved on this device';
}
function money(value) { return `${value} ♛`; }
function crest(type) { return `<svg class="crest" viewBox="0 0 64 64" aria-hidden="true"><use href="#icon-${type}"></use></svg>`; }
function unlocked(requirements) { return requirements.every(id => state.buildings.includes(id)); }
function income() { return state.buildings.reduce((sum, id) => sum + (families.find(f => f.id === id)?.income || 0), 0); }
function upkeep() { return state.units.length * 3; }
function building(id) { return families.find(item => item.id === id); }
function doctrine(id) { return doctrines.find(item => item.id === id); }
function setToast(message) { const toast = document.querySelector('#battleToast'); if (toast) toast.textContent = message; }

function render() {
  document.querySelector('#crownCount').textContent = state.crowns;
  document.querySelector('#renownCount').textContent = state.renown;
  document.querySelector('#dayCount').textContent = state.day;
  document.querySelector('#buildingCount').textContent = `${state.buildings.length} / ${families.length}`;
  document.querySelector('#garrisonCount').textContent = `${state.units.length} / ${MAX_GARRISON}`;
  document.querySelector('#upkeepCount').textContent = money(upkeep());
  document.querySelector('#incomeCount').textContent = `+${income()}`;
  const next = families.find(item => !state.buildings.includes(item.id) && unlocked(item.requires));
  document.querySelector('#capitalTip').textContent = next ? `Next: ${next.name} extends your doctrine.` : state.buildings.length ? `Income +${income()} crowns each turn. Keep a reserve for the field.` : 'Build Barracks first to place a Scout on the roster.';
  document.querySelector('#buildingList').innerHTML = families.map(item => {
    const owned = state.buildings.includes(item.id);
    const ready = unlocked(item.requires);
    return `<div class="build-card ${owned ? 'owned' : ''} ${!ready ? 'locked' : ''}" data-family="${item.id}">${crest(item.crest)}<div class="card-copy"><strong>${item.name}</strong><small>${owned ? `Operational · +${item.income} crowns / turn` : item.desc}</small></div>${owned ? '<span class="cost">✓</span>' : `<button class="mini-button" data-buy="${item.id}" ${!ready || state.crowns < item.cost ? 'disabled' : ''}>${money(item.cost)}</button>`}</div>`;
  }).join('');
  document.querySelector('#treeList').innerHTML = doctrines.map(item => {
    const ready = unlocked(item.requires);
    const recruited = state.units.includes(item.id);
    const recruitButton = ready && !recruited ? `<button class="mini-button tree-recruit" data-recruit="${item.id}" ${state.crowns < item.cost || state.units.length >= MAX_GARRISON ? 'disabled' : ''}>Recruit</button>` : '';
    return `<div class="tree-card ${ready ? 'unlocked' : 'locked'}" data-doctrine="${item.id}"><span class="key-dot ${ready ? 'unlocked' : ''}"></span>${crest(item.crest)}<strong>${item.name}</strong><small>${ready ? recruited ? 'In roster — ready for the field.' : `Unlocked · ${money(item.cost)} to recruit.` : `Requires ${item.hint}`}</small>${recruitButton}</div>`;
  }).join('');
  document.querySelectorAll('[data-recruit]').forEach(button => button.addEventListener('click', () => recruit(button.dataset.recruit)));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.view === state.view));
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('is-visible', view.id === `${state.view}View`));
  renderBattle();
}

function battleState() { return state.battle || { enemy: 100, player: 100, units: [], turn: 0, boost: 0, focused: false, ended: '' }; }
function renderBattle() {
  const battle = battleState();
  document.querySelector('#battleCrownCount').textContent = state.crowns;
  document.querySelector('#enemyHealth').textContent = Math.max(0, battle.enemy);
  document.querySelector('#battleTurn').textContent = `Turn ${battle.turn}`;
  document.querySelector('#rosterLabel').textContent = `${state.units.length} stored`;
  document.querySelector('#rosterList').innerHTML = state.units.map(id => {
    const item = doctrine(id);
    const power = item.power + (state.buildings.includes('blacksmith') ? 5 : 0);
    return `<div class="roster-card">${crest(item.crest)}<div class="card-copy"><strong>${item.name}</strong><small>${money(item.cost)} · ${power} power</small><button class="mini-button" data-deploy="${item.id}" ${state.crowns < item.cost || battle.ended || battle.units.length >= MAX_GARRISON ? 'disabled' : ''}>Deploy</button></div></div>`;
  }).join('') || '<p class="empty-roster">Unlock a doctrine in the capital to form a roster.</p>';
  document.querySelector('#unitLayer').innerHTML = battle.units.map((unit, index) => `<div class="unit" title="${unit.name}" style="left:${10 + (index % 6) * 14}%;--unit-color:${unit.color}">${crest(unit.crest)}</div>`).join('');
  document.querySelector('#battleTip').textContent = battle.ended === 'victory' ? 'The pass is yours. Build again, then replay the deterministic fixture.' : battle.ended === 'defeat' ? 'The keep fell. Retreat, change your combination, and try again.' : state.units.length ? 'Deploy a counter to pressure, then focus the lane or rally the line.' : 'Your capital determines what can reach this field.';
  document.querySelector('#battleStatus').textContent = battle.ended ? `${battle.ended === 'victory' ? 'VICTORY' : 'DEFEAT'} · ASHEN PASS` : battle.turn ? `Turn ${battle.turn} · Choose the next order` : 'Choose your opening';
  document.querySelector('#focusButton').disabled = battle.ended || !battle.units.length || battle.focused;
  document.querySelector('#rallyButton').disabled = battle.ended || !battle.units.length || state.crowns < 10;
  document.querySelector('#volleyButton').disabled = battle.ended || state.crowns < 30 || battle.enemy <= 0;
  document.querySelector('#retreatButton').disabled = false;
  document.querySelector('#replayButton').classList.toggle('is-hidden', !battle.ended);
}

function recruit(id) {
  const item = doctrine(id);
  if (!item || !unlocked(item.requires) || state.units.includes(id) || state.units.length >= MAX_GARRISON || state.crowns < item.cost) return;
  state.crowns -= item.cost;
  state.units.push(id);
  save(); render();
}
function buy(id) {
  const item = building(id);
  if (!item || state.buildings.includes(id) || state.crowns < item.cost || !unlocked(item.requires)) return;
  state.crowns -= item.cost;
  state.buildings.push(id);
  if (id === 'hall-of-fame') state.renown += 15;
  save(); render();
}
function enterBattle() { state.view = 'battle'; state.battle = { enemy: 100, player: 100, units: [], turn: 0, boost: 0, focused: false, ended: '' }; save(); render(); }
function enemyTick(battle) {
  const pressure = Math.max(2, 8 + Math.floor(battle.turn / 2) - Math.min(4, battle.units.length));
  const absorbed = battle.boost ? Math.min(pressure, battle.boost) : 0;
  battle.player = Math.max(0, battle.player - pressure + absorbed);
  battle.boost = 0;
  return { pressure, absorbed };
}
function finish(battle) {
  if (battle.enemy <= 0) { battle.enemy = 0; battle.ended = 'victory'; state.renown += 20; state.day += 1; state.crowns += 55; setToast('Victory. The pass is yours. Renown +20, crowns +55.'); }
  else if (battle.player <= 0) { battle.player = 0; battle.ended = 'defeat'; setToast('Defeat. The enemy broke through. Rebuild and return.'); }
}
function resolveAction(label, damage, boost = 0) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  battle.turn += 1;
  battle.enemy = Math.max(0, battle.enemy - damage);
  battle.boost = boost;
  const result = enemyTick(battle);
  setToast(`${label} · ${damage} enemy damage · pressure ${result.pressure}${result.absorbed ? ` (${result.absorbed} absorbed)` : ''}.`);
  finish(battle); save(); render();
}
function deploy(id) {
  const item = doctrine(id); const battle = state.battle;
  if (!item || !battle || battle.ended || state.crowns < item.cost || battle.units.length >= MAX_GARRISON) return;
  state.crowns -= item.cost;
  battle.units.push(item);
  const power = item.power + (state.buildings.includes('blacksmith') ? 5 : 0) + (item.id === 'catapult' || item.id === 'cannon' ? 6 : 0) + (battle.focused ? 4 : 0);
  resolveAction(`${item.name} advances`, power);
}
function focusLane() { const battle = state.battle; if (!battle || battle.ended || !battle.units.length || battle.focused) return; battle.focused = true; setToast('Focus lane set. The next deployment gains +4 damage.'); save(); render(); }
function rally() { const battle = state.battle; if (!battle || battle.ended || !battle.units.length || state.crowns < 10) return; state.crowns -= 10; resolveAction('Rally ordered', 8 + battle.units.length * 2, 7); }
function volley() { const battle = state.battle; if (!battle || battle.ended || state.crowns < 30) return; state.crowns -= 30; resolveAction('Keep volley fired', 18); }
function retreat() { state.view = 'capital'; state.battle = null; save(); render(); }
function resetCampaign() { localStorage.removeItem(KEY); state = { ...initial }; save(); render(); }

window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; document.querySelector('#installButton').textContent = 'Install game'; });
window.addEventListener('appinstalled', () => { deferredInstall = null; document.querySelector('#installButton').textContent = 'Installed'; });

document.addEventListener('click', event => {
  const buyButton = event.target.closest('[data-buy]'); if (buyButton) buy(buyButton.dataset.buy);
  const deployButton = event.target.closest('[data-deploy]'); if (deployButton) deploy(deployButton.dataset.deploy);
  const tab = event.target.closest('[data-view]'); if (tab) { state.view = tab.dataset.view; save(); render(); }
  if (event.target.closest('#enterBattle')) enterBattle();
  if (event.target.closest('#focusButton')) focusLane();
  if (event.target.closest('#rallyButton')) rally();
  if (event.target.closest('#volleyButton')) volley();
  if (event.target.closest('#retreatButton')) retreat();
  if (event.target.closest('#replayButton')) enterBattle();
  if (event.target.closest('#resetButton')) resetCampaign();
  if (event.target.closest('#fullscreenButton')) document.documentElement.requestFullscreen?.().catch(() => {});
  if (event.target.closest('#installButton')) { if (deferredInstall) deferredInstall.prompt(); else document.querySelector('#installButton').textContent = 'Use your browser menu to install'; }
});
window.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'm') { state.crowns += 2; save(); render(); } });
setInterval(() => { if (state.view === 'capital') { state.crowns += Math.max(1, income()); state.crowns = Math.max(0, state.crowns - upkeep()); save(); render(); } }, 4000);
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reduced-motion');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
