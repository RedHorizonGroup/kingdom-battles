/* Kingdom Battles · Cinderwatch — BUILD 4
 * Dependency-free, deterministic state machine. No accounts, local saves only.
 */
'use strict';

const KEY = 'kingdom-battles-cinderwatch-v4';
const KEY_V3 = 'kingdom-battles-cinderwatch-v3';
const MAX_GARRISON = 8;
const LEVELS = 6;
const CACHE_NAME = 'cinderwatch-v4';

const initial = {
  version: 4,
  crowns: 2000,
  renown: 0,
  day: 1,
  level: 1,
  cleared: [],
  buildings: [],
  units: [],
  upgrades: [],
  achievements: [],
  view: 'title',
  battle: null
};

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

const upgrades = [
  { id: 'long-sword', name: 'Long Sword', cost: 25, attack: 3, defense: 0, health: 0, requires: ['barracks'] },
  { id: 'long-bow', name: 'Long Bow', cost: 50, attack: 4, defense: 0, health: 0, requires: ['fletchery'] },
  { id: 'hammer', name: 'Hammer', cost: 100, attack: 6, defense: 0, health: 0, requires: ['workshop'] },
  { id: 'lance', name: 'Lance', cost: 75, attack: 5, defense: 0, health: 0, requires: ['stables'] },
  { id: 'barrel-bomb', name: 'Barrel Bomb', cost: 125, attack: 8, defense: 0, health: 0, requires: ['alchemist-shop'] },
  { id: 'big-bullet', name: 'Big Bullet', cost: 150, attack: 10, defense: 0, health: 0, requires: ['iron-works'] },
  { id: 'jeweled-staff', name: 'Jeweled Staff', cost: 200, attack: 12, defense: 0, health: 0, requires: ['mage-tower'] },
  { id: 'spiky-club', name: 'Spiky Club', cost: 175, attack: 9, defense: 0, health: 0, requires: ['cave'] },
  { id: 'good-armour', name: 'Good Defence Plate', cost: 90, attack: 0, defense: 2, health: 10, requires: ['blacksmith'] },
  { id: 'bad-bloodrage', name: 'Bad Attack Bloodrage', cost: 120, attack: 7, defense: -1, health: 0, requires: ['pit-to-hell'] },
  { id: 'war-health', name: 'War Health Rations', cost: 60, attack: 0, defense: 0, health: 20, requires: ['hall-of-fame'] }
];

const achievements = [
  { id: 'sharp', name: 'Long Sharp Weapons', grants: 'Spearman', requires: ['barracks', 'blacksmith'], cost: 60, desc: 'Long sharp weapons in every hand.' },
  { id: 'machines', name: 'More War Machines', grants: 'Ballista', requires: ['factory', 'workshop'], cost: 90, desc: 'More war machines roll out of the yard.' },
  { id: 'holy', name: 'Holy Blessing', grants: 'Crusader', requires: ['gateway-to-heaven'], cost: 0, desc: 'A holy blessing settles on the realm.' },
  { id: 'unholy', name: 'Unholy Blessing', grants: 'Fiend', requires: ['pit-to-hell'], cost: 0, desc: 'An unholy blessing answers from below.' },
  { id: 'ilose', name: 'I Lose You Lose', grants: 'Executioner', requires: ['hall-of-fame', 'pit-to-hell'], cost: 80, desc: 'If I fall, you fall with me.' },
  { id: 'faster', name: 'Fast Then Faster', grants: 'Scout Captain', requires: ['barracks', 'stables'], cost: 40, desc: 'Fast, then faster still.' },
  { id: 'health', name: 'Lots Of Health', grants: 'Cleric', requires: ['mansion', 'mountaintop-cave'], cost: 70, desc: 'A line that refuses to fall.' }
];

