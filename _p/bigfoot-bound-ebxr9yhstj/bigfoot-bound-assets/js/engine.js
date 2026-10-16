'use strict';
// ================= LEVELS =================
const GT=17,TITAN_T=720;
function grid(w,h){return{w,h,t:Array.from({length:h},()=>Array(w).fill(' ')),cont:{},c10:{},spawns:[],pipes:[],ents:[],items:[],bumps:{},deco:[],lifts:[],trunks:[]};}
function st(L,c,r,ch){if(c>=0&&c<L.w&&r>=0&&r<L.h)L.t[r][c]=ch;}
function tile(L,c,r){if(c<0||c>=L.w)return'W';if(r<0||r>=L.h)return' ';return L.t[r][c];}
function pipeAt(L,c,top,bot){st(L,c,top,'[');st(L,c+1,top,']');for(let r=top+1;r<=bot;r++){st(L,c,r,'{');st(L,c+1,r,'}');}}
const ED={hiker:{w:12,h:22},snapper:{w:14,h:14},panda:{w:14,h:14},drone:{w:14,h:9},trap:{w:12,h:22},hunter:{w:12,h:24},salmon:{w:14,h:10},saw:{w:18,h:18},crusher:{w:30,h:30},foreman:{w:22,h:36},baron:{w:40,h:52}};
function en(L,t,c,r,o){const d=ED[t];L.spawns.push({t,x:c*T+(16-d.w)/2,y:r*T-d.h,o});}
// ---- shared builders ----
function fill(L,c0,c1,r0,r1,ch){for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)st(L,c,r,ch);}
// moving log platforms: 'h' sways sideways, 'v' rises and sinks, 'fall' drops a moment after Hoss lands on it
function lift(L,c,r,w,k,a=0,o){L.lifts.push(Object.assign({x:c*T,y:r*T,w:w*T,k,a:a*T,x0:c*T,y0:r*T,t:0,vy:0,dx:0,dy:0,trig:0},o||{}));}
function tree(L,c0,c1,r){for(let c=c0;c<=c1;c++)st(L,c,r,'L');L.trunks.push({c0,c1,r});}
function trap(L,c,r){L.spawns.push({t:'trap',x:c*T+10,y:r*T,o:{st:'hide',baseY:r*T}});}
// ---- hazards shared by the late levels ----
function saw(L,c,r,k,a,sp,ph){L.spawns.push({t:'saw',x:c*T-1,y:r*T-1,o:{imm:1,k,a:a*T,sp:sp||.03,tm:ph||0}});}
function crusher(L,c,r){L.spawns.push({t:'crusher',x:c*T+8-15,y:r*T,o:{imm:1,st:'idle'}});}
// ---- level table: worlds register levels via defWorld() ----
// Level data is a text grid ('.' = empty, one char per tile) plus spawns ['type',col,row,opts?] and extras.
const LDEF={};
function mkLevel(a){const L=JSON.parse(JSON.stringify(a)),rows=L.grid.split('\n').map(r=>r.trim()).filter(r=>r);delete L.grid;
 L.h=rows.length;L.w=rows[0].length;L.t=rows.map(r=>[...r.replace(/\./g,' ')]);
 L.spawns=(L.spawns||[]).map(p=>{if(!Array.isArray(p))return p;const[t,c,r,o]=p,d=ED[t];return{t,x:c*T+(16-d.w)/2,y:r*T-d.h,o};});
 for(const k of['cont','c10','bumps'])L[k]=L[k]||{};for(const k of['pipes','ents','items','deco','lifts','trunks'])L[k]=L[k]||[];return L;}
function addLevels(lv){for(const id in lv){const v=lv[id];LDEF[id]=Object.assign({},v,{build:v.build||(()=>{const o={};for(const k in v.areas)o[k]=mkLevel(v.areas[k]);return o;})});}}
let CUR='1-1';
function castsOf(id){G.lcasts=G.lcasts||{};return G.lcasts[id]||(G.lcasts[id]=[0,0,0]);}
function hudCasts(){const n=scene==='map'&&NODES[MP.i],id=n&&LDEF[n.id]?n.id:(n?null:CUR);if(!id||LDEF[id].noCasts)return null;return castsOf(id);}
function updLifts(){for(const f of LV.lifts){const px=f.x,py=f.y;f.t++;
 if(f.k==='h')f.x=f.x0+f.a*(.5-.5*Math.cos(f.t*.02));
 else if(f.k==='v')f.y=f.y0-f.a*(.5-.5*Math.cos(f.t*.02));
 else if(f.k==='bob'){f.s=clamp((f.s||0)+(P&&P.ride===f?.35:-.6),0,14);f.y=f.y0+Math.sin(f.t*.05)*1.5+f.s;}
 else if(f.k==='fall'&&f.trig){f.trig++;if(f.trig>22){f.vy=Math.min(f.vy+.12,3.5);f.y+=f.vy;}}
 f.dx=f.x-px;f.dy=f.y-py;}}
function rideLifts(pb){P.ride=null;if(P.vy<0)return;
 for(const f of LV.lifts){if(P.x+P.w>f.x+1&&P.x<f.x+f.w-1&&pb<=f.y+3&&P.y+P.h>=f.y){P.y=f.y-P.h;P.vy=0;P.ground=true;P.gtile='lift';P.ride=f;if(f.k==='fall'&&!f.trig)f.trig=1;return;}}}
function edgeTurn(e,L){if(!e.ground)return;const fx=e.dir>0?e.x+e.w+1:e.x-1,ch=tile(L,Math.floor(fx/T),Math.floor((e.y+e.h+4)/T));if(!SOL.has(ch)&&ch!=='L'&&ch!=='c'&&!isSl(ch))e.dir*=-1;}
// ================= PHYSICS =================
const SOL=new Set(['G','S','?','U','R','X','[',']','{','}','F','W','>','<','I']);
const isSl=ch=>ch==='/'||ch==='\\';
function solidX(L,c,r){return SOL.has(tile(L,c,r))&&!isSl(tile(L,c,r-1));}
function grav(o,g=.35){o.vy=Math.min(o.vy+g,5);}
function moveBody(o,L,step){
 const wasG=o.ground;o.ground=false;o.hitWall=0;o.ceil=null;o.slope=0;o.gtile=null;
 o.x+=o.vx;
 if(o.vx!==0){const right=o.vx>0,c=Math.floor((right?o.x+o.w-.01:o.x)/T),r0=Math.floor(o.y/T),r1=Math.floor((o.y+o.h-.01)/T);
  for(let r=r0;r<=r1;r++){if(!solidX(L,c,r))continue;const pen=o.y+o.h-r*T;
   if(step&&wasG&&r===r1&&pen<=(o.h>40?10:8)&&!solidX(L,c,r-1)){o.y=r*T-o.h;continue;}
   o.x=right?c*T-o.w:(c+1)*T;o.hitWall=right?1:-1;o.vx=0;break;}}
 o.y+=o.vy;
 const c0=Math.floor(o.x/T),c1=Math.floor((o.x+o.w-.01)/T),cx=o.x+o.w/2;
 if(o.vy<0){const r=Math.floor(o.y/T);let best=null;
  for(let c=c0;c<=c1;c++){const ch=tile(L,c,r);if((SOL.has(ch)&&ch!=='W')||(ch==='H'&&step)){if(!best||Math.abs(c*T+8-cx)<Math.abs(best.c*T+8-cx))best={c,r};}}
  if(best){o.y=(r+1)*T;o.vy=0;o.ceil=best;}}
 else{const bot=o.y+o.h,r=Math.floor((bot-.01)/T),pb=bot-o.vy;
  for(let c=c0;c<=c1;c++){const ch=tile(L,c,r);if(isSl(tile(L,c,r-1)))continue;
   if((SOL.has(ch)&&ch!=='W')||((ch==='L'||ch==='c')&&pb<=r*T+1)){o.y=r*T-o.h;o.vy=0;o.ground=true;o.gtile=ch;o.gr=r;if(c===Math.floor(cx/T))break;}}}
 if(o.vy>=0){const c=Math.floor(cx/T),bot=o.y+o.h,rb=Math.floor(bot/T);
  for(let r=rb-1;r<=rb+1;r++){const ch=tile(L,c,r);if(!isSl(ch))continue;const lx=cx-c*T,s=ch==='/'?r*T+16-lx:r*T+lx;
   if(bot>=s-(wasG?8:0)&&bot<=s+12){o.y=s-o.h;o.vy=0;o.ground=true;o.slope=ch==='/'?-1:1;o.gtile=ch;break;}}}}
// ================= STATE =================
let P,LV,LVS,camX=0,camY=0,shake=0,FREEZE=null,SPLASH=0,lvState='play',lvT=0,timeLeft=300,timeTick=0,cardCycle=0,paused=false,frame=0,SHOTS=[],PARTS=[],clearMsg='',tally=0,HAZ=[],CLR={};
function part(o){PARTS.push(Object.assign({vx:0,vy:0,g:0,life:30,t:0},o));}
function addScore(n,x,y){G.score+=n;if(x!==undefined)part({k:'txt',s:String(n),x,y,vy:-.6,life:40});}
function oneUp(x,y){G.lives=Math.min(99,G.lives+1);sfx('oneup');if(x!==undefined)part({k:'txt',s:'1UP',x,y,vy:-.6,life:50,col:'#9fe870'});}
function getCoin(x,y,pop){G.cones++;G.score+=50;sfx('coin');if(pop)part({k:'coin',x:x-4,y:y-12,vy:-4,g:.3,life:24});if(G.cones>=100){G.cones-=100;oneUp(x,y);}}
function debris(c,r){for(let i=0;i<4;i++)part({k:'deb',x:c*T+4+(i%2)*8,y:r*T+4+(i>>1)*8,vx:(i%2?1.4:-1.4)*(1+Math.random()*.3),vy:i>>1?-3:-5,g:.3,life:70});}
function dust(x,y,n=6){for(let i=0;i<n;i++)part({k:'dust',x:x+(Math.random()*2-1)*10,y:y-2,vx:(Math.random()*2-1)*1.2,vy:-Math.random()*1.2,life:22});}
// ================= BLOCKS =================
function spawnItem(t,c,r){const it={t,x:c*T+1,y:r*T,w:14,h:14,vx:0,vy:0,st:'rise',tm:0,ry:r*T-16,dir:(P.x+P.w/2<c*T+8)?1:-1};LV.items.push(it);sfx('sprout');}
function release(ct,c,r){if(ct==='coin'||ct==='coins10')getCoin(c*T+8,r*T,1);else if(ct==='power')spawnItem(P.form==='small'?'berry':'cone',c,r);else spawnItem(ct,c,r);}
function smash(c,r){const ch=tile(LV,c,r),k=c+','+r,ct=LV.cont[k];st(LV,c,r,' ');delete LV.cont[k];debris(c,r);sfx('brk');G.score+=50;
 if(ch==='?'||ch==='H')release(ct||'coin',c,r);else if(ct==='coins10'){for(let i=0;i<5;i++)getCoin(c*T+8,r*T,1);}
 for(const e of LV.ents)if(e.st!=='dead'&&Math.abs(e.y+e.h-r*T)<3&&e.x+e.w>c*T&&e.x<c*T+16)killEnt(e,1);}
