const KEY='kingdom-battles-fresh-v1';
const initial={crowns:120,renown:0,day:1,buildings:[],units:[],view:'capital',battle:null};
const buildings=[
 {id:'barracks',name:'Barracks',cost:45,desc:'Unlocks Scout and gives the capital a garrison.',crest:'scout'},
 {id:'watchtower',name:'Watchtower',cost:70,requires:['barracks'],desc:'Unlocks Archer and extends your keep volley.',crest:'archer'},
 {id:'stable',name:'Stable',cost:90,requires:['barracks'],desc:'Unlocks Lancer, the hard counter to heavy pushes.',crest:'lancer'},
 {id:'workshop',name:'Workshop',cost:110,requires:['barracks'],desc:'Required for the Ember Knight doctrine.',crest:'ember'},
 {id:'sanctum',name:'Arcane Sanctum',cost:180,requires:['watchtower','workshop'],desc:'The capital’s final building. Renown grows here.',crest:'ember'}
];
const tree=[
 {id:'scout',name:'Scout',requires:'Barracks + 45 crowns',ok:s=>s.buildings.includes('barracks')},
 {id:'archer',name:'Archer',requires:'Watchtower',ok:s=>s.buildings.includes('watchtower')},
 {id:'lancer',name:'Lancer',requires:'Stable + Barracks',ok:s=>s.buildings.includes('stable')},
 {id:'ember',name:'Ember Knight',requires:'Stable + Workshop + Lancer',ok:s=>s.buildings.includes('stable')&&s.buildings.includes('workshop')&&s.units.includes('lancer')}
];
const unitData={scout:{name:'Scout',cost:35,color:'#6e9d62',crest:'scout',power:8},archer:{name:'Archer',cost:55,color:'#3567d4',crest:'archer',power:13},lancer:{name:'Lancer',cost:75,color:'#e5b85c',crest:'lancer',power:20},ember:{name:'Ember Knight',cost:100,color:'#e56b45',crest:'ember',power:32}};
let state=load();
function load(){try{return {...initial,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...initial}}}
function save(){localStorage.setItem(KEY,JSON.stringify({...state,battle:null})); document.querySelector('#saveStatus').textContent='Saved on this device';}
function money(n){return `${n} ♛`}
function crest(type){return `<svg class="crest" viewBox="0 0 64 64"><use href="#crest-${type}"></use></svg>`}
function render(){
 document.querySelector('#crownCount').textContent=state.crowns;document.querySelector('#renownCount').textContent=state.renown;document.querySelector('#dayCount').textContent=state.day;document.querySelector('#buildingCount').textContent=`${state.buildings.length} / 5`;document.querySelector('#garrisonCount').textContent=`${state.units.length} / 3`;
 document.querySelector('#buildingList').innerHTML=buildings.map(b=>{const owned=state.buildings.includes(b.id),ready=!b.requires||b.requires.every(x=>state.buildings.includes(x));return `<div class="build-card ${owned?'owned':''} ${!ready?'locked':''}">${crest(b.crest)}<div class="card-copy"><strong>${b.name}</strong><small>${owned?'Operational · '+b.desc:b.desc}</small></div>${owned?'<span class="cost">✓</span>':`<button class="mini-button" data-buy="${b.id}" ${!ready||state.crowns<b.cost?'disabled':''}>${money(b.cost)}</button>`}</div>`}).join('');
 document.querySelector('#treeList').innerHTML=tree.map(t=>{const ok=t.ok(state);return `<div class="tree-card ${ok?'unlocked':'locked'}"><span class="key-dot ${ok?'unlocked':''}"></span><strong>${t.name}</strong><small>${ok?'Doctrine unlocked — add it to your battle roster.':`Requires ${t.requires}`}</small></div>`}).join('');
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active-view',x.id===state.view+'View'));
 renderBattle();
}
function renderBattle(){const b=state.battle||{enemy:100,player:100,units:[],charge:0};document.querySelector('#battleCrownCount').textContent=state.crowns;document.querySelector('#enemyHealth').textContent=Math.max(0,b.enemy);document.querySelector('#rosterLabel').textContent=`${state.units.length} units`;
 document.querySelector('#rosterList').innerHTML=(state.units.length?state.units:[]).map(id=>{const u=unitData[id];return `<div class="roster-card">${crest(u.crest)}<div class="card-copy"><strong>${u.name}</strong><small>${money(u.cost)} · ${u.power} power</small><button class="mini-button" data-deploy="${id}" ${state.crowns<u.cost?'disabled':''}>Deploy</button></div></div>`}).join('')||'<p style="padding:0 14px 18px;color:#9aa5b7;font-size:12px">Unlock a doctrine in the capital to form a roster.</p>';
 document.querySelector('#unitLayer').innerHTML=b.units.map((u,i)=>`<div class="unit" style="left:${16+i*15}%;--unit-color:${u.color}">${crest(u.crest)}</div>`).join('');document.querySelector('#battleTip').textContent=state.units.length?'Deploy behind the front line, then command your best unit for a decisive strike.':'Your capital determines what can reach this field.';document.querySelector('#volleyButton').disabled=state.crowns<30||b.enemy<=0;
}
function buy(id){const b=buildings.find(x=>x.id===id);if(!b||state.buildings.includes(id)||state.crowns<b.cost||b.requires?.some(x=>!state.buildings.includes(x)))return;state.crowns-=b.cost;state.buildings.push(id);if(id==='sanctum')state.renown+=15;save();render()}
function enterBattle(){state.view='battle';state.battle={enemy:100,player:100,units:[],charge:0};save();render()}
function deploy(id){const u=unitData[id],b=state.battle;if(!u||!b||state.crowns<u.cost||b.enemy<=0)return;state.crowns-=u.cost;b.units.push(u);b.charge+=8;const damage=u.power+Math.round(Math.random()*8);b.enemy=Math.max(0,b.enemy-damage);document.querySelector('#battleToast').textContent=`${u.name} advances — ${damage} damage dealt.`;if(b.enemy===0){state.renown+=20;state.day+=1;document.querySelector('#battleToast').textContent='Victory. The pass is yours. Renown +20.'}save();render()}
function volley(){const b=state.battle;if(!b||state.crowns<30||b.enemy<=0)return;state.crowns-=30;b.enemy=Math.max(0,b.enemy-18);document.querySelector('#battleToast').textContent='Keep volley fired — 18 damage.';save();render()}
function retreat(){state.view='capital';state.battle=null;save();render()}
document.addEventListener('click',e=>{const buyButton=e.target.closest('[data-buy]');if(buyButton)buy(buyButton.dataset.buy);const deployButton=e.target.closest('[data-deploy]');if(deployButton)deploy(deployButton.dataset.deploy);const tab=e.target.closest('[data-view]');if(tab){state.view=tab.dataset.view;save();render()}if(e.target.closest('#enterBattle'))enterBattle();if(e.target.closest('#volleyButton'))volley();if(e.target.closest('#retreatButton'))retreat();if(e.target.closest('#resetButton')){localStorage.removeItem(KEY);state={...initial};render()}if(e.target.closest('#fullscreenButton'))document.documentElement.requestFullscreen?.();if(e.target.closest('#installButton'))document.querySelector('#installButton').textContent='Use your browser menu to install';});
window.addEventListener('keydown',e=>{if(e.key==='m')state.crowns+=2;});
setInterval(()=>{if(state.view==='capital'){state.crowns+=2;save();render()}},2000);if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reduced-motion');if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});render();