const lineageTiers = [
  { tier: 'Base callings', nodes: [
    { name: 'Warrior', requires: [] }, { name: 'Rogue', requires: [] }, { name: 'Mage', requires: [] }, { name: 'Priest', requires: [] } ] },
  { tier: 'First paths', nodes: [
    { name: 'Knight', requires: ['barracks'] }, { name: 'Elite Warrior', requires: ['barracks'] }, { name: 'Samurai', requires: ['barracks'] }, { name: 'Brawler', requires: ['barracks'] },
    { name: 'Assassin', requires: ['barracks'] }, { name: 'Sword dancer', requires: ['barracks'] }, { name: 'Renegade', requires: ['barracks'] }, { name: 'Ninja', requires: ['barracks'] },
    { name: 'Wizard', requires: ['fletchery', 'mage-tower'] }, { name: 'Archmage', requires: ['fletchery', 'mage-tower'] }, { name: 'Elementalist', requires: ['mage-tower'] }, { name: 'Sorcerer', requires: ['mage-tower'] },
    { name: 'Devoted Priest', requires: ['mansion'] }, { name: 'Holy Priest', requires: ['mansion'] }, { name: 'Healer', requires: ['mansion'] }, { name: 'Monk', requires: ['mansion'] } ] },
  { tier: 'Combined arms', nodes: [
    { name: 'Berserker', requires: ['barracks', 'workshop'] }, { name: 'Thief', requires: ['barracks', 'blacksmith'] }, { name: 'Ranger', requires: ['fletchery', 'stables'] },
    { name: 'Mercenary', requires: ['barracks', 'hall-of-fame'] }, { name: 'Gladiator', requires: ['stables', 'workshop'] }, { name: 'Pyromancer', requires: ['mage-tower', 'alchemist-shop'] },
    { name: 'Rune Wielder', requires: ['mage-tower', 'blacksmith'] }, { name: 'Exorcist', requires: ['gateway-to-heaven'] }, { name: 'Bard', requires: ['hall-of-fame'] }, { name: 'Summoner', requires: ['cave', 'mage-tower'] } ] },
  { tier: 'High orders', nodes: [
    { name: 'Paladin', requires: ['blacksmith', 'gateway-to-heaven'] }, { name: 'Warlord', requires: ['factory', 'hall-of-fame'] }, { name: 'Vampire', requires: ['cave', 'pit-to-hell'] },
    { name: 'Necromancer', requires: ['pit-to-hell', 'mage-tower'] }, { name: 'Beast Master', requires: ['cave', 'stables'] }, { name: 'Dragon Warrior', requires: ['mountaintop-cave'] },
    { name: 'Pirate', requires: ['workshop', 'alchemist-shop'] }, { name: 'Dragon Slayer', requires: ['mountaintop-cave', 'blacksmith'] }, { name: 'Alchemist', requires: ['alchemist-shop'] },
    { name: 'Vampire Slayer', requires: ['pit-to-hell', 'blacksmith'] }, { name: 'Demon Slayer', requires: ['pit-to-hell'] }, { name: 'Templar knight', requires: ['gateway-to-heaven', 'blacksmith'] },
    { name: 'Angelic Messenger', requires: ['gateway-to-heaven'] }, { name: 'Unholy Disciple', requires: ['pit-to-hell'] }, { name: 'Death Knight', requires: ['pit-to-hell', 'hall-of-fame'] } ] },
  { tier: 'Legendary', nodes: [
    { name: 'Angel', requires: ['gateway-to-heaven', 'hall-of-fame'] }, { name: 'Demon', requires: ['pit-to-hell', 'factory'] }, { name: 'Prototype', requires: ['iron-works', 'factory', 'blacksmith'] } ] }
];

let deferredInstall;
let state = load();