function bump(c,r){const ch=tile(LV,c,r),k=c+','+r,ct=LV.cont[k];
 if(ch==='?'||ch==='H'||(ch==='R'&&ct)){LV.bumps[k]=8;
  if(ct==='coins10'){LV.c10[k]=(LV.c10[k]||0)+1;release('coin',c,r);if(LV.c10[k]>=10){st(LV,c,r,'U');delete LV.cont[k];}}
  else{st(LV,c,r,'U');delete LV.cont[k];release(ct||'coin',c,r);}sfx('bump');}
 else if(ch==='R'){if(P.form==='small'){LV.bumps[k]=8;sfx('bump');}else{smash(c,r);return;}}
 else sfx('bump');
 for(const e of LV.ents)if(e.st!=='dead'&&Math.abs(e.y+e.h-r*T)<3&&e.x+e.w>c*T&&e.x<c*T+16)killEnt(e,e.x<c*T+8?-1:1);
 for(const it of LV.items)if(it.st==='act'&&Math.abs(it.y+it.h-r*T)<3&&it.x+it.w>c*T&&it.x<c*T+16){it.vy=-3.5;it.dir=it.x<c*T+4?-1:1;}}
// ================= ENTITIES =================
function mkEnt(s){const d=ED[s.t];const e=Object.assign({t:s.t,x:s.x,y:s.y,w:d.w,h:d.h,vx:0,vy:0,dir:-1,st:'walk',tm:0,ground:false,grace:0,chain:0},s.o||{});if(e.t==='drone'){e.baseY=e.y;e.x0=e.x;}if(e.t==='saw'||e.t==='crusher'||e.t==='salmon'||e.t==='hunter'){e.x0=e.x;e.y0=e.y;}if(e.t==='hunter'&&e.cd===undefined)e.cd=100;return e;}
const CHAIN=[100,200,400,800,1000,2000,4000,8000];
function chainScore(n,x,y){if(n>=CHAIN.length)oneUp(x,y);else addScore(CHAIN[n],x,y);}
function killEnt(e,dir,pts=100){if(e.st==='dead'||e.imm||e.st==='sub')return;if(e.boss){hitBoss(e,2);return;}if(P.carry===e)P.carry=null;e.st='dead';e.vy=-3.5;e.vx=(dir||1)*1;sfx('kick');addScore(pts,e.x,e.y);}
function kickShell(e,dir){e.st='kick';e.dir=dir;e.grace=12;e.tm=0;e.chain=0;sfx('kick');addScore(100,e.x,e.y);}
function stompEnt(e){const n=P.chain++;chainScore(n,e.x,e.y-8);sfx('stomp');
 if(e.t==='hiker'){e.st='flee';e.dir=(e.x<P.x)?-1:1;part({k:'cam',x:e.x+4,y:e.y+8,vx:-e.dir*1.2,vy:-3,g:.3,life:60});part({k:'flash',x:e.x+6,y:e.y+10,life:10});}
 else if(e.t==='snapper'){if(e.st==='walk'){e.st='shell';e.y+=6;e.h=8;e.tm=0;e.vx=0;}else{e.st='shell';e.tm=0;e.vx=0;}}
 else if(e.t==='panda'){e.st='flat';e.tm=0;}
 else if(e.t==='drone'){e.st='dead';e.vy=0;e.vx=0;}
 else if(e.t==='hunter'||e.t==='salmon')stompKO(e);
 else if(ENT[e.t]&&ENT[e.t].stomp)ENT[e.t].stomp(e);}
function stompKO(e){e.st='dead';e.vy=-2.5;e.vx=P.dir*.8;}
function hitBoss(e,d){if(e.inv>0||e.st==='dead'||e.st==='wait')return;e.hp-=d;e.inv=70;sfx('stomp');shake=Math.max(shake,8);addScore(1000,e.x,e.y-8);part({k:'flash',x:e.x+e.w/2,y:e.y+e.h/3,life:12});
 if(e.hp<=0){e.st='dead';e.vy=-5;e.vx=P.x<e.x?1.2:-1.2;sfx('quake');shake=20;addScore(5000,e.x,e.y-20);for(let i=0;i<10;i++)part({k:'flash',x:e.x+Math.random()*e.w,y:e.y+Math.random()*e.h,life:14+i*5});LV.bossT=150;HAZ=[];stopSong();}}
function throwHaz(o){HAZ.push(Object.assign({w:10,h:10,vx:0,vy:0,g:.2,t:0},o));}
function updEnts(){const L=LV;
 for(const s of L.spawns)if(!s.done&&s.x<camX+W+24&&s.x>camX-40){s.done=1;const e=mkEnt(s);if(e.t!=='trap')e.dir=(P.x<e.x)?-1:1;L.ents.push(e);}
 for(const e of L.ents){e.tm++;
  if(e.st==='dead'){e.vy=Math.min(e.vy+.3,6);e.x+=e.vx;e.y+=e.vy;if(e.y>camY+H+40)e.gone=1;continue;}
  if(e.st==='flat'){if(e.tm>30)e.gone=1;continue;}
  switch(e.t){
   case'hiker':e.vx=e.st==='flee'?e.dir*1.9:e.dir*.42;grav(e);moveBody(e,L);if(e.hitWall)e.dir*=-1;if(L.edge&&e.st!=='flee')edgeTurn(e,L);if(e.st==='flee'&&(e.x<camX-40||e.x>camX+W+40))e.gone=1;break;
   case'panda':e.vx=e.dir*.55;grav(e);moveBody(e,L);if(e.hitWall)e.dir*=-1;if(L.edge)edgeTurn(e,L);break;
   case'snapper':
    if(e.st==='walk')e.vx=e.dir*.5;else if(e.st==='shell'){e.vx*=.8;if(e.tm>480){e.st='walk';e.y-=6;e.h=14;e.dir=P.x<e.x?-1:1;}}else if(e.st==='kick')e.vx=e.dir*3.6;
    if(e.st!=='carry'){grav(e);moveBody(e,L);if(L.edge&&e.st==='walk')edgeTurn(e,L);if(e.hitWall){e.dir*=-1;if(e.st==='kick'){const c=Math.floor((e.hitWall>0?e.x+e.w+1:e.x-1)/T),r=Math.floor((e.y+e.h/2)/T);const ch=tile(L,c,r);if(ch==='?'||ch==='R'||ch==='H')bump(c,r);else sfx('bump');}}}
    if(e.st==='kick'||e.st==='carry'){e.grace--;for(const o of L.ents){if(o===e||o.st==='dead'||o.st==='flat'||(o.t==='trap'&&o.y>=o.baseY-2)||!ov(e,o))continue;chainScore(e.chain++,o.x,o.y);killEnt(o,e.st==='carry'?P.dir:e.dir,0);if(e.st==='carry'||o.st==='kick')killEnt(e,-P.dir);}}
    break;
   case'hunter':{const pd=P.x<e.x?-1:1;e.face=pd;if(e.throwT>0)e.throwT--;
    if(e.ground){e.vx=e.dir*.45;if(Math.abs(e.x-e.x0)>22)e.dir=e.x>e.x0?-1:1;if(e.tm%150===149){e.vy=-5.8;e.ground=false;}}
    if(--e.cd<=0&&Math.abs(P.x-e.x)<260&&!P.dead&&lvState==='play'){throwHaz({k:'net',x:e.x+e.w/2-5,y:e.y-2,vx:pd*(1+Math.abs(P.x-e.x)/150),vy:-4.4});e.cd=80+Math.random()*60;e.throwT=14;sfx('throw');}
    grav(e);moveBody(e,L);if(e.hitWall)e.dir*=-1;if(L.edge)edgeTurn(e,L);break;}
   case'salmon':{const wy=(L.water||16)*T;
    if(e.st==='walk'){e.st='sub';e.tm=0;e.wt=20+Math.random()*80;}
    if(e.st==='sub'){e.y=wy+20;if(e.tm>e.wt&&e.x0>camX-20&&e.x0<camX+W+20){e.st='leap';e.tm=0;e.x=e.x0+(Math.random()*2-1)*20;e.y=wy+6;e.vy=-(6+Math.random()*1.2);e.vx=(P.x<e.x?-1:1)*(.6+Math.random()*.6);dust(e.x+7,wy+6,4);}}
    else if(e.st==='leap'){e.vy+=.17;e.x+=e.vx;e.y+=e.vy;if(e.vy>0&&e.y>wy+6){e.st='sub';e.tm=0;e.wt=50+Math.random()*80;dust(e.x+7,wy+6,4);}}break;}
   case'saw':{const t=e.tm*e.sp;if(e.k==='h')e.x=e.x0+Math.sin(t)*e.a;else if(e.k==='v')e.y=e.y0+Math.sin(t)*e.a;else{e.x=e.x0+Math.cos(t)*e.a;e.y=e.y0+Math.sin(t)*e.a;}break;}
   case'crusher':{
    if(e.st==='idle'){e.y=e.y0;if(Math.abs(P.x+P.w/2-(e.x+e.w/2))<34&&P.y>e.y&&e.tm>30&&!P.dead){e.st='drop';e.vy=0;}}
    else if(e.st==='drop'){e.vy=Math.min(e.vy+.45,7);e.vx=0;moveBody(e,L);if(e.ground){e.st='land';e.tm=0;if(Math.abs(e.x-P.x)<W){shake=Math.max(shake,7);sfx('step');}dust(e.x+e.w/2,e.y+e.h,8);}}
    else if(e.st==='land'){if(e.tm>50)e.st='rise';}
    else if(e.st==='rise'){e.y-=1.2;if(e.y<=e.y0){e.y=e.y0;e.st='idle';e.tm=0;}}break;}
   case'foreman':{grav(e);if(e.st==='wait'){if(LV.lock!=null&&Math.abs(camX-LV.lock)<4){e.st='idle';e.tm=0;}moveBody(e,L);break;}
    if(e.inv>0)e.inv--;const pd=P.x+P.w/2<e.x+e.w/2?-1:1,rage=e.hp<=3;
    if(e.st==='idle'){e.vx*=.8;e.dir=pd;if(e.tm>(rage?28:50)&&e.ground){e.tm=0;if(Math.random()<.5){e.st='charge';}else{e.st='hop';e.vy=-6.6;e.vx=pd*1.6;}}}
    else if(e.st==='charge'){e.vx=e.dir*(rage?2.5:1.9);if(e.hitWall||e.tm>110){e.st='idle';e.tm=0;e.vx=0;throwHaz({k:'axe',x:e.x+e.w/2-5,y:e.y+4,vx:pd*2.1,vy:-5});sfx('throw');}}
    else if(e.st==='hop'){if(e.ground&&e.tm>5){shake=Math.max(shake,8);sfx('step');dust(e.x+e.w/2,e.y+e.h,8);e.st='idle';e.tm=0;e.vx=0;if(rage){throwHaz({k:'axe',x:e.x+e.w/2-5,y:e.y+4,vx:pd*2.1,vy:-5});sfx('throw');}}}
    moveBody(e,L);if(e.hitWall&&e.st==='charge'){e.st='idle';e.tm=0;shake=Math.max(shake,5);sfx('bump');}break;}
   case'baron':{grav(e);if(e.st==='wait'){if(LV.lock!=null&&Math.abs(camX-LV.lock)<4){e.st='walk';e.tm=0;e.cd=80;}moveBody(e,L);break;}
    if(e.inv>0)e.inv--;if(e.throwT>0)e.throwT--;const pd=P.x+P.w/2<e.x+e.w/2?-1:1,rage=e.hp<=4;e.cd--;
    const sawOut=b=>{throwHaz({k:'saw',x:e.x+(e.dir>0?e.w:-14),y:e.y+e.h-16,w:14,h:14,vx:e.dir*2.3,vy:-1,g:.3,bnc:b});sfx('throw');e.throwT=14;};
    if(e.st==='walk'){e.dir=pd;e.vx=pd*(rage?.75:.45);if(e.cd<=0){if(Math.random()<.4){e.st='jump';e.vy=-7.2;e.vx=pd*1.5;e.tm=0;}else{sawOut(0);if(rage)e.saw2=28;}e.cd=rage?75:110;}}
    else if(e.st==='jump'){if(e.ground&&e.tm>6){e.st='walk';e.vx=0;shake=16;sfx('quake');dust(e.x+e.w/2,e.y+e.h,12);e.cd=rage?45:80;}}
    if(e.saw2&&--e.saw2===0)sawOut(4);
    moveBody(e,L);break;}
   case'drone':e.x+=e.dir*.5;if(Math.abs(e.x-e.x0)>40)e.dir*=-1;e.y=e.baseY+Math.sin(e.tm*.06)*10;break;
   default:{const R=ENT[e.t];if(R&&R.upd)R.upd(e,L);break;}
   case'trap':{const near=Math.abs(P.x+P.w/2-(e.x+e.w/2))<30;
    if(e.st==='hide'){e.y=e.baseY;if(e.tm>90&&!near){e.st='up';e.tm=0;}}
    else if(e.st==='up'){e.y=Math.max(e.baseY-24,e.y-.6);if(e.tm>110){e.st='down';e.tm=0;}}
    else if(e.st==='down'){e.y+=.6;if(e.y>=e.baseY){e.y=e.baseY;e.st='hide';e.tm=0;}}break;}
  }
  if(e.y>L.h*T+40)e.gone=1;if(e.x<camX-160&&e!==P.carry&&!e.boss)e.gone=1;}
 L.ents=L.ents.filter(e=>!e.gone);}
