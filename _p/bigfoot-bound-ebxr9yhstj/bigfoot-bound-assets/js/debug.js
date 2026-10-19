'use strict';
// ================= DEBUG MODE =================
// Bug button (top-right) opens a panel. "Debug mode" checkbox unlocks a world/stage picker.
// While debug is on, progress is NOT saved — your real save is untouched and restored when you turn it off.
(()=>{
const DBG_KEY='bigfootBound.debug',realSave=saveG;
const DB={on:localStorage.getItem(DBG_KEY)==='1',inf:true,unlock:true};
const css=document.createElement('style');css.textContent=`
#dbgB{position:fixed;top:8px;right:8px;z-index:20;width:34px;height:34px;border-radius:9px;border:2px solid #9fc77a90;background:#0b140fc0;color:#f2a93b;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.55;transition:opacity .2s}
#dbgB:hover,#dbgB.on{opacity:1}#dbgB.on{border-color:#f2a93b;box-shadow:0 0 10px #f2a93b80}
#dbgP{position:fixed;top:50px;right:8px;z-index:21;width:250px;background:#0b140fef;border:2px solid #9fc77a;border-radius:12px;padding:12px 14px;color:#e8dfc6;font:600 13px system-ui,sans-serif;display:none;box-shadow:0 10px 30px #000a}
#dbgP.open{display:block}#dbgP h4{margin:0 0 8px;color:#f2a93b;font-size:15px;letter-spacing:.06em}
#dbgP label{display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer}
#dbgP select{width:100%;margin:3px 0 8px;padding:5px;border-radius:6px;background:#173323;color:#e8dfc6;border:1px solid #9fc77a90;font:inherit}
#dbgP .row{display:flex;gap:8px;margin-top:8px}#dbgP button{flex:1;padding:8px;border-radius:8px;border:2px solid #1c140c;font:800 13px system-ui;cursor:pointer}
#dbgP .go{background:#f2a93b;color:#1c140c}#dbgP .map{background:#2f5a32;color:#e8dfc6}
#dbgP .opts{border-top:1px solid #9fc77a50;margin-top:8px;padding-top:6px}#dbgP .dis{opacity:.35;pointer-events:none}
#dbgP small{display:block;color:#8a9a7a;font-weight:500;margin-top:8px;line-height:1.35}
#dbgTag{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:19;background:#f2a93b;color:#1c140c;font:900 11px system-ui;letter-spacing:.14em;padding:3px 10px;border-radius:99px;display:none;pointer-events:none}`;
document.head.appendChild(css);
const b=document.createElement('button');b.id='dbgB';b.title='Debug';b.textContent='🐞';
const tag=document.createElement('div');tag.id='dbgTag';tag.textContent='DEBUG · NOT SAVING';
const p=document.createElement('div');p.id='dbgP';p.innerHTML=`<h4>🐞 DEBUG</h4>
<label><input type="checkbox" id="dbgOn"> Debug mode</label>
<div id="dbgBody"><div class="opts">
World<select id="dbgW"></select>
Stage<select id="dbgL"></select>
Hoss form<select id="dbgF"><option value="small">Little Hoss</option><option value="big">Big Hoss</option><option value="pine">Pine Hoss</option><option value="sky">Sky Hoss</option><option value="titan">Titan Hoss</option></select>
<label><input type="checkbox" id="dbgInf" checked> Infinite lives</label>
<label><input type="checkbox" id="dbgUn" checked> Unlock every stage on map</label>
<div class="row"><button class="go" id="dbgGo">▶ PLAY</button><button class="map" id="dbgMap">MAP</button></div>
</div><small>Progress isn't saved in debug mode. Turn it off to return to your real save.</small></div>`;
document.body.append(b,p,tag);
const $=id=>document.getElementById(id),selW=$('dbgW'),selL=$('dbgL');
for(const m of MANIFEST)selW.add(new Option(m.id+' · '+m.name,m.id));
// stop the game reacting to keys/clicks aimed at the panel
for(const ev of['keydown','keyup'])p.addEventListener(ev,e=>e.stopPropagation());
['pointerdown','touchstart','mousedown'].forEach(ev=>{p.addEventListener(ev,e=>e.stopPropagation());b.addEventListener(ev,e=>e.stopPropagation());});
const blur=()=>{document.activeElement&&document.activeElement.blur();};
async function fillLevels(){const w=+selW.value;selL.innerHTML='<option>loading…</option>';
 try{const d=await ensureWorld(w);selL.innerHTML='';for(const n of d.nodes)if(n.lvl&&LDEF[n.id])selL.add(new Option((LDEF[n.id].card?LDEF[n.id].card+' — ':n.id+' ')+LDEF[n.id].name,n.id));}
 catch(e){selL.innerHTML='<option>failed to load</option>';}}
function unlockAll(w){const d=WORLDS[w];if(d)for(const n of d.nodes)if(n.lvl)G.cleared[n.id]=1;}
function sync(){$('dbgOn').checked=DB.on;$('dbgBody').classList.toggle('dis',!DB.on);b.classList.toggle('on',DB.on);tag.style.display=DB.on?'block':'none';}
function setOn(on){DB.on=on;localStorage.setItem(DBG_KEY,on?'1':'0');
 if(on){saveG=()=>{};G=JSON.parse(JSON.stringify(G));}
 else{saveG=realSave;G=loadG()||newGame();goScene('title');}
 sync();}
$('dbgOn').onchange=e=>{setOn(e.target.checked);blur();};
selW.onchange=()=>{fillLevels();blur();};
$('dbgInf').onchange=e=>{DB.inf=e.target.checked;blur();};
$('dbgUn').onchange=e=>{DB.unlock=e.target.checked;blur();};
async function prep(){const w=+selW.value;initAudio();await ensureWorld(w);G.world=w;setWorld(w);if(DB.unlock)unlockAll(w);if(DB.inf)G.lives=99;return w;}
$('dbgGo').onclick=async()=>{blur();const w=await prep(),id=selL.value,f=$('dbgF').value;
 G.form=f==='titan'?'big':f;const i=NODES.findIndex(n=>n.id===id);G.node=Math.max(0,i);mapInit();MP.i=Math.max(0,i);goScene('level');
 if(f==='titan')setTimeout(()=>{if(scene==='level'&&P)powerTo('titan');},50);p.classList.remove('open');};
$('dbgMap').onclick=async()=>{blur();await prep();G.form=$('dbgF').value==='titan'?'big':$('dbgF').value;G.node=1;goScene('map');p.classList.remove('open');};
b.onclick=()=>{p.classList.toggle('open');blur();};
// infinite lives: keep topping up while debug is on
setInterval(()=>{if(DB.on&&DB.inf&&G&&G.lives<99)G.lives=99;},500);
if(DB.on){saveG=()=>{};}
sync();fillLevels();
})();