function migrateV3(saved) {
  return {
    ...initial,
    crowns: Math.max(initial.crowns, saved.crowns || 0),
    renown: saved.renown || 0,
    day: saved.day || 1,
    buildings: saved.buildings || [],
    units: saved.units || []
  };
}
function load() {
  try {
    const v4 = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v4 && v4.version === 4) return { ...initial, ...v4, battle: null };
    const v3 = JSON.parse(localStorage.getItem(KEY_V3) || 'null');
    if (v3 && v3.version === 3) return migrateV3(v3);
    return { ...initial };
  } catch (e) { return { ...initial }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, battle: null })); } catch (e) { /* storage may be unavailable */ }
  const status = document.querySelector('#saveStatus');
  if (status) status.textContent = 'Saved on this device';
}
function money(value) { return `${value} ♛`; }
function generated(name) { return `assets/generated/${name}.png`; }
function svgCrest(type) {
  return `<span class="crest"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#icon-${type}"></use></svg></span>`;
}
function imgCrest(name) {
  return `<span class="crest"><img src="${generated(name)}" alt="" loading="lazy" onerror="this.style.display='none'"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#icon-unit"></use></svg></span>`;
}
function unlocked(requirements) { return requirements.every(id => state.buildings.includes(id)); }
function doctrine(id) { return doctrines.find(item => item.id === id); }
function family(id) { return families.find(item => item.id === id); }
function income() { return state.buildings.reduce((sum, id) => sum + (family(id)?.income || 0), 0); }
function upkeep() { return state.units.length * 3; }
function upgradeBonus(stat) { return state.upgrades.reduce((sum, id) => sum + (upgrades.find(u => u.id === id)?.[stat] || 0), 0); }
function baseCrowns(level) { return 1000 + level * 1000; }
function setToast(message) { const toast = document.querySelector('#battleToast'); if (toast) toast.textContent = message; }
function $(sel) { return document.querySelector(sel); }
function show(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-visible', v.id === `${view}View`));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === view));
  save();
  render();
}
function showViewOnly(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-visible', v.id === `${view}View`));
}