function updItems(){for(const it of LV.items){it.tm++;
 if(it.st==='rise'){it.y-=1;if(it.y<=it.ry){it.y=it.ry;it.st='act';it.tm=0;if(it.t==='feather'){it.vy=-3.2;it.bx=it.x;}if(it.t==='firefly'||it.t==='acorn')it.vy=-3;}continue;}
 switch(it.t){
  case'berry':it.vx=it.dir*1.1;grav(it);moveBody(it,LV);if(it.hitWall)it.dir*=-1;break;
  case'acorn':case'firefly':it.vx=it.dir*1.2;grav(it,.25);moveBody(it,LV);if(it.hitWall)it.dir*=-1;if(it.ground)it.vy=it.t==='firefly'?-4.2:-2.6;break;
  case'feather':if(it.vy<0){it.vy+=.15;it.y+=it.vy;}else{it.y+=.45;it.x=it.bx+Math.sin(it.tm*.05)*18;}break;
  case'cone':if(it.vy){grav(it);moveBody(it,LV);}break;
 }
 if(it.y>LV.h*T+20)it.gone=1;
 if(!P.dead&&!P.pipe&&lvState==='play'&&ov(P,it))collect(it);}
 LV.items=LV.items.filter(i=>!i.gone);}
function collect(it){it.gone=1;const x=it.x,y=it.y;
 switch(it.t){
  case'berry':if(P.form==='small')powerTo('big');else{addScore(1000,x,y);sfx('power');}break;
  case'cone':if(P.form!=='pine'&&P.form!=='titan')powerTo('pine');else{addScore(1000,x,y);sfx('power');}break;
  case'feather':if(P.form!=='sky'&&P.form!=='titan')powerTo('sky');else{addScore(1000,x,y);sfx('power');}break;
  case'acorn':powerTo('titan');break;
  case'firefly':P.star=600;sfx('power');addScore(1000,x,y);break;
  case'cast':castsOf(CUR)[it.i]=1;addScore(2000,x,y);sfx('oneup');part({k:'txt',s:'CAST '+(it.i+1)+'/3',x:x-10,y:y-12,vy:-.4,life:70,col:'#f2ead6'});break;}}
function updShots(){for(const s of SHOTS){s.tm++;s.vy=Math.min(s.vy+.35,4);const pvx=s.vx;moveBody(s,LV);if(s.ground)s.vy=-2.8;s.vx=pvx;if(s.hitWall){s.gone=1;dust(s.x,s.y+4,3);}
 for(const e of LV.ents)if(e.st!=='dead'&&e.st!=='flat'&&e.st!=='sub'&&e!==P.carry&&!(e.t==='trap'&&e.y>=e.baseY-2)&&ov(s,e)){s.gone=1;if(e.boss)hitBoss(e,1);else if(e.imm)sfx('tink');else if(e.t==='panda'){sfx('tink');part({k:'txt',s:'TINK',x:e.x,y:e.y-6,vy:-.5,life:25,col:'#c4c8d0'});}else killEnt(e,Math.sign(pvx),100);break;}
 if(s.x<camX-16||s.x>camX+W+16||s.y>LV.h*T)s.gone=1;}
 SHOTS=SHOTS.filter(s=>!s.gone);}
function updHaz(){if(lvState==='play')for(const s of LV.gens||[])if(s.x>camX-20&&s.x<camX+W+20&&--s.cd<=0){throwHaz(Object.assign({x:s.x,y:s.y},HAZK[s.k||'snow'].spawn));s.cd=s.every;}
 for(const h of HAZ){h.t++;
 if(h.k==='saw'||(HAZK[h.k]&&HAZK[h.k].roll)){h.vy=Math.min(h.vy+h.g,5);const pvx=h.vx;moveBody(h,LV);h.vx=pvx;if(h.ground&&h.bnc)h.vy=-h.bnc;if(h.hitWall){h.gone=1;dust(h.x+7,h.y+7,5);sfx('tink');}}
 else{h.vy=Math.min(h.vy+h.g,5);h.x+=h.vx;h.y+=h.vy;}
 if(!P.dead&&!P.pipe&&lvState==='play'&&ov(P,h)){if(P.form==='titan'||P.star>0)h.gone=1;else if(HAZK[h.k]&&HAZK[h.k].stomp&&P.vy>0&&P.y+P.h-P.vy<=h.y+6){h.gone=1;P.vy=IN.J?-5.2:-3.2;dust(h.x+7,h.y+7,6);addScore(100,h.x,h.y);sfx('stomp');}else hurt();}
 if(h.k!=='saw')for(const s of SHOTS)if(ov(s,h)){s.gone=1;h.gone=1;addScore(100,h.x,h.y);sfx('kick');}
 if(h.y>LV.h*T+20||h.x<camX-60||h.x>camX+W+60)h.gone=1;}
 HAZ=HAZ.filter(h=>!h.gone);}
// ================= PLAYER =================
function formBox(f,cr){return f==='small'?[12,14]:f==='titan'?[22,60]:[12,cr?18:28];}
function setBox(){const[w,h]=formBox(P.form,P.crouch);if(w===P.w&&h===P.h)return;const b=P.y+P.h,cx=P.x+P.w/2;P.w=w;P.h=h;P.y=b-h;P.x=cx-w/2;}
function newPlayer(f){const p={x:0,y:0,w:12,h:14,vx:0,vy:0,dir:1,form:f,ground:false,crouch:false,meter:0,mt:0,inv:0,star:0,titanT:0,flyT:0,coy:0,jb:0,af:0,chain:0,roarCD:0,stp:0,carry:null,pipe:null,dead:0,dt:0,pound:0,throwT:0,glideT:0};const[w,h]=formBox(f,false);p.w=w;p.h=h;return p;}
function powerTo(f,shrink){
 if(f==='titan'){P.form='titan';P.titanT=TITAN_T;P.crouch=false;P.carry=null;setBox();SPLASH=100;sfx('titan');playSong('titan');addScore(1000,P.x,P.y);shake=12;return;}
 if(P.form==='titan'){FREEZE={t:40,from:'titan',to:f};P.inv=90;playSong(LV.song);sfx('hurt');return;}
 FREEZE={t:40,from:P.form,to:f};sfx(shrink?'hurt':'power');if(!shrink)addScore(1000,P.x,P.y);}
function hurt(){if(P.inv>0||P.star>0||P.form==='titan'||P.dead||FREEZE)return;
 if(P.carry){P.carry.st='shell';P.carry.tm=0;P.carry=null;}
 if(P.form==='small'){die();return;}
 powerTo(P.form==='big'?'small':'big',true);P.inv=120;}
function die(){if(P.dead)return;P.dead=1;P.dt=0;P.vy=-5;P.vx=0;P.carry=null;P.form='small';P.crouch=false;setBox();stopSong();sfx('die');}
function endLife(){G.lives--;G.form='small';G.cards=G.cards||[];saveG();if(G.lives<=0)goScene('over');else goScene('map');}
function throwCone(){SHOTS.push({x:P.x+(P.dir>0?P.w:-6),y:P.y+6,w:6,h:6,vx:P.dir*3.2,vy:1,tm:0});sfx('throw');P.throwT=10;}
function roar(){P.roarCD=90;sfx('roar');shake=10;part({k:'ring',x:P.x+P.w/2+P.dir*14,y:P.y+14,life:30,dir:P.dir});
 for(const e of LV.ents){if(e.st==='dead'||(e.t==='trap'&&e.y>=e.baseY-2))continue;const dx=(e.x+e.w/2)-(P.x+P.w/2);if(dx*P.dir>-10&&Math.abs(dx)<150&&Math.abs(e.y-P.y)<90)killEnt(e,P.dir,200);}}
