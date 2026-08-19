const KEY='kingdom-battles-cinderwatch-v2';
const initial={version:2,crowns:300,renown:0,day:1,buildings:[],units:[],view:'capital',battle:null};
const families=[
 {id:'barracks',name:'Barracks',cost:45,requires:[],desc:'Infantry house. Produces Scouts and unlocks the first doctrine.',crest:'scout',income:3},
 {id:'fletchery',name:'Fletchery',cost:70,requires:['barracks'],desc:'Archers train here. Pair with Barracks for a balanced line.',crest:'archer',income:2},
 {id:'mansion',name:'Mansion',cost:95,requires:['barracks'],desc:'Bosses rally the realm and add +2 crowns each turn.',crest:'boss',income:2},
 {id:'stables',name:'Stables',cost:110,requires:['barracks'],desc:'Cavalry charge. Requires an Infantry foundation.',crest:'lancer',income:1},
 {id:'mage-tower',name:'Mage Tower',cost:130,requires:['fletchery'],desc:'Wizards bend the battlefield with ranged power.',crest:'mage',income:1},
 {id:'cave',name:'Cave',cost:140,requires:['mansion'],desc:'Trolls hold the heavy front and soak pressure.',crest:'heavy',income:1},
 {id:'factory',name:'Factory',cost:155,requires:['mansion','stables'],desc:'Catapults turn a prepared economy into keep pressure.',crest:'machine',income:1},
 {id:'mountaintop-cave',name:'Mountaintop Cave',cost:180,requires:['mage-tower','cave'],desc:'Dragons: the rarest aerial doctrine.',crest:'dragon',income:1},
 {id:'workshop',name:'Workshop',cost:105,requires:['barracks'],desc:'Rams breach gates when Infantry has made the opening.',crest:'ram',income:2},
 {id:'alchemist-shop',name:'Alchemist Shop',cost:125,requires:['fletchery','workshop'],desc:'Bombers reward a ranged plus siege combination.',crest:'bomb',income:1},
 {id:'iron-works',name:'Iron Works',cost:190,requires:['factory'],desc:'Cannons anchor the late-game line.',crest:'cannon',income:1},
 {id:'blacksmith',name:'Blacksmith',cost:150,requires:['stables','workshop'],desc:'Tempers equipment and raises every deployed unit power.',crest:'forge',income:1},
 {id:'hall-of-fame',name:'Hall of Fame',cost:220,requires:['mansion','blacksmith'],desc:'Bosses become a lasting renown engine.',crest:'boss',income:3},
 {id:'pit-to-hell',name:'Pit to Hell',cost:240,requires:['cave','alchemist-shop'],desc:'A risky infernal doctrine with decisive damage.',crest:'gate',income:0},
 {id:'gateway-to-heaven',name:'Gateway to Heaven',cost:260,requires:['mountaintop-cave','hall-of-fame'],desc:'The capstone route. Your realm has a legend.',crest:'gate',income:0}
];
const doctrines=[
 {id:'scout',name:'Scout',crest:'scout',color:'#6e9d62',cost:28,power:8,health:16,requires:['barracks'],hint:'Barracks + 28 crowns'},
 {id:'archer',name:'Archer',crest:'archer',color:'#4f82df',cost:42,power:12,health:13,requires:['barracks','fletchery'],hint:'Barracks + Fletchery'},
 {id:'boss',name:'Boss',crest:'boss',color:'#b97a4a',cost:64,power:18,health:32,requires:['barracks','mansion'],hint:'Barracks + Mansion'},
 {id:'lancer',name:'Cavalry',crest:'lancer',color:'#e5b85c',cost:58,power:20,health:20,requires:['barracks','stables'],hint:'Barracks + Stables'},
 {id:'wizard',name:'Wizard',crest:'mage',color:'#9a79e5',cost:70,power:25,health:14,requires:['fletchery','mage-tower'],hint:'Fletchery + Mage Tower'},
 {id:'troll',name:'Troll',crest:'heavy',color:'#86a86b',cost:75,power:17,health:48,requires:['mansion','cave'],hint:'Mansion + Cave'},
 {id:'catapult',name:'Catapult',crest:'machine',color:'#c58a58',cost:82,power:34,health:22,requires:['mansion','stables','factory'],hint:'Mansion + Stables + Factory'},
 {id:'dragon',name:'Dragon',crest:'dragon',color:'#e56b45',cost:110,power:48,health:30,requires:['mage-tower','cave','mountaintop-cave'],hint:'Mage Tower + Cave + Mountaintop Cave'},
 {id:'ram',name:'Ram',crest:'ram',color:'#c6a66e',cost:68,power:29,health:26,requires:['barracks','workshop'],hint:'Barracks + Workshop'},
 {id:'bomber',name:'Bomber',crest:'bomb',color:'#d88856',cost:76,power:32,health:15,requires:['fletchery','workshop','alchemist-shop'],hint:'Fletchery + Workshop + Alchemist Shop'},
 {id:'cannon',name:'Cannon',crest:'cannon',color:'#b4c0c2',cost:96,power:42,health:20,requires:['factory','iron-works'],hint:'Factory + Iron Works'},
 {id:'infernal',name:'Infernal',crest:'gate',color:'#d34f56',cost:105,power:55,health:18,requires:['cave','alchemist-shop','pit-to-hell'],hint:'Cave + Alchemist Shop + Pit to Hell'}
];
let state=load();
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');return saved&&saved.version===2?{...initial,...saved,battle:null}:{...initial}}catch{return {...initial}}}
function save(){localStorage.setItem(KEY,JSON.stringify({...state,battle:null}));const el=document.querySelector('#saveStatus');if(el)el.textContent='Saved on this device'}
function money(n){return `${n} ♛`}
function crest(type){return `<svg class="crest" viewBox="0 0 64 64"><use href="#crest-${type}"></use></svg>`}
function unlocked(req){return req.every(id=>state.buildings.includes(id))}
function income(){return state.buildings.reduce((sum,id)=>sum+(families.find(f=>f.id===id)?.income||0),0)}
function upkeep(){return state.units.length*3}
function render(){
 document.querySelector('#crownCount').textContent=state.crowns;document.querySelector('#renownCount').textContent=state.renown;document.querySelector('#dayCount').textContent=state.day;document.querySelector('#buildingCount').textContent=`${state.buildings.length} / ${families.length}`;document.querySelector('#garrisonCount').textContent=`${state.units.length} / 8`;document.querySelector('#upkeepCount').textContent=money(upkeep());
 const readyBuild=families.find(f=>!state.buildings.includes(f.id)&&unlocked(f.requires));document.querySelector('#capitalTip span').textContent=readyBuild?`Next: ${readyBuild.name} can extend your doctrine.`:state.buildings.length?`Income +${income()} crowns each turn. Keep a reserve for the field.`:'Build Barracks first to put a Scout on the board.';
 document.querySelector('#buildingList').innerHTML=families.map(f=>{const owned=state.buildings.includes(f.id),ready=unlocked(f.requires);return `<div class="build-card ${owned?'owned':''} ${!ready?'locked':''}">${crest(f.crest)}<div class="card-copy"><strong>${f.name}</strong><small>${owned?'Operational · +'+f.income+' crowns / turn':f.desc}</small></div>${owned?'<span class="cost">✓</span>':`<button class="mini-button" data-buy="${f.id}" ${!ready||state.crowns<f.cost?'disabled':''}>${money(f.cost)}</button>`}</div>`}).join('');
 document.querySelector('#treeList').innerHTML=doctrines.map(d=>{const ok=unlocked(d.requires);return `<div class="tree-card ${ok?'unlocked':'locked'}"><span class="key-dot ${ok?'unlocked':''}"></span>${crest(d.crest)}<strong>${d.name}</strong><small>${ok?'Doctrine unlocked — recruit it below.':`Requires ${d.hint}`}</small></div>`}).join('');
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active-view',x.id===state.view+'View'));renderBattle();
}
function renderBattle(){const b=state.battle||{enemy:100,player:100,units:[],turn:0,boost:0,ended:''};document.querySelector('#battleCrownCount').textContent=state.crowns;document.querySelector('#enemyHealth').textContent=Math.max(0,b.enemy);document.querySelector('#battleTurn').textContent=`Turn ${b.turn}`;document.querySelector('#rosterLabel').textContent=`${state.units.length} doctrines`;
 document.querySelector('#rosterList').innerHTML=state.units.map(id=>{const u=doctrines.find(d=>d.id===id);return `<div class="roster-card">${crest(u.crest)}<div class="card-copy"><strong>${u.name}</strong><small>${money(u.cost)} · ${u.power+(state.buildings.includes('blacksmith')?5:0)} power</small><button class="mini-button" data-deploy="${id}" ${state.crowns<u.cost||b.ended?'disabled':''}>Deploy</button></div></div>`}).join('')||'<p class="empty-roster">Unlock a doctrine in the capital to form a roster.</p>';
 document.querySelector('#unitLayer').innerHTML=b.units.map((u,i)=>`<div class="unit" style="left:${12+(i%6)*14}%;--unit-color:${u.color}">${crest(u.crest)}</div>`).join('');document.querySelector('#battleTip').textContent=b.ended==='victory'?'The pass is yours. Retreat, build again, and make the next push stronger.':b.ended==='defeat'?'The keep fell. Retreat, change your combination, and try again.':state.units.length?'Deploy a counter to the enemy pressure, then use Command boost to protect your line.':'Your capital determines what can reach this field.';document.querySelector('#battleStatus').textContent=b.ended?b.ended==='victory'?'VICTORY · ASHEN PASS':'DEFEAT · ASHEN PASS':'Choose your opening';document.querySelector('#commandButton').disabled=state.crowns<10||b.ended||!b.units.length;document.querySelector('#volleyButton').disabled=state.crowns<30||b.ended||b.enemy<=0;document.querySelector('#retreatButton').disabled=false;
}
function buy(id){const f=families.find(x=>x.id===id);if(!f||state.buildings.includes(id)||state.crowns<f.cost||!unlocked(f.requires))return;state.crowns-=f.cost;state.buildings.push(id);if(id==='hall-of-fame')state.renown+=15;save();render()}
function enterBattle(){state.view='battle';state.battle={enemy:100,player:100,units:[],turn:0,boost:0,ended:''};save();render()}
function enemyTick(b){const pressure=Math.max(2,8+Math.floor(b.turn/2)-Math.min(4,b.units.length));const armor=b.boost?2:0;b.player=Math.max(0,b.player-pressure+armor);b.boost=0;return pressure}
function finish(b){if(b.enemy<=0){b.enemy=0;b.ended='victory';state.renown+=20;state.day+=1;state.crowns+=55;document.querySelector('#battleToast').textContent='Victory. The pass is yours. Renown +20, crowns +55.'}else if(b.player<=0){b.player=0;b.ended='defeat';document.querySelector('#battleToast').textContent='Defeat. The enemy broke through. Rebuild and return.'}}
function deploy(id){const u=doctrines.find(x=>x.id===id),b=state.battle;if(!u||!b||b.ended||state.crowns<u.cost)return;state.crowns-=u.cost;b.units.push(u);b.turn+=1;const bonus=state.buildings.includes('blacksmith')?5:0;const damage=u.power+bonus+(u.id==='catapult'||u.id==='cannon'?6:0);b.enemy=Math.max(0,b.enemy-damage);const pressure=enemyTick(b);document.querySelector('#battleToast').textContent=`${u.name} advances — ${damage} damage. Enemy pressure: ${pressure}.`;finish(b);save();render()}
function command(){const b=state.battle;if(!b||b.ended||state.crowns<10||!b.units.length)return;state.crowns-=10;b.turn+=1;b.boost=7;const damage=8+b.units.length*2;b.enemy=Math.max(0,b.enemy-damage);const pressure=enemyTick(b);document.querySelector('#battleToast').textContent=`Command boost: ${damage} formation damage. Your line absorbs the next ${pressure} pressure.`;finish(b);save();render()}
function volley(){const b=state.battle;if(!b||b.ended||state.crowns<30)return;state.crowns-=30;b.turn+=1;b.enemy=Math.max(0,b.enemy-18);const pressure=enemyTick(b);document.querySelector('#battleToast').textContent=`Keep volley fired — 18 damage. Enemy pressure: ${pressure}.`;finish(b);save();render()}
function retreat(){state.view='capital';state.battle=null;save();render()}
document.addEventListener('click',e=>{const buyButton=e.target.closest('[data-buy]');if(buyButton)buy(buyButton.dataset.buy);const deployButton=e.target.closest('[data-deploy]');if(deployButton)deploy(deployButton.dataset.deploy);const tab=e.target.closest('[data-view]');if(tab){state.view=tab.dataset.view;save();render()}if(e.target.closest('#enterBattle'))enterBattle();if(e.target.closest('#commandButton'))command();if(e.target.closest('#volleyButton'))volley();if(e.target.closest('#retreatButton'))retreat();if(e.target.closest('#resetButton')){localStorage.removeItem(KEY);state={...initial};render()}if(e.target.closest('#fullscreenButton'))document.documentElement.requestFullscreen?.().catch(()=>{});if(e.target.closest('#installButton'))document.querySelector('#installButton').textContent='Use your browser menu to install';});
window.addEventListener('keydown',e=>{if(e.key==='m'){state.crowns+=2;save();render()}});setInterval(()=>{if(state.view==='capital'){state.crowns+=Math.max(1,income());state.crowns=Math.max(0,state.crowns-upkeep());save();render()}},4000);if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reduced-motion');if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});render();