/* ---------- rendering ---------- */
function render() {
  renderResources();
  renderBuildings();
  renderUpgrades();
  renderAchievements();
  renderTree();
  renderLineage();
  renderWorld();
  renderBattle();
  renderNav();
}
function renderNav() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === state.view));
}
function renderResources() {
  $('#crownCount').textContent = state.crowns;
  $('#renownCount').textContent = state.renown;
  $('#dayCount').textContent = state.day;
  $('#hudLevel').textContent = state.level;
  $('#buildingCount').textContent = `${state.buildings.length} / ${families.length}`;
  $('#garrisonCount').textContent = `${state.units.length} / ${MAX_GARRISON}`;
  $('#upkeepCount').textContent = money(upkeep());
  $('#incomeCount').textContent = `+${income()}`;
  const next = families.find(item => !state.buildings.includes(item.id) && unlocked(item.requires));
  $('#capitalTip').textContent = next ? `Next: ${next.name} extends your doctrine.` : state.buildings.length ? `Income +${income()} crowns each turn. Keep a reserve for the field.` : 'Build Barracks first to place a Scout on the roster.';
}
function renderBuildings() {
  $('#buildingList').innerHTML = families.map(item => {
    const owned = state.buildings.includes(item.id);
    const ready = unlocked(item.requires);
    return `<div class="build-card ${owned ? 'owned' : ''} ${!ready ? 'locked' : ''}" data-family="${item.id}">${svgCrest(item.crest)}<div class="card-copy"><strong>${item.name}</strong><small>${owned ? `Operational · +${item.income} crowns / turn` : item.desc}</small></div>${owned ? '<span class="cost">✓</span>' : `<button class="mini-button" data-buy="${item.id}" ${!ready || state.crowns < item.cost ? 'disabled' : ''}>${money(item.cost)}</button>`}</div>`;
  }).join('');
}
function renderUpgrades() {
  $('#upgradeCount').textContent = `${state.upgrades.length} equipped`;
  $('#upgradeList').innerHTML = upgrades.map(item => {
    const owned = state.upgrades.includes(item.id);
    const ready = unlocked(item.requires);
    const fx = [item.attack ? `+${item.attack} atk` : '', item.defense ? `${item.defense > 0 ? '+' : ''}${item.defense} def` : '', item.health ? `+${item.health} hp` : ''].filter(Boolean).join(' · ');
    return `<div class="up-card ${owned ? 'owned' : ''}">${svgCrest('sword')}<div class="card-copy"><strong>${item.name}</strong><small>${owned ? `Equipped · ${fx}` : `${fx} · requires ${item.requires.map(id => family(id)?.name || id).join(', ')}`}</small></div>${owned ? '<span class="cost">✓</span>' : `<button class="mini-button" data-upgrade="${item.id}" ${!ready || state.crowns < item.cost ? 'disabled' : ''}>${money(item.cost)}</button>`}</div>`;
  }).join('');
}
function renderAchievements() {
  $('#achievementCount').textContent = `${state.achievements.length} earned`;
  $('#achievementList').innerHTML = achievements.map(item => {
    const earned = state.achievements.includes(item.id);
    const ready = unlocked(item.requires);
    return `<div class="ach-card ${earned ? 'earned' : ''} ${!ready ? 'locked' : ''}">${svgCrest('unit')}<div class="card-copy"><strong>${item.name}</strong><small>${earned ? `Earned · unlocks ${item.grants}` : `${item.desc} · unlocks ${item.grants}`}</small></div>${earned ? '<span class="cost">✓</span>' : `<button class="mini-button" data-ach="${item.id}" ${!ready || state.crowns < item.cost ? 'disabled' : ''}>${item.cost ? money(item.cost) : 'Claim'}</button>`}</div>`;
  }).join('');
}
function renderTree() {
  const famEl = $('#treeFamilies');
  if (famEl) famEl.innerHTML = `<h3>Families</h3>` + families.map(item => `<span class="class-node ${state.buildings.includes(item.id) ? 'unlocked' : ''}">${item.name}</span>`).join('');
  $('#treeList').innerHTML = doctrines.map(item => {
    const ready = unlocked(item.requires);
    const recruited = state.units.includes(item.id);
    const recruitButton = ready && !recruited ? `<button class="mini-button tree-recruit" data-recruit="${item.id}" ${state.crowns < item.cost || state.units.length >= MAX_GARRISON ? 'disabled' : ''}>Recruit</button>` : '';
    return `<div class="tree-card ${ready ? 'unlocked' : 'locked'}" data-doctrine="${item.id}"><span class="key-dot ${ready ? 'unlocked' : ''}"></span>${imgCrest('doctrine-' + item.id)}<strong>${item.name}</strong><small>${ready ? recruited ? 'In roster — ready for the field.' : `Unlocked · ${money(item.cost)} to recruit.` : `Requires ${item.hint}`}</small>${recruitButton}</div>`;
  }).join('');
}
function classUnlocked(node) {
  if (!node.requires.length) return true;
  if (unlocked(node.requires)) return true;
  return state.achievements.some(id => achievements.find(a => a.id === id)?.grants === node.name);
}
function renderLineage() {
  $('#lineageList').innerHTML = lineageTiers.map(tier => `<div class="lineage-tier"><h3>${tier.tier}</h3>${tier.nodes.map(node => `<span class="class-node ${classUnlocked(node) ? 'unlocked' : ''}" title="${node.requires.length ? 'Requires ' + node.requires.map(id => family(id)?.name || id).join(', ') : 'Base calling'}">${node.name}${node.requires.length ? `<small>${classUnlocked(node) ? 'unlocked' : 'locked'}</small>` : ''}</span>`).join('')}</div>`).join('');
}
function renderWorld() {
  $('#worldCrowns').textContent = state.crowns;
  $('#worldLevel').textContent = `Level ${state.level}`;
  const positions = [[18, 70], [34, 34], [52, 62], [66, 28], [80, 56], [90, 34]];
  $('#worldMap').innerHTML = Array.from({ length: LEVELS }, (_, i) => {
    const level = i + 1;
    const cleared = state.cleared.includes(level);
    const locked = level > state.level;
    const current = level === state.level;
    const [x, y] = positions[i];
    return `<button class="level-node ${cleared ? 'cleared' : ''} ${current ? 'current' : ''} ${locked ? 'locked' : ''}" style="left:${x}%;top:${y}%" data-level="${level}" ${locked ? 'disabled' : ''} aria-label="Level ${level}${cleared ? ' cleared' : ''}"><b>${level}</b><small>${cleared ? 'cleared' : current ? 'march' : 'locked'}</small></button>`;
  }).join('');
  $('#worldHint').textContent = state.buildings.length ? `Level ${state.level} is ready. Spend your ${income()}/turn wisely — the pass only fields what the tree unlocks.` : 'Raise your capital first — the field only fields what the tree unlocks.';
}
function battleState() { return state.battle || { enemy: 100, player: 100, units: [], turn: 0, boost: 0, focused: false, controlled: -1, ended: '' }; }
function renderBattle() {
  const battle = battleState();
  const playerStart = 100 + upgradeBonus('health');
  $('#battleCrownCount').textContent = state.crowns;
  $('#enemyHealth').textContent = Math.max(0, battle.enemy);
  $('#playerHealth').textContent = Math.max(0, Math.round((battle.player / playerStart) * 100));
  $('#battleTurn').textContent = `Turn ${battle.turn}`;
  $('#battleChapter').textContent = `THE ASHEN PASS · SKIRMISH 0${state.level}`;
  $('#rosterLabel').textContent = `${state.units.length} stored`;
  $('#rosterList').innerHTML = state.units.map(id => {
    const item = doctrine(id);
    const power = item.power + upgradeBonus('attack');
    return `<div class="roster-card">${imgCrest('doctrine-' + item.id)}<div class="card-copy"><strong>${item.name}</strong><small>${money(item.cost)} · ${power} power</small><button class="mini-button" data-deploy="${item.id}" ${state.crowns < item.cost || battle.ended || battle.units.length >= MAX_GARRISON ? 'disabled' : ''}>Deploy</button></div></div>`;
  }).join('') || '<p class="empty-roster">Unlock a doctrine in the capital to form a roster.</p>';
  $('#unitLayer').innerHTML = battle.units.map((unit, index) => `<div class="unit ${battle.controlled === index ? 'controlled' : ''}" title="${unit.name}" style="left:${10 + (index % 6) * 14}%;--unit-color:${unit.color}">${imgCrest('doctrine-' + unit.id)}</div>`).join('');
  const enemyBar = $('#enemyKeepBar'); if (enemyBar) enemyBar.style.width = `${Math.max(0, battle.enemy)}%`;
  const playerBar = $('#playerKeepBar'); if (playerBar) playerBar.style.width = `${Math.max(0, (battle.player / playerStart) * 100)}%`;
  $('#battleTip').textContent = battle.ended === 'victory' ? 'The pass is yours. Continue to the world map for the next level.' : battle.ended === 'defeat' ? 'The keep fell. Restart the level and change your approach.' : state.units.length ? 'Deploy a doctrine, then seize a troop to press the attack yourself.' : 'Your capital determines what can reach this field.';
  $('#battleStatus').textContent = battle.ended ? `${battle.ended === 'victory' ? 'VICTORY' : 'DEFEAT'} · ASHEN PASS` : battle.turn ? `Turn ${battle.turn} · Choose the next order` : 'Choose your opening';
  const noBattle = battle.ended;
  $('#focusButton').disabled = !!noBattle || !battle.units.length || battle.focused;
  $('#controlButton').disabled = !!noBattle || !battle.units.length;
  $('#rallyButton').disabled = !!noBattle || !battle.units.length || state.crowns < 10;
  $('#volleyButton').disabled = !!noBattle || state.crowns < 30 || battle.enemy <= 0;
  $('#retreatButton').disabled = false;
  $('#replayButton').classList.toggle('is-hidden', !battle.ended);
}
function renderAllViews() { render(); }