function quake(){shake=26;sfx('quake');dust(P.x+P.w/2,P.y+P.h,14);
 for(const e of LV.ents)if(e.st!=='dead'&&e.x>camX-16&&e.x<camX+W+16&&!(e.t==='trap'&&e.y>=e.baseY-2))killEnt(e,e.x<P.x?-1:1,200);
 const c0=Math.floor(camX/T),c1=Math.floor((camX+W)/T);for(let c=c0;c<=c1;c++)for(let r=0;r<LV.h;r++){const ch=tile(LV,c,r);if(ch==='?'||ch==='H')bump(c,r);}}
function titanSmash(){const x0=P.x+Math.min(0,P.vx)-2,x1=P.x+P.w+Math.max(0,P.vx)+1,y0=P.y+Math.min(0,P.vy)-2,y1=P.y+P.h-3;
 for(let c=Math.floor(x0/T);c<=Math.floor(x1/T);c++)for(let r=Math.floor(y0/T);r<=Math.floor(y1/T);r++){const ch=tile(LV,c,r);if(ch==='R'||ch==='?'||ch==='U'||ch==='H')smash(c,r);}}
function updPlayer(){
 P.tm=(P.tm||0)+1;
 if(P.dead){P.dt++;if(P.dt>30){P.vy=Math.min(P.vy+.25,5);P.y+=P.vy;}if(P.dt>170)endLife();return;}
 if(P.pipe){pipeStep();return;}
 if(P.ride&&LV.lifts.includes(P.ride)){P.x+=P.ride.dx;P.y+=P.ride.dy;}
 const ti=P.form==='titan',big=P.form!=='small';
 if(lvState==='clear'){P.dir=1;P.vx=1.2;grav(P,.55);moveBody(P,LV,true);P.af+=.15;return;}
 P.crouch=big&&!ti&&IN.D&&P.ground?true:(P.ground?false:P.crouch&&big&&!ti);setBox();
 let d=(IN.R?1:0)-(IN.L?1:0);if(P.crouch&&P.ground)d=0;
 const run=IN.B,mx=ti?(run?2.2:1.5):(P.meter>=6&&run?3:run?2.3:1.4);
 const icy=P.ground&&P.gtile==='I';
 if(d){if(P.vx*d<0)P.vx+=d*(icy?.06:P.ground?.25:.12);else if(Math.abs(P.vx)<mx)P.vx=d*Math.min(mx,Math.abs(P.vx)+(icy?.035:run?.09:.07));else if(P.ground)P.vx-=Math.sign(P.vx)*(icy?.01:.07);P.dir=d;}
 else if(P.ground){const f=icy?.012:P.crouch?.1:.07;P.vx=Math.abs(P.vx)<=f?0:P.vx-Math.sign(P.vx)*f;}
 P.skid=P.ground&&d&&P.vx*d<0;if(P.skid&&(P.tm&3)===0)dust(P.x+P.w/2,P.y+P.h,1);
 if(P.ground){P.coy=6;}else P.coy--;
 if(PR.J)P.jb=7;else P.jb--;
 if(P.jb>0&&P.coy>0){P.vy=-(4.6+Math.abs(P.vx)*.28)*(ti?.95:1);P.coy=0;P.jb=0;P.ground=false;sfx('jump');if(P.form==='sky'&&P.meter>=6)P.flyT=240;}
 else if(!P.ground&&P.form==='sky'){if(P.flyT>0&&PR.J){P.vy=-2.6;sfx('fly');}else if(IN.J&&P.vy>.8&&P.flyT<=0){P.vy=.8;if((P.tm%12)===0)sfx('fly');P.glideT=6;}}
 if(P.glideT>0)P.glideT--;
 if(P.pound)P.vy=7;else P.vy=Math.min(P.vy+((P.vy<0&&IN.J)?.2:.55),5);
 if(P.flyT>0){P.flyT--;P.meter=6;}
 P.mt++;if(P.ground||P.flyT>0){if(run&&Math.abs(P.vx)>=2.2&&d&&!ti){if(P.mt%8===0&&P.meter<6)P.meter++;}else if(P.flyT<=0&&P.mt%10===0&&P.meter>0)P.meter--;}
 if(ti)titanSmash();
 const wasAir=!P.ground,fallV=P.vy,pb=P.y+P.h;
 const cvx=P.cv||0;P.vx+=cvx;moveBody(P,LV,true);if(!P.hitWall)P.vx-=cvx;rideLifts(pb);P.cv=P.ground&&(P.gtile==='>'||P.gtile==='<')?(P.gtile==='>'?.9:-.9):0;
 if(P.ceil)bump(P.ceil.c,P.ceil.r);
 if(P.ground){P.chain=0;
  if(P.pound){P.pound=0;quake();}else if(ti&&wasAir&&fallV>3){shake=Math.max(shake,6);sfx('step');dust(P.x+P.w/2,P.y+P.h,6);}
  if(P.gtile==='F'){P.vy=IN.J?-9.6:-6;P.ground=false;sfx('bounce');P.coy=0;}}
 if(ti){P.titanT--;
  if(P.ground&&Math.abs(P.vx)>.4){P.stp++;if(P.stp%22===0){shake=Math.max(shake,3);sfx('step');dust(P.x+P.w/2,P.y+P.h,3);}}
  if(!P.ground&&PR.D&&!P.pound){P.pound=1;P.vy=7;}
  P.roarCD--;if(PR.B&&P.roarCD<=0)roar();
  if(P.titanT<=0)powerTo('big');}
 if(P.form==='pine'&&PR.B&&!P.carry&&SHOTS.length<2)throwCone();
 if(P.throwT>0)P.throwT--;
 if(P.carry){const e=P.carry;if(!IN.B){P.carry=null;e.x=P.dir>0?P.x+P.w:P.x-e.w;kickShell(e,P.dir);}else{e.x=P.dir>0?P.x+P.w-3:P.x-e.w+3;e.y=P.y+P.h-e.h-(big?8:2);e.tm=0;}}
 for(let c=Math.floor(P.x/T);c<=Math.floor((P.x+P.w-.01)/T);c++)for(let r=Math.floor(P.y/T);r<=Math.floor((P.y+P.h-.01)/T);r++)if(tile(LV,c,r)==='C'){st(LV,c,r,' ');getCoin(c*T+8,r*T);}
 if(P.y>LV.h*T+8){die();return;}
 if(LV.water&&P.y+P.h>LV.water*T+12){for(let i=0;i<8;i++)part({k:'dust',x:P.x+P.w/2+(Math.random()*2-1)*10,y:LV.water*T+4,vx:(Math.random()*2-1)*1.5,vy:-1-Math.random()*2.5,g:.12,life:28});die();return;}
 if(P.ground&&PR.D)for(const p of LV.pipes){const cx=P.x+P.w/2;if(Math.abs(P.y+P.h-p.r*T)<1&&cx>p.c*T+6&&cx<p.c*T+26){P.carry=null;P.crouch=false;setBox();P.x=p.c*T+16-P.w/2;P.pipe={mode:'in',t:0,dest:p};P.vx=P.vy=0;sfx('pipe');break;}}
 P.af+=Math.abs(P.vx)*.09;
 if(P.inv>0)P.inv--;if(P.star>0)P.star--;
 if(LV.goalX&&lvState==='play'&&P.x+P.w/2>LV.goalX*T+4)startClear();}
function pipeStep(){const p=P.pipe;p.t++;
 if(p.mode==='in'){P.y+=1;if(p.t>=P.h+4)enterArea(p.dest);}
 else if(p.mode==='outDown'){P.y+=1;if(P.y>=p.ty){P.pipe=null;}}
 else if(p.mode==='outUp'){P.y-=1;if(P.y+P.h<=p.ty){P.y=p.ty-P.h;P.pipe=null;P.ground=true;}}}
function enterArea(p){const t=p.to||(p.dest==='cave'?{c:2,r:0,mode:'down'}:{c:71,r:15,mode:'up'});LV=LVS[p.dest];P.ride=null;P.x=t.c*T+16-P.w/2;
 if(t.mode==='down'){P.y=(t.r+1)*T-P.h;P.pipe={mode:'outDown',t:0,ty:(t.r+1)*T};}else{P.y=t.r*T;P.pipe={mode:'outUp',t:0,ty:t.r*T};}
 P.vx=P.vy=0;SHOTS=[];PARTS=[];HAZ=[];sfx('pipe');if(P.form!=='titan')playSong(LV.song);snapCam();}
function pvE(){if(P.dead||P.pipe||lvState!=='play')return;const ti=P.form==='titan';
 for(const e of LV.ents){if(e.st==='dead'||e.st==='flat'||e.st==='sub'||e.st==='wait'||e===P.carry)continue;if(e.t==='trap'&&e.y>=e.baseY-2)continue;if(!ov(P,e))continue;
  if(ti||P.star>0){killEnt(e,P.x<e.x?1:-1,200);if(ti)shake=Math.max(shake,4);continue;}
  if(e.st==='flee')continue;
  if(e.imm){hurt();continue;}
  if(e.boss){const sp=P.vy>0&&(P.y+P.h-P.vy)<=e.y+10;if(sp){if(e.inv<=0)hitBoss(e,2);P.vy=IN.J?-6:-4.5;P.y=e.y-P.h;}else if(e.inv<40)hurt();continue;}
  const stomp=P.vy>0&&(P.y+P.h-P.vy)<=e.y+6;
  if(e.t==='trap'){hurt();continue;}
  if(e.t==='snapper'&&e.st==='shell'){if(IN.B&&!P.carry&&!stomp){P.carry=e;e.st='carry';}else{kickShell(e,(P.x+P.w/2<e.x+e.w/2)?1:-1);if(stomp)P.vy=IN.J?-5.2:-3.2;}continue;}
  if(e.t==='snapper'&&e.st==='kick'&&e.grace>0)continue;
  if(stomp){P.vy=IN.J?-5.2:-3.2;P.y=e.y-P.h;stompEnt(e);}else hurt();}}
function startClear(o){CLR=o||{};lvState='clear';lvT=0;tally=0;HAZ=[];
 if(CLR.title){P.carry=null;stopSong();sfx('clear');P.star=0;clearMsg='';if(CLR.item&&G.items.length<8)G.items.push(CLR.item);return;}
 const card=['berry','cone','feather'][cardCycle];G.cards.push(card);P.carry=null;stopSong();sfx('clear');P.star=0;
 part({k:'card',x:LV.goalX*T,y:12*T,vy:-1.2,life:80,card});clearMsg='';
 if(G.cards.length>=3){const c=G.cards;const same=c[0]===c[1]&&c[1]===c[2];const n=same?{berry:2,cone:3,feather:5}[c[0]]:1;clearMsg=(same?'MATCH! ':'')+n+'UP X'+n;G.lives+=n;G.cards=[];setTimeout(()=>sfx('oneup'),1800);}}
function snapCam(){camX=LV.lock!=null?LV.lock:clamp(P.x+P.w/2-176,0,LV.w*T-W);camY=clamp(P.y+P.h-120,0,LV.h*T-PH);}
function updCam(){let tx=clamp(P.x+P.w/2-176,0,LV.w*T-W);if(LV.auto)tx=lvState==='play'?Math.min(camX+LV.auto,LV.w*T-W):Math.max(camX,tx);else if(LV.lock!=null){tx=camX+(LV.lock-camX)*.1;if(Math.abs(LV.lock-tx)<.5)tx=LV.lock;}camX=tx;const ty=clamp(P.y+P.h-120,0,LV.h*T-PH);camY+=(ty-camY)*.12;if(Math.abs(ty-camY)<.5)camY=ty;}
function startLevel(){const nd=NODES[MP.i];CUR=nd&&LDEF[nd.id]?nd.id:'1-1';LVS=LDEF[CUR].build();const cs=castsOf(CUR);for(const k in LVS){const L=LVS[k];for(const it of L.items0||[])if(!cs[it.i])L.items.push({...it,w:14,h:14,vx:0,vy:0,st:'act',tm:0});}
 LV=LVS.main;P=newPlayer(G.form||'small');P.x=LV.start.x;P.y=LV.start.y-P.h;timeLeft=300;timeTick=0;lvState='play';SHOTS=[];PARTS=[];HAZ=[];CLR={};FREEZE=null;SPLASH=0;paused=false;shake=0;snapCam();playSong(LV.song);}
function levelUpdate(){
 if(PR.P&&lvState==='play'&&!P.dead){paused=!paused;sfx('pause');}
 if(PR.S&&lvState==='play'&&!P.dead){paused=!paused;sfx('pause');}
 if(paused)return;
 if(SPLASH>0){SPLASH--;return;}
 if(FREEZE){FREEZE.t--;if(FREEZE.t<=0){P.form=FREEZE.to;setBox();FREEZE=null;}return;}
 cardCycle=((frame/10)|0)%3;
 updLifts();updPlayer();
 if(!P.dead&&!P.pipe){updEnts();updItems();updShots();updHaz();pvE();}
 if(LV.auto&&lvState==='play'&&!P.dead){if(P.x<camX){P.x=camX;if(boxSolid(P))die();}if(P.x+P.w>camX+W)P.x=camX+W-P.w;}
 if(LV.arena&&LV.lock==null&&!P.dead&&P.x>LV.arena*T+20){LV.lock=LV.arena*T;fill(LV,LV.arena-1,LV.arena-1,8,16,'X');dust(LV.arena*T-8,17*T,10);sfx('quake');shake=8;if(P.form!=='titan')playSong('boss');LV.song='boss';}
 if(LV.arenaAll&&!LV.won&&lvState==='play'&&!P.dead&&LV.spawns.every(s=>s.done)&&!LV.ents.some(e=>e.t==='hunter'&&e.st!=='dead')){LV.won=1;LV.bossT=70;stopSong();}
 if(LV.bossT&&lvState==='play'&&--LV.bossT<=0){LV.bossT=0;startClear(LDEF[CUR].clr());}
 for(const k in LV.bumps)if(--LV.bumps[k]<=0)delete LV.bumps[k];
 for(const p of PARTS){p.t++;p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;}PARTS=PARTS.filter(p=>p.t<p.life);
 if(shake>0)shake-=.5;
 if(!P.dead)updCam();
 if(lvState==='play'&&!P.dead&&!P.pipe){if(++timeTick>=40){timeTick=0;timeLeft--;if(timeLeft<=0)die();}}
 if(lvState==='clear'){lvT++;if(lvT>130&&timeLeft>0){const n=Math.min(timeLeft,3);timeLeft-=n;G.score+=n*50;if(frame%3===0)sfx('tink');}
  if(lvT>130&&timeLeft<=0){tally++;if(tally>110){G.cleared[CUR]=1;G.form=P.form==='titan'?'big':P.form;saveG();goScene(LDEF[CUR].ending?'ending':'map');}}}}
function boxSolid(o){for(let c=Math.floor(o.x/T);c<=Math.floor((o.x+o.w-.01)/T);c++)for(let r=Math.floor(o.y/T);r<=Math.floor((o.y+o.h-.01)/T);r++)if(SOL.has(tile(LV,c,r))&&tile(LV,c,r)!=='W')return true;return false;}
// ================= LEVEL RENDER (HD) =================
// Registries: world files add content here instead of editing the engine.
//  BGS[bg]={draw(g,dy),over(g)}  DECO[k]=(g,d)=>{}  ENT[t]={upd(e,L),draw(g,e),stomp(e)} (+ED[t] size)  HAZK[k]={spawn,roll,stomp,draw(g,h,cx,cy)}  THEMES[name]
const BGS={},DECO={},ENT={},HAZK={};
const decoSp=(s,ox)=>(g,d)=>ds(g,s,d.x+ox-s.w/2,d.y-s.h+2);
function vign(g,r0,a){const v=g.createRadialGradient(W/2,PH/2,r0,W/2,PH/2,240);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,'+a+')');g.fillStyle=v;g.fillRect(0,0,W,PH);}
const CARD_IMG={berry:IS.berry,cone:IS.cone,feather:IS.feather};
// tile a wide image horizontally with mirrored copies so seams never show
function bandH(g,img,y,h,par){if(!ok(img))return;const w=h*img.naturalWidth/img.naturalHeight;let x0=-((camX*par)%(w*2));
 for(let i=0;x0+i*w<W;i++){const x=x0+i*w;if(i&1){g.save();g.translate(x+w,y);g.scale(-1,1);g.drawImage(img,-.3,0,w+.6,h);g.restore();}else g.drawImage(img,x-.3,y,w+.6,h);}}
function drawBG(g){const dy=112-camY,B=BGS[LV.bg]||BGS.forest;if(B)B.draw(g,dy);else{g.fillStyle='#0b140f';g.fillRect(0,0,W,PH);}}
// ground themes: a level's `theme` picks dirt texture, painted top lip and slope colours
const THEMES={grass:{dirt:'dirt',top:GTOP,slope:['#1d3d14','#6fbf3e','#c8f08a']}},TH=()=>THEMES[LV.theme]||THEMES.grass;
const SOLIDV=new Set(['G','X','S','?','U','R','I']);
function drawTile(g,ch,c,r,x,y){
 switch(ch){
  case'G':case'X':{const cave=LV.bg==='cave'||ch==='X',tex=LV.tex&&ch==='X'?A[LV.tex]:cave?A.cavetex:A[TH().dirt];if(ok(tex))g.drawImage(tex,(c&1)*128,(r&1)*128,128,128,x-.05,y-.05,16.1,16.1);
   if(!SOLIDV.has(tile(LV,c-1,r))&&!isSl(tile(LV,c-1,r))){g.fillStyle='rgba(20,10,4,.45)';g.fillRect(x,y,1.6,16);}
   if(!SOLIDV.has(tile(LV,c+1,r))&&!isSl(tile(LV,c+1,r))){g.fillStyle='rgba(20,10,4,.45)';g.fillRect(x+14.4,y,1.6,16);}
   const a=tile(LV,c,r-1);if(ch==='G'&&!cave&&a!=='G'&&a!=='I'&&!isSl(a))g.drawImage(TH().top,(c&3)*64,0,64,64,x-.05,y-4,16.1,16);break;}
  case'S':dimg(g,SP('stone',16),x-.3,y-.3,16.6,16.6);break;
  case'?':{const p=.5+.5*Math.sin(frame*.1);g.save();g.shadowColor='rgba(255,210,80,.9)';g.shadowBlur=(3+p*4)*u();dimg(g,{img:A.qblock},x-.3,y-.3,16.6,16.6);g.restore();break;}
  case'U':dimg(g,{img:A.used},x-.3,y-.3,16.6,16.6);break;
  case'R':dimg(g,{img:A.brick},x-.3,y-.3,16.6,16.6);break;
  case'I':dimg(g,{img:A.ice},x-.3,y-.3,16.6,16.6);break;
  case'L':{if(!ok(A.log))break;const iw=A.log.naturalWidth,ih=A.log.naturalHeight,sw=iw*16/42,l=tile(LV,c-1,r)!=='L',rt=tile(LV,c+1,r)!=='L';
   const sx=l?0:rt?iw-sw:iw*.5-sw/2;g.drawImage(A.log,sx,0,sw,ih,x-.1,y-1,16.2,ih*42/iw);break;}
  case'c':{const l=tile(LV,c-1,r)!=='c',rt=tile(LV,c+1,r)!=='c',x0=x+(l?2:-.5),x1=x+16-(rt?2:-.5);
   g.fillStyle='#a9c4dc';g.beginPath();g.roundRect(x0,y+3,x1-x0,7,l||rt?3.5:0);g.fill();
   g.fillStyle='#f6fbff';g.beginPath();g.roundRect(x0,y+1.5,x1-x0,6,l||rt?3:0);g.fill();
   for(const[px,py,rr]of[[4,2,3.6],[11,1.5,4.2]]){g.beginPath();g.arc(x+px,y+py+1,rr,0,7);g.fill();}
   g.fillStyle='#ffffff';g.beginPath();g.arc(x+10,y+1.2,2,0,7);g.fill();break;}
  case'[':{if(!ok(A.pipe))break;const iw=A.pipe.naturalWidth,s=iw/34;g.drawImage(A.pipe,0,0,iw,16*s,x-1,y,34,16);break;}
  case'{':{if(!ok(A.pipe))break;const iw=A.pipe.naturalWidth,s=iw/34;g.drawImage(A.pipe,0,100,iw,16*s,x-1,y-.05,34,16.1);break;}
  case'F':dimg(g,{img:A.fungus},x-2.5,y-4,21,20);break;
  case'/':case'\\':{const up=ch==='/';g.save();g.beginPath();if(up){g.moveTo(x,y+16);g.lineTo(x+16,y);g.lineTo(x+16,y+16.1);}else{g.moveTo(x,y);g.lineTo(x+16,y+16);g.lineTo(x,y+16.1);}g.closePath();g.clip();
   const th=TH(),dt=A[th.dirt];if(ok(dt))g.drawImage(dt,(c&1)*128,(r&1)*128,128,128,x,y,16,16.1);g.restore();
   const y0=up?y+16:y,y1=up?y:y+16;g.lineCap='round';g.strokeStyle=th.slope[0];g.lineWidth=7;g.beginPath();g.moveTo(x-.5,y0+2.4);g.lineTo(x+16.5,y1+2.4);g.stroke();
   g.strokeStyle=th.slope[1];g.lineWidth=5;g.stroke();g.strokeStyle=th.slope[2];g.lineWidth=1.2;g.beginPath();g.moveTo(x-.5,y0+.6);g.lineTo(x+16.5,y1+.6);g.stroke();break;}
  case'>':case'<':{const d=ch==='>'?1:-1;g.save();g.beginPath();g.rect(x-.1,y,16.2,16);g.clip();g.fillStyle='#1c1a1e';g.fillRect(x-.1,y,16.2,16);
   g.fillStyle='#3d3a40';g.fillRect(x-.1,y,16.2,5);g.strokeStyle='#f2a93b';g.lineWidth=1.3;const off=(((frame*.9*d)%8)+8)%8;
   for(let i=-1;i<3;i++){const cx=x+i*8+off;g.beginPath();g.moveTo(cx-1.5*d,y+1);g.lineTo(cx+1.5*d,y+2.5);g.lineTo(cx-1.5*d,y+4);g.stroke();}
   g.fillStyle='#5a5560';for(const rx of[x+4,x+12]){g.beginPath();g.arc(rx,y+10.5,3.4,0,7);g.fill();}g.strokeStyle='#26232a';g.lineWidth=1;
   for(const rx of[x+4,x+12]){const a=frame*.15*d;g.beginPath();g.moveTo(rx+Math.cos(a)*3,y+10.5+Math.sin(a)*3);g.lineTo(rx-Math.cos(a)*3,y+10.5-Math.sin(a)*3);g.stroke();}
   g.restore();break;}
  case'C':{const w=Math.max(1,12*Math.abs(Math.cos(frame*.08+c*.5)));dimg(g,COIN,x+8-w/2,y+1.5,w,13);break;}}}