/* ---------- actions ---------- */
function buy(id) {
  const item = family(id);
  if (!item || state.buildings.includes(id) || state.crowns < item.cost || !unlocked(item.requires)) return;
  state.crowns -= item.cost; state.buildings.push(id);
  if (id === 'hall-of-fame') state.renown += 15;
  save(); render(); setToast(`${item.name} raised.`);
}
function buyUpgrade(id) {
  const item = upgrades.find(u => u.id === id);
  if (!item || state.upgrades.includes(id) || state.crowns < item.cost || !unlocked(item.requires)) return;
  state.crowns -= item.cost; state.upgrades.push(id);
  save(); render(); setToast(`${item.name} equipped.`);
}
function claimAchievement(id) {
  const item = achievements.find(a => a.id === id);
  if (!item || state.achievements.includes(id) || state.crowns < item.cost || !unlocked(item.requires)) return;
  state.crowns -= item.cost; state.achievements.push(id);
  save(); render(); setToast(`${item.name} earned — ${item.grants} joins the lineage.`);
}
function recruit(id) {
  const item = doctrine(id);
  if (!item || !unlocked(item.requires) || state.units.includes(id) || state.units.length >= MAX_GARRISON || state.crowns < item.cost) return;
  state.crowns -= item.cost; state.units.push(id);
  save(); render(); setToast(`${item.name} recruited to the roster.`);
}
function newBattle() { return { enemy: 100, player: 100 + upgradeBonus('health'), units: [], turn: 0, boost: 0, focused: false, controlled: -1, ended: '' }; }
function enterBattle() {
  if (!state.battle) state.battle = newBattle();
  show('battle');
}
function enterLevel(level) {
  if (level > state.level) return;
  state.battle = newBattle();
  show('battle');
}
function enemyTick(battle) {
  const pressure = Math.max(2, 8 + Math.floor(battle.turn / 2) - Math.min(4, battle.units.length)) - upgradeBonus('defense');
  const absorbed = battle.boost ? Math.min(Math.max(pressure, 0), battle.boost) : 0;
  battle.player = Math.max(0, battle.player - Math.max(0, pressure) + absorbed);
  battle.boost = 0;
  return { pressure: Math.max(0, pressure), absorbed };
}
function finish(battle) {
  if (battle.enemy <= 0) {
    battle.enemy = 0; battle.ended = 'victory';
    if (!state.cleared.includes(state.level)) {
      state.cleared.push(state.level); state.renown += 20; state.day += 1; state.crowns += 1000;
      if (state.level < LEVELS) state.level += 1;
    }
    setToast('Victory. The pass is yours. +1000 crowns.');
  } else if (battle.player <= 0) {
    battle.player = 0; battle.ended = 'defeat';
    setToast('Defeat. The level restarts — rebuild and return.');
  }
}
function resolveAction(label, damage, boost = 0) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  battle.turn += 1;
  let total = damage;
  if (battle.controlled >= 0 && battle.units[battle.controlled]) total += battle.units[battle.controlled].power + upgradeBonus('attack');
  battle.enemy = Math.max(0, battle.enemy - total);
  battle.boost = boost;
  const result = enemyTick(battle);
  setToast(`${label} · ${total} enemy damage · pressure ${result.pressure}${result.absorbed ? ` (${result.absorbed} absorbed)` : ''}.`);
  finish(battle); save(); render();
}
function deploy(id) {
  const item = doctrine(id); const battle = state.battle;
  if (!item || !battle || battle.ended || state.crowns < item.cost || battle.units.length >= MAX_GARRISON) return;
  state.crowns -= item.cost;
  battle.units.push({ id, name: item.name, crest: item.crest, color: item.color, power: item.power });
  const power = item.power + upgradeBonus('attack') + (battle.focused ? 4 : 0);
  if (battle.focused) battle.focused = false;
  resolveAction(`${item.name} advances`, power);
}
function holdTurn() {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  battle.turn += 1;
  const result = enemyTick(battle);
  setToast(`Hold the line · enemy pressure ${result.pressure}${result.absorbed ? ` (${result.absorbed} absorbed)` : ''}.`);
  finish(battle); save(); render();
}
function focusLane() { const battle = state.battle; if (!battle || battle.ended || !battle.units.length || battle.focused) return; battle.focused = true; setToast('Focus lane set. The next deployment gains +4 damage.'); save(); render(); }
function seizeControl() {
  const battle = state.battle;
  if (!battle || battle.ended || !battle.units.length) return;
  battle.controlled = (battle.controlled + 1) % battle.units.length;
  const unit = battle.units[battle.controlled];
  setToast(`You seized control of the ${unit.name}. It strikes each turn.`);
  save(); render();
}
function rally() { const battle = state.battle; if (!battle || battle.ended || !battle.units.length || state.crowns < 10) return; state.crowns -= 10; resolveAction('Rally ordered', 8 + battle.units.length * 2, 7); }
function volley() { const battle = state.battle; if (!battle || battle.ended || state.crowns < 30) return; state.crowns -= 30; resolveAction('Keep volley fired', 18); }
function retreat() { state.battle = null; show('world'); }
function resetCampaign() { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_V3); } catch (e) { /* ignore */ } state = { ...initial }; save(); show('title'); }
function playCampaign() { if (!state.buildings.length) { show('world'); } else { show('world'); } }
function loadGame() { state.battle = null; show(state.buildings.length ? 'capital' : 'world'); }