function drawTiles(g){const c0=Math.floor(camX/T),c1=c0+W/T+1,r0=Math.max(0,Math.floor(camY/T)-1),r1=Math.min(LV.h-1,r0+PH/T+2);
 for(let r=r0;r<=r1;r++)for(let c=c0-1;c<=c1;c++){const ch=tile(LV,c,r);if(ch===' '||ch==='W'||ch==='H'||ch===']'||ch==='}')continue;const b=LV.bumps[c+','+r];drawTile(g,ch,c,r,c*T,r*T-(b?Math.sin((8-b)/8*Math.PI)*5:0));}}
function drawSaw(g,cx,cy,r,rot){g.save();g.translate(cx,cy);g.rotate(rot);g.fillStyle='#2a2a30';g.beginPath();const n=14;for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2,rr=i&1?r*.78:r+.6;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();
 const gr=g.createRadialGradient(-r*.3,-r*.3,1,0,0,r);gr.addColorStop(0,'#f4f6fa');gr.addColorStop(.6,'#aab2bf');gr.addColorStop(1,'#6c7480');g.fillStyle=gr;g.beginPath();for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2,rr=i&1?r*.7:r-.4;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();
 g.strokeStyle='rgba(60,64,72,.55)';g.lineWidth=.8;g.beginPath();g.arc(0,0,r*.5,0,7);g.stroke();g.fillStyle='#3a2e24';g.beginPath();g.arc(0,0,r*.22,0,7);g.fill();g.fillStyle='#f2a93b';g.beginPath();g.arc(0,0,r*.1,0,7);g.fill();g.restore();}
function drawCrusher(g,e){const x=e.x,y=e.y,w=e.w,h=e.h,cx=x+w/2;
 g.strokeStyle='#4a4650';g.lineWidth=2;for(let yy=e.y0-24;yy<y;yy+=5){g.beginPath();g.ellipse(cx,yy+2.5,1.6,2.6,0,0,7);g.stroke();}
 g.save();g.beginPath();g.roundRect(x,y,w,h-4,4);g.clip();if(ok(A.bark))g.drawImage(A.bark,x,y,w,w);else{g.fillStyle='#6a4426';g.fillRect(x,y,w,h);}
 const sh=g.createLinearGradient(x,0,x+w,0);sh.addColorStop(0,'rgba(0,0,0,.45)');sh.addColorStop(.4,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=sh;g.fillRect(x,y,w,h);g.restore();
 g.fillStyle='#3a3a42';for(const by of[y+3,y+h-11]){g.fillRect(x-1,by,w+2,3.5);}
 g.fillStyle='#c4cad4';for(let i=0;i<5;i++){const sx=x+1+i*(w-2)/5;g.beginPath();g.moveTo(sx,y+h-4.5);g.lineTo(sx+(w-2)/10,y+h+.5);g.lineTo(sx+(w-2)/5,y+h-4.5);g.fill();}
 const lk=clamp((P.x+P.w/2-cx)/40,-1,1)*1.4,ang=e.st==='idle'?0:1;
 for(const ex of[cx-6,cx+6]){g.fillStyle='#fff6dc';g.beginPath();g.ellipse(ex,y+12,3.2,3.6,0,0,7);g.fill();g.fillStyle='#1a1208';g.beginPath();g.arc(ex+lk,y+12.6+ang,1.6,0,7);g.fill();}
 g.strokeStyle='#1a1208';g.lineWidth=1.6;g.beginPath();g.moveTo(cx-10,y+6.5);g.lineTo(cx-3,y+8.5);g.moveTo(cx+10,y+6.5);g.lineTo(cx+3,y+8.5);g.stroke();}
function drawEnt(g,e){let s;const R=ENT[e.t];if(R&&R.draw){R.draw(g,e);return;}
 if(e.t==='saw'){const cx=e.x0+9,cy=e.y0+9;g.strokeStyle='rgba(30,22,16,.75)';g.lineWidth=2.4;g.beginPath();if(e.k==='h'){g.moveTo(cx-e.a,cy);g.lineTo(cx+e.a,cy);}else if(e.k==='v'){g.moveTo(cx,cy-e.a);g.lineTo(cx,cy+e.a);}else g.arc(cx,cy,e.a,0,7);g.stroke();
  g.fillStyle='#4a4038';for(const[px,py]of e.k==='h'?[[cx-e.a,cy],[cx+e.a,cy]]:e.k==='v'?[[cx,cy-e.a],[cx,cy+e.a]]:[[cx,cy]]){g.beginPath();g.arc(px,py,2.4,0,7);g.fill();}
  drawSaw(g,e.x+9,e.y+9,10,e.tm*.3);return;}
 if(e.t==='crusher'){drawCrusher(g,e);return;}
 if(e.t==='salmon'){if(e.st==='sub')return;const sm=ES.salmon;ds(g,sm,e.x+7-sm.w/2,e.y+11-sm.h,e.vx>0,e.st==='dead',1,{rot:Math.atan2(e.vy,Math.abs(e.vx)+2)*(e.vx>0?1:-1)*.8});return;}
 if(e.boss){if(e.inv>0&&(frame&2))return;const bs=ES[e.t],cx=e.x+e.w/2;let y=e.y+e.h-bs.h+2;const o={};
  if(e.st==='charge')o.rot=-e.dir*.12;if(e.t==='baron'&&e.st==='walk')y-=Math.abs(Math.sin(e.tm*.12))*2;if(e.st==='idle'||e.st==='wait')o.sy=1+Math.sin(frame*.1)*.02;
  ds(g,bs,cx-bs.w/2,y,e.dir>0,e.st==='dead',1,o);return;}
 if(e.t==='hunter'){const hs=ES.hunter,cx=e.x+e.w/2;let y=e.y+e.h-hs.h+1;const o={};if(e.ground&&e.st!=='dead'){y-=Math.abs(Math.sin(e.tm*.2))*1.2;o.rot=Math.sin(e.tm*.2)*.05;}if(e.throwT>0)o.rot=(e.face||-1)*-.18;ds(g,hs,cx-hs.w/2,y,(e.face||-1)>0,e.st==='dead',1,o);return;}
 switch(e.t){case'hiker':s=e.st==='flee'?ES.hikerFlee:ES.hiker;break;case'snapper':s=e.st==='walk'?ES.snapper:ES.shell;break;
  case'panda':s=ES.panda;break;case'drone':s=ES.drone;break;case'trap':s=((e.tm>>4)&1)?ES.trapO:ES.trapC;break;}
 if(!s)return;const w=s.w,cx=e.x+e.w/2,o={};let y=e.y+e.h-s.h;
 if((e.st==='walk'||e.st==='flee')&&(e.t==='hiker'||e.t==='panda'||e.t==='snapper')){const sp=e.st==='flee'?.45:.2;y-=Math.abs(Math.sin(e.tm*sp))*1.5;o.rot=Math.sin(e.tm*sp)*.07;}
 if(e.t==='trap')y=e.y-6;
 if(e.st==='flat')o.sy=.3;
 if(e.t==='snapper'&&e.st!=='walk'&&e.st!=='dead'){y=e.y+e.h-s.h+1.5;if(e.st==='shell'&&e.tm>400&&(e.tm&4))y-=1;}
 if(e.t==='drone'&&e.st!=='dead')o.rot=Math.sin(e.tm*.1)*.1;
 ds(g,s,cx-w/2,y,e.dir>0&&e.t!=='trap',e.st==='dead',1,o);
 if(e.t==='drone'&&e.st!=='dead'){g.fillStyle='rgba(225,235,245,.55)';for(const px of[-.36,.36]){g.beginPath();g.ellipse(cx+px*w,y+1.2,6*Math.abs(Math.cos(e.tm*.7))+1.5,.9,0,0,7);g.fill();}
  if((e.tm>>3)&1){g.fillStyle='rgba(255,70,50,.9)';g.beginPath();g.arc(cx,y+2,1.4,0,7);g.fill();}}}
function drawHaz(g){for(const h of HAZ){const cx=h.x+h.w/2,cy=h.y+h.h/2;
 if(h.k==='saw'){drawSaw(g,cx,cy,7.5,h.t*.4*Math.sign(h.vx||1));continue;}
 if(HAZK[h.k]&&HAZK[h.k].draw){HAZK[h.k].draw(g,h,cx,cy);continue;}
 g.save();g.translate(cx,cy);g.rotate(h.t*.25*Math.sign(h.vx||1));
 if(h.k==='net'){g.strokeStyle='#5a3414';g.lineWidth=2.2;g.beginPath();g.arc(0,0,6,0,7);g.stroke();g.strokeStyle='#e6d6a8';g.lineWidth=.8;for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(i*3.4,-5.2);g.lineTo(i*3.4,5.2);g.moveTo(-5.2,i*3.4);g.lineTo(5.2,i*3.4);g.stroke();}g.strokeStyle='#c8a868';g.lineWidth=1.4;g.beginPath();g.arc(0,0,6,0,7);g.stroke();g.fillStyle='#6b6f78';for(let i=0;i<4;i++){const a=i*Math.PI/2+.6;g.beginPath();g.arc(Math.cos(a)*7,Math.sin(a)*7,1.4,0,7);g.fill();}}
 else{g.fillStyle='#5a3414';g.fillRect(-1,-7,2.4,14);g.fillStyle='#2a2a30';g.beginPath();g.moveTo(0,-7);g.lineTo(7,-8);g.quadraticCurveTo(9,-3,7,1);g.lineTo(0,-1.5);g.fill();g.fillStyle='#c4cad4';g.beginPath();g.moveTo(1,-6.2);g.lineTo(6.4,-7);g.quadraticCurveTo(8,-3,6.2,0);g.lineTo(1,-2.2);g.fill();}
 g.restore();}}
function drawWater(g){if(!LV.water)return;const y0=LV.water*T+4,yb=LV.h*T+24,c0=Math.floor(camX/T)-1,c1=c0+W/T+3,wy=x=>y0+Math.sin(x*.06+frame*.12)*1.6+Math.sin(x*.023-frame*.05)*1.2;
 const runs=[];let rs=null;for(let c=c0;c<=c1;c++){const land=tile(LV,c,LV.water)==='G';if(!land&&rs===null)rs=c;if((land||c===c1)&&rs!==null){runs.push([rs,land?c:c+1]);rs=null;}}
 const gr=g.createLinearGradient(0,y0,0,y0+44);gr.addColorStop(0,'rgba(70,175,205,.8)');gr.addColorStop(1,'rgba(18,64,104,.96)');
 for(const[a,b]of runs){const x0=a*T,x1=b*T;g.fillStyle=gr;g.beginPath();g.moveTo(x0,yb);for(let x=x0;x<=x1;x+=4)g.lineTo(x,wy(x));g.lineTo(x1,yb);g.fill();
  g.strokeStyle='rgba(235,250,255,.9)';g.lineWidth=1.4;g.beginPath();for(let x=x0;x<=x1;x+=4)x===x0?g.moveTo(x,wy(x)):g.lineTo(x,wy(x));g.stroke();
  g.strokeStyle='rgba(220,245,255,.5)';g.lineWidth=1;for(let i=0;i<Math.ceil((x1-x0)/30);i++){const sx=x0+((((i*53)-frame*1.6)%(x1-x0))+(x1-x0))%(x1-x0),sy=y0+8+(i*13)%30;g.beginPath();g.moveTo(sx,sy);g.lineTo(Math.min(x1,sx+8+(i%3)*4),sy);g.stroke();}}}
function drawFire(g,x,y){glow(g,x+8,y-8,40,`rgba(255,150,50,${.28+.08*Math.sin(frame*.3)})`);g.fillStyle='#4a2a12';g.save();g.translate(x+8,y-2);for(const a of[-.35,.35]){g.save();g.rotate(a);g.fillRect(-9,-2,18,4);g.restore();}g.restore();
 for(let i=0;i<3;i++){const fh=11+Math.sin(frame*.35+i*2)*3,fx=x+4+i*4;g.fillStyle=i===1?'#ffd77a':'#f2862b';g.beginPath();g.moveTo(fx-3,y-3);g.quadraticCurveTo(fx-2,y-fh*.6,fx+Math.sin(frame*.2+i)*1.5,y-3-fh);g.quadraticCurveTo(fx+2,y-fh*.6,fx+3,y-3);g.fill();}
 if(frame%6===0)part({k:'dust',x:x+8+(Math.random()*2-1)*3,y:y-14,vx:(Math.random()-.5)*.3,vy:-.6,life:30});}
function glow(g,x,y,r,col){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
function drawItem(g,it){const s=IS[it.t];let y=it.y;if(it.t==='cast')y+=Math.sin(frame*.08+it.x)*2;
 if(it.t==='cast')glow(g,it.x+7,y+7,15,`rgba(255,246,192,${.45+.2*Math.sin(frame*.1)})`);
 if(it.t==='acorn')glow(g,it.x+7,y+7,14,'rgba(184,240,112,.55)');
 if(it.t==='firefly')glow(g,it.x+7,y+9,14,`rgba(255,242,122,${.5+.3*Math.sin(frame*.3)})`);
 if(it.t==='cone')glow(g,it.x+7,y+7,12,'rgba(255,200,90,.4)');
 const o=it.t==='feather'?{rot:Math.sin(it.tm*.05)*.3}:null;
 ds(g,s,it.x+7-s.w/2,y+15-s.h,it.dir>0&&it.t!=='feather'?false:false,false,1,o);}
function drawPlayer(g){if(!P.dead&&P.inv>0&&!FREEZE&&(frame&2))return;
 let form=P.form;if(FREEZE)form=((FREEZE.t>>2)&1)?FREEZE.from:FREEZE.to;
 if(form==='titan'&&P.titanT<180&&(frame&4)&&!FREEZE)form='big';
 const s=HSP[form],bx=P.x+P.w/2,by=P.y+P.h,fx=P.dir<0,dir=fx?-1:1,sp=Math.abs(P.vx),ti=form==='titan';
 g.save();
 if(ti){g.shadowColor=`rgba(184,240,112,${.7+.3*Math.sin(frame*.2)})`;g.shadowBlur=10*u();}
 if(P.star>0&&(frame&4))g.filter=`brightness(1.5) saturate(1.8) hue-rotate(${(frame*24)%360}deg)`;
 if(P.dead||P.crouch||FREEZE||P.pipe){const o={};if(P.crouch)o.sy=.7;ds(g,s,bx-s.w/2,by-s.h,fx,P.dead&&P.dt>30,1,o);}
 else if(!P.ground){const up=P.vy<0;drawRig(g,form,bx,by,fx,-Math.PI/2,up?.5:.28,up?.05:-.02,0,P.vy<-2?1.04:1);}
 else if(P.skid)drawRig(g,form,bx,by,fx,-Math.PI/2,.32,-.16,0,.97);
 else if(sp>.1){const run=sp>1.6,pm=P.meter>=6,ph=P.af*2.3,amp=ti?.34:pm?.62:run?.52:.38,lean=ti?.03:pm?.15:run?.1:.04;
  drawRig(g,form,bx,by,fx,ph,amp,lean,Math.abs(Math.cos(ph))*s.h*(run?.06:.035),1-Math.abs(Math.sin(ph))*.03);}
 else drawRig(g,form,bx,by,fx,0,0,0,0,1+Math.sin(frame*.07)*.018);
 g.restore();
 if(form==='titan'){for(let i=0;i<3;i++){const t=(frame*.04+i/3)%1;g.fillStyle=`rgba(216,255,106,${1-t})`;g.beginPath();g.arc(bx-10+i*10,by-20-t*40,1.3,0,7);g.fill();}}
 if(form==='sky'&&!P.ground&&!P.dead&&(P.glideT>0||P.flyT>0)){for(let i=0;i<2;i++){const t=((frame*.05)+i*.5)%1;g.fillStyle=`rgba(217,204,255,${.8-t})`;g.beginPath();g.ellipse(bx-dir*(8+t*14),by-14+t*6,2.2,1,0,0,7);g.fill();}}}
DECO.fire=(g,d)=>drawFire(g,d.x,d.y);DECO.bush=decoSp(BUSH,20);DECO.fern=decoSp(FERN,8);
function drawParts(g){for(const p of PARTS){const a=1-p.t/p.life;
 switch(p.k){case'txt':txt(g,p.s,p.x,p.y,p.col||'#fff6c0',1,'#1a1208');break;
  case'deb':g.save();g.translate(p.x+2,p.y+2);g.rotate(p.t*.3*(p.vx>0?1:-1));g.fillStyle='#4a4038';g.beginPath();g.roundRect(-3,-3,6,6,1.5);g.fill();g.fillStyle='#8f857a';g.beginPath();g.roundRect(-2.4,-2.4,4.4,4,1.2);g.fill();g.fillStyle='#6fa04a';g.fillRect(-2.4,-2.4,2,1.2);g.restore();break;
  case'coin':{const w=Math.max(1,12*Math.abs(Math.cos(p.t*.4)));dimg(g,COIN,p.x+4-w/2,p.y,w,13);break;}
  case'dust':g.globalAlpha=a*.8;g.fillStyle='#efe4cc';g.beginPath();g.arc(p.x+1.5,p.y+1.5,1.5+p.t*.12,0,7);g.fill();g.globalAlpha=1;break;
  case'cam':g.save();g.translate(p.x+3,p.y+2);g.rotate(p.t*.25);g.fillStyle='#222';g.beginPath();g.roundRect(-3.5,-2.5,7,5,1);g.fill();g.fillStyle='#8fd3ff';g.beginPath();g.arc(0,0,1.4,0,7);g.fill();g.restore();break;
  case'flash':glow(g,p.x,p.y,8+p.t*3,`rgba(255,251,224,${a})`);break;
  case'ring':g.globalAlpha=a;g.strokeStyle='#d8ff6a';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.arc(p.x,p.y,8+p.t*3+i*10,p.dir>0?-1:Math.PI-1,p.dir>0?1:Math.PI+1);g.stroke();}g.globalAlpha=1;break;
  case'card':cardBox(g,p.x-1,p.y-1,18,22,p.card);break;}}}
function cardBox(g,x,y,w,h,card){g.fillStyle='#1a1208';g.beginPath();g.roundRect(x,y,w,h,2.5);g.fill();const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#fffaf0');gr.addColorStop(1,'#e2d6b8');g.fillStyle=gr;g.beginPath();g.roundRect(x+.8,y+.8,w-1.6,h-1.6,2);g.fill();
 if(card){const s=CARD_IMG[card],sh=Math.min(h-5,w-3)*1.05,sw=s.w*sh/s.h;dimg(g,s,x+w/2-sw/2,y+h/2-sh/2,sw,sh);}}