/* ---------- events ---------- */
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; const b = $('#installButton'); if (b) b.textContent = 'Install game'; });
window.addEventListener('appinstalled', () => { deferredInstall = null; const b = $('#installButton'); if (b) b.textContent = 'Installed'; });

document.addEventListener('click', event => {
  const t = event.target;
  const buyButton = t.closest('[data-buy]'); if (buyButton) return buy(buyButton.dataset.buy);
  const upButton = t.closest('[data-upgrade]'); if (upButton) return buyUpgrade(upButton.dataset.upgrade);
  const achButton = t.closest('[data-ach]'); if (achButton) return claimAchievement(achButton.dataset.ach);
  const recruitButton = t.closest('[data-recruit]'); if (recruitButton) return recruit(recruitButton.dataset.recruit);
  const deployButton = t.closest('[data-deploy]'); if (deployButton) return deploy(deployButton.dataset.deploy);
  const levelButton = t.closest('[data-level]'); if (levelButton) return enterLevel(Number(levelButton.dataset.level));
  const tab = t.closest('[data-view]'); if (tab) return show(tab.dataset.view);
  if (t.closest('#playButton')) return playCampaign();
  if (t.closest('#brandHome')) return show('title');
  if (t.closest('#loadButton')) return loadGame();
  if (t.closest('#instructionsButton')) return show('instructions');
  if (t.closest('#closeInstructions')) return show('world');
  if (t.closest('#worldCapitalButton')) return show('capital');
  if (t.closest('#enterBattle')) return enterBattle();
  if (t.closest('#focusButton')) return focusLane();
  if (t.closest('#controlButton')) return seizeControl();
  if (t.closest('#rallyButton')) return rally();
  if (t.closest('#volleyButton')) return volley();
  if (t.closest('#retreatButton')) return retreat();
  if (t.closest('#holdButton')) return holdTurn();
  if (t.closest('#replayButton')) { state.battle = newBattle(); save(); render(); return; }
  if (t.closest('#resetButton')) return resetCampaign();
  if (t.closest('#fullscreenButton')) { document.documentElement.requestFullscreen?.().catch(() => {}); return; }
  if (t.closest('#installButton')) { if (deferredInstall) deferredInstall.prompt(); else { const b = $('#installButton'); if (b) b.textContent = 'Use your browser menu to install'; } return; }
});

window.addEventListener('keydown', event => {
  if (event.key === 'm') { state.crowns += 2; save(); render(); }
});

setInterval(() => {
  if (state.view === 'capital' || state.view === 'tree' || state.view === 'world') {
    state.crowns = Math.max(0, state.crowns + Math.max(1, income()));
    save(); render();
  }
}, 4000);

if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reduced-motion');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

/* Deterministic QA hook: the Playwright contract drives these. */
window.KB = {
  get state() { return state; },
  cacheName: CACHE_NAME,
  levels: LEVELS,
  families: () => families.map(f => f.id),
  doctrines: () => doctrines.map(d => d.id),
  buy, buyUpgrade, claimAchievement, recruit, enterBattle, enterLevel,
  deploy, holdTurn, focusLane, seizeControl, rally, volley, retreat,
  newBattle, show, grantCrowns: n => { state.crowns += n; save(); render(); },
  setState: patch => { state = { ...state, ...patch }; save(); render(); }
};

render();
show(state.view || 'title');