function drawTrunks(g){for(const t of LV.trunks){const cx=(t.c0+t.c1+1)/2*T,tw=Math.min(24,(t.c1-t.c0+1)*T*.42),x=cx-tw/2,y0=(t.r+1)*T-4,y1=Math.min(LV.h*T+16,camY+PH+8);
  if(x>camX+W||x+tw<camX||y0>y1)continue;
  if(ok(A.bark))for(let y=y0;y<y1;y+=tw)g.drawImage(A.bark,x,y,tw,tw+.6);else{g.fillStyle='#5a3a20';g.fillRect(x,y0,tw,y1-y0);}
  const gr=g.createLinearGradient(x,0,x+tw,0);gr.addColorStop(0,'rgba(25,12,4,.6)');gr.addColorStop(.35,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(25,12,4,.65)');g.fillStyle=gr;g.fillRect(x,y0,tw,y1-y0);
  const lw=(t.c1-t.c0+1)*T;for(const[k,f]of[[0,.0],[1,1]]){const bx=t.c0*T+f*lw;ds(g,BUSH,bx-BUSH.w/2,t.r*T-6);} }}
function drawLifts(g){for(const f of LV.lifts){if(f.x>camX+W+8||f.x+f.w<camX-8||f.y>camY+PH+20)continue;let x=f.x;const y=f.y;
  if(f.k==='fall'&&f.trig&&f.trig<=22)x+=Math.sin(f.trig*1.7)*1.2;
  if(f.k==='v'){g.strokeStyle='rgba(62,96,44,.9)';g.lineWidth=1.4;const top=f.vt!==undefined?f.vt:camY-4;for(const vx of[x+5,x+f.w-5]){g.beginPath();g.moveTo(vx,top);for(let yy=top;yy<y;yy+=6)g.lineTo(vx+Math.sin(yy*.3)*1.2,yy);g.lineTo(vx,y+2);g.stroke();}}
  if(!ok(A.log))continue;const iw=A.log.naturalWidth,ih=A.log.naturalHeight,hh=ih*42/iw;
  g.save();if(f.k==='fall')g.filter='sepia(.5) saturate(.8) brightness(.85)';g.drawImage(A.log,x-1,y-1,f.w+2,hh);g.restore();
  if(f.k==='fall'){g.strokeStyle='rgba(40,20,8,.7)';g.lineWidth=.8;g.beginPath();g.moveTo(x+f.w*.45,y+1);g.lineTo(x+f.w*.5,y+5);g.lineTo(x+f.w*.42,y+8);g.stroke();}}}
function drawGoal(g){if(!LV.goalX)return;const GR=LV.goalR||17,gx=LV.goalX*T,gy=(GR-5)*T;
 glow(g,gx+8,gy+10,22,`rgba(255,230,140,${.35+.15*Math.sin(frame*.15)})`);
 cardBox(g,gx-3,gy-3,22,26,lvState==='play'?['berry','cone','feather'][cardCycle]:null);
 // carved totem pole
 const tx=(LV.goalX+1)*T+4,cols=['#a86a34','#6b4c9a','#3f8a3a','#c07a36','#e8973a'];
 for(let i=0;i<5;i++){const y=GR*T-(i+1)*18;g.fillStyle='#2b1709';g.beginPath();g.roundRect(tx-1,y-1,20,19,3);g.fill();
  const gr=g.createLinearGradient(tx,0,tx+18,0);gr.addColorStop(0,cols[i]);gr.addColorStop(.5,'#fff3');gr.addColorStop(.51,cols[i]);gr.addColorStop(1,'#0005');
  g.fillStyle=cols[i];g.beginPath();g.roundRect(tx,y,18,17,2.5);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(tx+1,y+1,5,15);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(tx+13,y+1,4,15);
  g.fillStyle='#fff8e0';g.beginPath();g.ellipse(tx+5.5,y+6.5,2.6,2.2,0,0,7);g.ellipse(tx+12.5,y+6.5,2.6,2.2,0,0,7);g.fill();g.fillStyle='#1a1208';g.beginPath();g.arc(tx+5.8,y+6.8,1.2,0,7);g.arc(tx+12.8,y+6.8,1.2,0,7);g.fill();
  g.beginPath();g.roundRect(tx+5,y+11,8,2.4,1.2);g.fill();}
 g.fillStyle='#2b1709';g.beginPath();g.roundRect(tx-6,GR*T-93,30,6,2);g.fill();g.fillStyle='#f2a93b';g.beginPath();g.roundRect(tx-5,GR*T-92,28,4,1.5);g.fill();}
function pBox(g,x,y,w,h,r=3){g.fillStyle='rgba(159,199,122,.9)';g.beginPath();g.roundRect(x,y,w,h,r);g.fill();const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#16261b');gr.addColorStop(1,'#0a120d');g.fillStyle=gr;g.beginPath();g.roundRect(x+.8,y+.8,w-1.6,h-1.6,r-.6);g.fill();}
function pMeter(g,x,y,n,flash){for(let i=0;i<6;i++){const on=i<n;g.fillStyle=on?'#f2a93b':'#3a3226';g.beginPath();g.moveTo(x+i*7.5,y);g.lineTo(x+i*7.5+5.5,y+3);g.lineTo(x+i*7.5,y+6);g.closePath();g.fill();}
 g.fillStyle=flash?'#ffd77a':'#3a3226';g.beginPath();g.roundRect(x+47,y-.8,10,7.6,2);g.fill();txt(g,'P',x+49.3,y-.4,'#0b140f',.75);}
function hudCore(g,y,timer){const z=.8,r1=y+5.5,r2=y+14;pBox(g,4,y+2,W-76,H-y-4);
 txt(g,'WORLD '+(G.world||1),10,r1,'#9fc77a',z);pMeter(g,58,r1+.3,P&&scene==='level'?P.meter:0,P&&scene==='level'&&P.meter>=6&&(frame&8));
 dimg(g,COIN,132,r1-1,7,8.3);txt(g,'X'+String(G.cones).padStart(2,'0'),141,r1,'#ffd77a',z);
 txt(g,'HOSS X'+G.lives,10,r2,'#e6b48c',z);txt(g,String(G.score).padStart(7,'0'),70,r2,'#f2ead6',z);
 if(timer!==undefined)txt(g,'T'+String(Math.max(0,timer)).padStart(3,'0'),132,r2,timer<100?'#f2a93b':'#9fc77a',z);
 if(hudCasts())txt(g,'CASTS',178,r1+.5,'#c8bea4',z*.9);const hc=hudCasts();if(hc)for(let i=0;i<3;i++){const x=212+i*12;if(hc[i])dimg(g,IS.cast,x,y+4,10,10);else{g.fillStyle='#2a2620';g.beginPath();g.roundRect(x,y+4.5,9,9,2);g.fill();}}
 for(let i=0;i<3;i++)cardBox(g,W-68+i*21,y+1.5,19,H-y-3,G.cards[i]);}
function drawHUD(g){const y=PH;const gr=g.createLinearGradient(0,y,0,H);gr.addColorStop(0,'#1a2a1e');gr.addColorStop(1,'#0b140f');g.fillStyle=gr;g.fillRect(0,y,W,H-y);
 hudCore(g,y,timeLeft);
 if(P&&P.form==='titan'){const w=48*P.titanT/TITAN_T;g.fillStyle='#132010';g.beginPath();g.roundRect(256,y+6,52,7,3);g.fill();g.fillStyle=P.titanT<180&&(frame&4)?'#f2a93b':'#b8f070';g.beginPath();g.roundRect(258,y+7.5,Math.max(1,w),4,2);g.fill();txt(g,'TITAN',268,y+14,'#b8f070',.75);}}
function drawLevel(){const g=X,k=u();
 const s=shake>0?Math.min(shake,6):0,sx=s?(Math.random()*2-1)*s:0,sy=s?(Math.random()*2-1)*s:0;
 g.save();g.beginPath();g.rect(0,0,W,PH);g.clip();drawBG(g);
 g.translate(Math.round((-camX+sx)*k)/k,Math.round((-camY+sy)*k)/k);
 drawTrunks(g);
 for(const d of LV.deco){if(d.x<camX-48||d.x>camX+W)continue;(DECO[d.k]||DECO.fern)(g,d);}
 for(const e of LV.ents)if(e.t==='trap')drawEnt(g,e);
 for(const it of LV.items)if(it.st==='rise')drawItem(g,it);
 if(P.pipe)drawPlayer(g);
 drawTiles(g);drawLifts(g);drawGoal(g);
 for(const it of LV.items)if(it.st!=='rise')drawItem(g,it);
 for(const e of LV.ents)if(e.t!=='trap')drawEnt(g,e);
 for(const s of SHOTS){g.save();g.translate(s.x+3,s.y+3);g.rotate(s.tm*.4);dimg(g,IS.pcone,-4,-4,8,8);g.restore();}
 if(!P.pipe)drawPlayer(g);
 drawHaz(g);drawWater(g);drawParts(g);g.restore();
 if(LV.night){g.save();g.globalCompositeOperation='multiply';g.fillStyle='#8a94cc';g.fillRect(0,0,W,PH);g.globalCompositeOperation='lighter';for(const d of LV.deco)if(d.k==='fire')glow(g,d.x+8-camX,d.y-10-camY,70,`rgba(255,140,40,${.2+.05*Math.sin(frame*.3)})`);g.restore();}
 {const B=BGS[LV.bg]||BGS.forest;if(B&&B.over)B.over(g);}
 drawHUD(g);
 if(LV.lock!=null){const b=LV.ents.find(e=>e.boss&&e.st!=='dead');if(b&&b.st!=='wait'){const bw=Math.max(140,tw(b.name,.8)+16+b.mhp*9);pBox(g,W/2-bw/2,4,bw,15,4);txt(g,b.name,W/2-bw/2+6,8,'#f2a93b',.8);for(let i=0;i<b.mhp;i++){const px=W/2+bw/2-8-(b.mhp-i)*9;g.fillStyle=i<b.hp?'#ffd77a':'#3a3226';g.beginPath();g.roundRect(px,8,7,7,2);g.fill();}}}
 if(paused){pBox(g,W/2-74,PH/2-24,148,46,5);txtC(g,'PAUSED',W/2,PH/2-17,'#f2a93b',2,'#3a1a08');txtC(g,'ESC/P/START RESUME',W/2,PH/2+6,'#9fc77a');}
 if(lvState==='clear'&&lvT>40){txtC(g,CLR.title||'COURSE CLEAR!',W/2,36,'#ffd77a',2.4,'#3a1a08');if(lvT>90){txtC(g,CLR.title?(CLR.sub||''):'YOU GOT A CARD',W/2,64,'#f2ead6',1,'#1a1208');}if(clearMsg&&lvT>130)txtC(g,clearMsg,W/2,80,'#9fe870',2,'#1a1208');}}
