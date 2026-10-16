'use strict';
// ================= SCENES =================
let scene='title',sT=0,menuI=0,msg='',msgT=0;
function goScene(s){scene=s;sT=0;paused=false;
 if(s==='map'){mapInit();playSong('map');}else if(s==='level'){startLevel();}else if(s==='title'){playSong('title');}
 else if(s==='over'){stopSong();sfx('gameover');}else if(s==='ending'){playSong('ending');G.won=1;saveG();}else if(s==='hut'){hutInit();playSong('cave');}}
const u=()=>cv.width/W;
function txtD(s,x,y,col,sc=1,sh){const k=u();txt(D,s,Math.round(x*k),Math.round(y*k),col,sc*k,sh);}
function txtDC(s,cx,y,col,sc=1,sh){txtD(s,cx-tw(s,sc)/2,y,col,sc,sh);}
function cover(img,zoom=1,ax=.5,ay=.5){const iw=img.naturalWidth,ih=img.naturalHeight,cw=cv.width,ch=cv.height,s=Math.max(cw/iw,ch/ih)*zoom,w=iw*s,h=ih*s;D.drawImage(img,(cw-w)*ax,(ch-h)*ay,w,h);}
function panel(x,y,w,h,a=.85){const k=u();D.fillStyle=`rgba(11,20,15,${a})`;D.fillRect(x*k,y*k,w*k,h*k);D.fillStyle='#9fc77a';D.fillRect(x*k,y*k,w*k,Math.max(1,k));D.fillRect(x*k,(y+h)*k-Math.max(1,k),w*k,Math.max(1,k));}
// --- title ---
function hasSave(){return!!localStorage.getItem(SAVE_KEY);}
function titleUpdate(){const opts=hasSave()?2:1;if(PR.U||PR.D){menuI=(menuI+1)%opts;sfx('select');}
 if(PR.S||PR.J){initAudio();if(opts===2&&menuI===1){G=newGame();saveG();}else if(opts===1){G=newGame();saveG();}sfx('coin');goMap();}}
function titleRender(){D.imageSmoothingEnabled=true;D.imageSmoothingQuality='high';D.fillStyle='#07100b';D.fillRect(0,0,cv.width,cv.height);
 if(ok(IMG.title))cover(IMG.title,1+.02*Math.sin(frame*.01),.7,.5);
 const k=u(),gr=D.createLinearGradient(0,0,cv.width*.62,0);gr.addColorStop(0,'rgba(7,16,11,.92)');gr.addColorStop(.7,'rgba(7,16,11,.55)');gr.addColorStop(1,'rgba(7,16,11,0)');D.fillStyle=gr;D.fillRect(0,0,cv.width,cv.height);
 const bob=Math.round(Math.sin(frame*.05)*2);
 TXTLW=.45;txtD('BIGFOOT',16,30+bob,'#f2a93b',5,'#3a1a08');txtD('BOUND',16,72+bob,'#ffd77a',5,'#3a1a08');TXTLW=1;
 txtD('A SASQUATCH PLATFORMER',18,114,'#9fc77a',1);
 const opts=hasSave()?['CONTINUE','NEW GAME']:['PRESS START'];
 opts.forEach((o,i)=>{const sel=i===menuI;if(opts.length===1&&(frame>>5)%2)return;txtD((sel&&opts.length>1?'* ':'  ')+o,18,136+i*14,sel?'#ffd77a':'#c8bea4',1.5,'#1a1208');});
 txtD('ARROWS MOVE  SPACE/UP JUMP  X RUN  DOUBLE-TAP OR CAPS LOCK = RUN',18,188,'#8a9a7a',1);
 txtD('HOWARDAI - I WANT THAT',18,202,'#6b4c9a',1);}
// --- map: SMB3-style tile map, drawn in the 16-bit buffer ---
const MOX=8,MOY=4,MC=23,MR=10;
const nodePx=n=>[MOX+n.c*T+8,MOY+n.r*T+8];
// terrain grid
function trailGrid(NODES,path){for(let i=0;i<NODES.length-1;i++){const a=NODES[i],b=NODES[i+1],dc=Math.sign(b.c-a.c),dr=Math.sign(b.r-a.r),df=dc>0?1:dc<0?2:dr>0?4:8,db=dc>0?2:dc<0?1:dr>0?8:4;let c=a.c,r=a.r;
  while(c!==b.c||r!==b.r){path[r][c]|=df;c+=dc;r+=dr;path[r][c]|=db;}}}
const bigN=n=>!!n.big,nearN=(NODES,c,r)=>NODES.some(n=>Math.abs(n.c-c)<=(bigN(n)?1:0)&&r>=n.r-(bigN(n)?2:0)&&r<=n.r);
// ---- worlds: each worlds/*.js calls defWorld(); scripts + art load on demand ----
// defWorld({id,name,art:[],artBase?,songs?,overBg,map:{tex,fill,shadow,vign,shore,water:[top,bot],props,gen(NODES),nameCol,saved?:[id,text],deco?(g)},nodes:[],ending?:{img,title,lines},levels:{}})
// Node kinds: lvl/start (built in), warp {to:world,at:nodeId,sign:[txt,c0,c1],glow?:clearedId}; others are drawn/used via NODEK[k]={draw(g,n,x,y,shadow),use(n)}.
const WORLDS={},WLOAD={},NODEK={};
function defWorld(d){WORLDS[d.id]=d;addLevels(d.levels||{});if(d.songs)Object.assign(SONGS,d.songs);}
function ensureWorld(id){if(WLOAD[id])return WLOAD[id];const m=MANIFEST.find(m=>m.id===id);if(!m)return Promise.reject(new Error('no world '+id));
 if(PEND<=0){LOADN=LOADT=0;}LOADMSG='HEADING TO '+(m.name||'WORLD '+id)+'...';PEND++;LOADT++;
 return WLOAD[id]=new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=ASSET+m.file;
  sc.onload=()=>{PEND--;LOADN++;const d=WORLDS[id];if(!d){rej(new Error('world file did not call defWorld '+id));return;}loadArt(d.art||[],d.artBase).then(()=>res(d));};
  sc.onerror=()=>{PEND--;LOADN++;delete WLOAD[id];rej(new Error('missing '+m.file));};document.head.appendChild(sc);});}
let WCUR=0,NODES=[],MAPG=null,MAPI={};
function setWorld(w){const d=WORLDS[w]||WORLDS[1];WCUR=WORLDS[w]?w:1;NODES=d.nodes;MAPG=d.mg||(d.mg=d.map.gen(d.nodes));MAPI=d.map.props;}
function switchWorld(w,at){if(!MANIFEST.some(m=>m.id===w)){msg='WORLD '+w+' - COMING SOON';msgT=100;sfx('bump');return;}sfx('pipe');
 ensureWorld(w).then(d=>{G.world=w;G.node=typeof at==='number'?at:Math.max(0,d.nodes.findIndex(n=>n.id===at));saveG();setWorld(w);goScene('map');});}
function goMap(){const w=G.world||1;ensureWorld(w).catch(()=>{G.world=1;G.node=1;return ensureWorld(1);}).then(()=>goScene('map'));}
let MP={i:1,from:1,t:1,pack:false,pi:0};
function mapInit(){if(WCUR!==(G.world||1))setWorld(G.world||1);MP.i=MP.from=clamp(G.node??1,0,NODES.length-1);MP.t=1;MP.pack=false;msg='';}
function canPass(i){const n=NODES[i];if(n.lvl&&!G.cleared[n.id])return false;if(n.soon)return false;return true;}
function dirTo(a,b){return[Math.sign(b.c-a.c),Math.sign(b.r-a.r)];}
function mapUpdate(){if(msgT>0)msgT--;
 if(MP.pack){const n=G.items.length;if(PR.L&&n){MP.pi=(MP.pi+n-1)%n;sfx('select');}if(PR.R&&n){MP.pi=(MP.pi+1)%n;sfx('select');}
  if(PR.B||PR.P){MP.pack=false;sfx('select');}
  if((PR.J||PR.S)&&n){const it=G.items[MP.pi];const f={berry:'big',cone:'pine',feather:'sky'}[it];if(G.form===f||(it==='berry'&&G.form!=='small')){msg='ALREADY THAT STRONG';msgT=90;sfx('bump');}else{G.form=f;G.items.splice(MP.pi,1);MP.pi=0;MP.pack=false;sfx('power');saveG();msg='HOSS IS NOW '+{big:'BIG',pine:'PINE HOSS',sky:'SKY HOSS'}[f]+'!';msgT=120;}}
  return;}
 if(MP.t<1){const a=NODES[MP.from],b=NODES[MP.i],dist=(Math.abs(b.c-a.c)+Math.abs(b.r-a.r))*T;MP.t=Math.min(1,MP.t+1.5/dist);if(MP.t>=1){MP.from=MP.i;G.node=MP.i;saveG();}return;}
 const dx=PR.R?1:PR.L?-1:0,dy=PR.D?1:PR.U?-1:0;
 if(dx||dy){const cur=NODES[MP.i],nx=NODES[MP.i+1],pv=NODES[MP.i-1];
  if(nx&&dirTo(cur,nx)[0]===dx&&dirTo(cur,nx)[1]===dy){if(canPass(MP.i)){MP.from=MP.i;MP.i++;MP.t=0;sfx('select');}else{sfx('bump');msg=cur.soon?'TRAIL CONTINUES IN THE NEXT UPDATE':'CLEAR THIS LEVEL FIRST!';msgT=100;}}
  else if(pv&&dirTo(cur,pv)[0]===dx&&dirTo(cur,pv)[1]===dy){MP.from=MP.i;MP.i--;MP.t=0;sfx('select');}}
 if(PR.B){MP.pack=true;MP.pi=0;sfx('select');}
 if(PR.J||PR.S){const n=NODES[MP.i],K=NODEK[n.k];if(n.lvl){if(G.cleared[n.id]&&n.done){msg=n.done;msgT=90;return;}sfx('pipe');goScene('level');}else if(K&&K.use)K.use(n);else if(n.k==='warp')switchWorld(n.to,n.at);else if(n.soon){msg='COMING SOON - WORLD '+WCUR+' IS GROWING';msgT=100;}}}
// --- HD map drawing ---
const MHIK=SP('hiker',17);
const MHOSS={small:SP('hoss_small',16),big:SP('hoss_big',22),pine:SP('hoss_pine',22),sky:SP('hoss_sky',23)};
const GPAT={};
const hsh=(c,r)=>{let h=(c*374761393+r*668265263)>>>0;h=(h^(h>>>13))*1274126177>>>0;return(h&1023)/1023;};
function drawLock(g,x,y){g.fillStyle='#2b1709';g.beginPath();g.roundRect(x+1.5,y+1,13,14,2);g.fill();
 for(let i=0;i<4;i++){g.fillStyle=i&1?'#9a6a36':'#b98048';g.beginPath();g.roundRect(x+2.5+i*3,y+2,2.6,12,1);g.fill();}
 g.fillStyle='#5a3414';g.fillRect(x+2,y+5,12,1.5);g.fillRect(x+2,y+10,12,1.5);
 g.strokeStyle='#9aa4b4';g.lineWidth=1.3;g.beginPath();g.arc(x+8,y+7.2,2,Math.PI,0);g.stroke();
 g.fillStyle='#e8c24a';g.beginPath();g.roundRect(x+5.2,y+7,5.6,4.6,1);g.fill();g.fillStyle='#2b1709';g.beginPath();g.arc(x+8,y+9,.8,0,7);g.fill();}
function drawPanel(g,n,x,y){const cl=G.cleared[n.id],sn=n.soon,cur=NODES[MP.i]===n;
 const[c0,c1,ed]=cl?['#7fc25e','#2f6a2a','#1d3d14']:sn?['#c8b894','#7a6c50','#3a3224']:['#ffd77a','#e0861c','#5a2a08'];
 if(!sn&&!cl)glow(g,x+8,y+8,14,`rgba(255,215,122,${.25+.15*Math.sin(frame*.1)})`);
 g.fillStyle='rgba(20,30,10,.35)';g.beginPath();g.ellipse(x+8,y+15.5,8,2.2,0,0,7);g.fill();
 g.fillStyle=ed;g.beginPath();g.roundRect(x,y,16,16,3.5);g.fill();
 const gr=g.createLinearGradient(0,y,0,y+16);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.beginPath();g.roundRect(x+1,y+1,14,14,2.6);g.fill();
 g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.roundRect(x+2,y+1.6,12,3.2,1.6);g.fill();
 if(cl){g.fillStyle='#f2ead6';g.beginPath();g.ellipse(x+8,y+10,3.2,2.8,0,0,7);g.fill();for(const[a,b]of[[4.6,6.2],[6.9,4.8],[9.3,4.8],[11.5,6.2]]){g.beginPath();g.arc(x+a,y+b,1.25,0,7);g.fill();}}
 else txtC(g,String(n.num),x+8,y+3.8,sn?'#4a4436':'#3a1a08',1);}
function mapCheck(g,x,y){g.fillStyle='#1d3d14';g.beginPath();g.arc(x+15,y+2,5,0,7);g.fill();g.fillStyle='#7fc25e';g.beginPath();g.arc(x+15,y+2,4,0,7);g.fill();g.strokeStyle='#f2ead6';g.lineWidth=1.4;g.beginPath();g.moveTo(x+12.8,y+2);g.lineTo(x+14.5,y+3.8);g.lineTo(x+17.4,y);g.stroke();}
function drawStartSign(g,x,y,t='GO',k0='#ffd77a',k1='#e0861c'){g.fillStyle='#2b1709';g.beginPath();g.roundRect(x+6.8,y+6,2.4,10,1);g.fill();
 g.beginPath();g.roundRect(x-.5,y,17,10,2.5);g.fill();const gr=g.createLinearGradient(0,y,0,y+10);gr.addColorStop(0,k0);gr.addColorStop(1,k1);g.fillStyle=gr;g.beginPath();g.roundRect(x+.6,y+1,14.8,8,2);g.fill();
 txtC(g,t,x+8,y+1.4,'#3a1a08',t.length>2?.65:.8);}
function mapRender(){const g=X,M=MAPG.g,path=MAPG.path,MW=MC*T,MH=MR*T;
 g.fillStyle='#0b140f';g.fillRect(0,0,W,H);
 g.fillStyle='#2b1709';g.beginPath();g.roundRect(MOX-5,MOY-3.5,MW+10,MH+7,6);g.fill();g.fillStyle='#c8955a';g.beginPath();g.roundRect(MOX-3,MOY-1.8,MW+6,MH+3.6,4.5);g.fill();
 g.save();g.beginPath();g.roundRect(MOX,MOY,MW,MH,3);g.clip();
 const MS=WORLDS[WCUR].map,gt=A[MS.tex],SHC=MS.shadow;if(!GPAT[WCUR]&&ok(gt)){GPAT[WCUR]=g.createPattern(gt,'repeat');GPAT[WCUR].setTransform(new DOMMatrix().scale(96/512));}
 g.fillStyle=GPAT[WCUR]||MS.fill;g.fillRect(MOX,MOY,MW,MH);
 const vg=g.createRadialGradient(MOX+MW/2,MOY+MH/2,MH*.4,MOX+MW/2,MOY+MH/2,MW*.62);vg.addColorStop(0,'rgba(255,240,180,.06)');vg.addColorStop(1,MS.vign);g.fillStyle=vg;g.fillRect(MOX,MOY,MW,MH);
 // water: sandy shore, then water body, then shimmer
 const W2=[];for(let r=0;r<MR;r++)for(let c=0;c<MC;c++)if(M[r][c]==='~')W2.push([MOX+c*T,MOY+r*T,c,r]);
 const isW=(c,r)=>r>=0&&r<MR&&c>=0&&c<MC&&M[r][c]==='~';
 g.fillStyle=MS.shore;for(const[x,y,c,r]of W2){const R=(a,b)=>!isW(c+a,r)&&!isW(c,r+b)?7:0;g.beginPath();g.roundRect(x-2,y-2,20,20,[R(-1,-1),R(1,-1),R(1,1),R(-1,1)]);g.fill();}
 const wg=g.createLinearGradient(0,MOY,0,MOY+MH);wg.addColorStop(0,MS.water[0]);wg.addColorStop(1,MS.water[1]);g.fillStyle=wg;
 for(const[x,y,c,r]of W2){const R=(a,b)=>!isW(c+a,r)&&!isW(c,r+b)?5:0;g.beginPath();g.roundRect(x-.3,y-.3,16.6,16.6,[R(-1,-1),R(1,-1),R(1,1),R(-1,1)]);g.fill();}
 g.strokeStyle='rgba(225,245,255,.85)';g.lineWidth=.9;g.lineCap='round';
 for(const[x,y,c,r]of W2){const ph=frame*.04+hsh(c,r)*6;for(let i=0;i<2;i++){const sx=x+3+hsh(c+i,r)*8+Math.sin(ph+i)*1.5,sy=y+4+i*7;g.globalAlpha=.5+.5*Math.sin(ph*1.3+i*2);g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(sx+2,sy-1.2,sx+4,sy);g.stroke();}}
 g.globalAlpha=1;
 // trail
 const pts=NODES.map(nodePx);g.lineJoin='round';g.lineCap='round';
 const trail=(w,col,dash)=>{g.strokeStyle=col;g.lineWidth=w;g.setLineDash(dash||[]);g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.setLineDash([]);};
 trail(9,'#5a3414');trail(7,'#ecd29a');trail(1.2,'#c9a064',[1.5,3.5]);
 for(let r=0;r<MR;r++)for(let c=0;c<MC;c++){const m=path[r][c];if(!m||M[r][c]!=='~')continue;const x=MOX+c*T,y=MOY+r*T,hz=m&3;g.save();g.translate(x+8,y+8);if(!hz)g.rotate(Math.PI/2);
  g.fillStyle='#2b1709';g.fillRect(-9,-5.5,18,11);for(let i=0;i<5;i++){g.fillStyle=i&1?'#a87040':'#c48a4a';g.fillRect(-8.5+i*3.5,-4.5,3,9);}g.fillStyle='#6e3f1f';g.fillRect(-9,-6,18,1.6);g.fillRect(-9,4.4,18,1.6);g.restore();}
 // terrain props, painted, back-to-front
 for(let r=0;r<MR;r++)for(let c=0;c<MC;c++){const s=MAPI[M[r][c]];if(!s)continue;const j=hsh(c,r),x=MOX+c*T+8+(j-.5)*4,y=MOY+r*T+15+(M[r][c]==='m'?1:0);
  g.fillStyle=SHC;g.beginPath();g.ellipse(x,y,s.w*.36,2,0,0,7);g.fill();ds(g,s,x-s.w/2,y-s.h,j>.5);}
 g.restore();
 for(let i=1;i<NODES.length-1;i++)if(!canPass(i)){const a=NODES[i],b=NODES[i+1],[dc,dr]=dirTo(a,b);drawLock(g,MOX+(a.c+dc)*T,MOY+(a.r+dr)*T);break;}
 NODES.forEach(n=>{const x=MOX+n.c*T,y=MOY+n.r*T,shadow=(w)=>{g.fillStyle='rgba(15,35,10,.38)';g.beginPath();g.ellipse(x+8,y+15,w,2.3,0,0,7);g.fill();};
  switch(n.k){case'lvl':drawPanel(g,n,x,y);break;case'start':drawStartSign(g,x,y);break;
   case'warp':if(n.glow&&G.cleared[n.glow])glow(g,x+8,y+5,16,`rgba(170,225,255,${.35+.15*Math.sin(frame*.1)})`);drawStartSign(g,x,y,...n.sign);break;
   default:{const K=NODEK[n.k];if(K&&K.draw)K.draw(g,n,x,y,shadow);}}});
 if(MS.deco)MS.deco(g);
 const a=NODES[MP.from],b=NODES[MP.i],[ax,ay]=nodePx(a),[bx,by]=nodePx(b),px=ax+(bx-ax)*MP.t,py=ay+(by-ay)*MP.t,hs=MHOSS[G.form]||MHOSS.big,mv=MP.t<1;
 g.fillStyle='rgba(15,35,10,.4)';g.beginPath();g.ellipse(px,py+6,6,1.8,0,0,7);g.fill();
 {const f=MHOSS[G.form]?G.form:'big',ph=frame*.32;drawRig(g,f,px,py+6,b.c<a.c,mv?ph:0,mv?.4:0,mv?.05:0,mv?Math.abs(Math.cos(ph))*.8:0,mv?1:1+Math.sin(frame*.07)*.02,hs.h);}
 // name strip + HUD
 const ny=MOY+MH+4;const gr=g.createLinearGradient(0,ny,0,PH);gr.addColorStop(0,'#14241a');gr.addColorStop(1,'#0b140f');g.fillStyle=gr;g.fillRect(0,ny,W,PH-ny);
 txtC(g,NODES[MP.i].n,W/2,ny+7,'#ffd77a',1.1,'#3a1a08');
 const y=PH,hg=g.createLinearGradient(0,y,0,H);hg.addColorStop(0,'#1a2a1e');hg.addColorStop(1,'#0b140f');g.fillStyle=hg;g.fillRect(0,y,W,H-y);
 hudCore(g,y);txt(g,'X PACK',132,y+14,'#8a9a7a',.8);
 if(msgT>0){pBox(g,W/2-118,8,236,17,4);txtC(g,msg,W/2,12,'#ffd77a');}
 if(sT<70){pBox(g,W/2-66,54,132,42,6);txtC(g,'WORLD '+WCUR,W/2,60,'#f2a93b',2,'#3a1a08');txtC(g,MS.saved&&G.cleared[MS.saved[0]]?MS.saved[1]:WORLDS[WCUR].name,W/2,82,MS.nameCol);}
 if(MP.pack){pBox(g,W/2-126,40,252,100,6);txtC(g,'ITEM PACK',W/2,47,'#ffd77a',1.8,'#3a1a08');
  if(!G.items.length)txtC(g,'EMPTY - VISIT THE RANGER HUT',W/2,84,'#c8bea4');
  G.items.forEach((it,i)=>{const x=W/2-112+i*28,y=70,sel=i===MP.pi;g.fillStyle=sel?'#f2a93b':'#3a3226';g.beginPath();g.roundRect(x-2,y-2,24,24,4);g.fill();g.fillStyle='#0b140f';g.beginPath();g.roundRect(x-.5,y-.5,21,21,3);g.fill();
   if(sel)glow(g,x+10,y+10,14,'rgba(255,215,122,.35)');const s=IS[it];ds(g,s,x+10-s.w*.6,y+19-s.h*1.2,false,false,1.2);});
  if(G.items.length){const it=G.items[MP.pi];txtC(g,{berry:'HUCKLEBERRY - GROW BIG',cone:'GOLDEN PINECONE - PINE HOSS',feather:'RAVEN FEATHER - SKY HOSS'}[it],W/2,100,'#e6b48c');}
  txtC(g,'Z USE   X CLOSE',W/2,120,'#8a9a7a');}}
// --- hut ---
let HUT={};
function hutInit(){const pool=['berry','cone','feather'].sort(()=>Math.random()-.5);HUT={sel:1,open:-1,t:0,pool};}
function hutUpdate(){if(HUT.open<0){if(PR.L){HUT.sel=(HUT.sel+2)%3;sfx('select');}if(PR.R){HUT.sel=(HUT.sel+1)%3;sfx('select');}if(PR.J||PR.S){HUT.open=HUT.sel;sfx('sprout');setTimeout(()=>sfx('power'),500);const it=HUT.pool[HUT.sel];if(G.items.length<8)G.items.push(it);G.hutUsed=true;saveG();}}else{HUT.t++;if(HUT.t>150||(HUT.t>40&&(PR.J||PR.S)))goScene('map');}}
function coverG(g,img,zoom=1,ax=.5,ay=.5){if(!ok(img))return;const iw=img.naturalWidth,ih=img.naturalHeight,s=Math.max(W/iw,H/ih)*zoom,w=iw*s,h=ih*s;g.drawImage(img,(W-w)*ax,(H-h)*ay,w,h);}
const CHEST=SP('chest',34),CHESTO=SP('chest_o',40);
function hutRender(){const g=X;g.fillStyle='#1a0e06';g.fillRect(0,0,W,H);coverG(g,A.hut_bg,1.02);
 const v=g.createLinearGradient(0,0,0,H);v.addColorStop(0,'rgba(10,6,2,.25)');v.addColorStop(.35,'rgba(10,6,2,.55)');v.addColorStop(1,'rgba(10,6,2,.2)');g.fillStyle=v;g.fillRect(0,0,W,H);
 txtC(g,'RANGER HUT',W/2,30,'#ffd77a',2.2,'#2b1709');txtC(g,HUT.open<0?'PICK ONE CHEST':'ADDED TO YOUR ITEM PACK!',W/2,56,'#f2ead6',1.1,'#2b1709');
 for(let i=0;i<3;i++){const cx=W/2-100+i*100,by=196,op=HUT.open===i,sel=HUT.open<0&&HUT.sel===i;
  g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(cx,by,26,4,0,0,7);g.fill();
  if(sel)glow(g,cx,by-18,40,`rgba(255,215,122,${.35+.15*Math.sin(frame*.15)})`);
  const s=op?CHESTO:CHEST,sc=sel?1.08+.02*Math.sin(frame*.2):1;ds(g,s,cx-s.w*sc/2,by-s.h*sc,false,false,sc);
  if(op){const iy=by-58-Math.min(14,HUT.t/3);glow(g,cx,iy+8,26,'rgba(255,246,192,.7)');const it=IS[HUT.pool[i]];ds(g,it,cx-it.w,iy+16-it.h*2,false,false,2);}
  if(sel){const ay=by-s.h-16+Math.sin(frame*.2)*2;g.fillStyle='#2b1709';g.beginPath();g.moveTo(cx-7,ay-1);g.lineTo(cx+7,ay-1);g.lineTo(cx,ay+8);g.fill();g.fillStyle='#ffd77a';g.beginPath();g.moveTo(cx-5,ay);g.lineTo(cx+5,ay);g.lineTo(cx,ay+6);g.fill();}}}
// --- game over ---
function overUpdate(){if(sT>60&&(PR.J||PR.S)){G.lives=5;G.score=0;G.cones=0;G.form='small';G.cards=[];saveG();goScene('map');}}
function overRender(){const g=X;g.fillStyle='#07100b';g.fillRect(0,0,W,H);g.save();g.filter='brightness(.35) saturate(.6)';coverG(g,A[(WORLDS[WCUR]||{}).overBg||'bg_far'],1.05);g.restore();
 txtC(g,'GAME OVER',W/2,64,'#f2a93b',3.2,'#3a1a08');txtC(g,'THE HIKERS GOT THEIR PHOTO...',W/2,108,'#e6dcc4',1,'#07100b');if((frame>>5)%2)txtC(g,'PRESS Z TO TRY AGAIN',W/2,140,'#9fc77a',1.2,'#07100b');txtC(g,'MAP PROGRESS IS KEPT',W/2,160,'#8a9a7a');}
// --- ending ---
function endingUpdate(){if(sT>240&&(PR.J||PR.S)){sfx('coin');goScene('map');}}
function endingRender(){const g=X,E=WORLDS[WCUR].ending;g.fillStyle='#07100b';g.fillRect(0,0,W,H);g.save();g.globalAlpha=Math.min(1,sT/90);coverG(g,A[E.img],1.08-.06*Math.min(1,sT/900),.5,.4);g.restore();
 const v=g.createLinearGradient(0,0,0,H);v.addColorStop(0,'rgba(7,16,11,.55)');v.addColorStop(.3,'rgba(7,16,11,0)');v.addColorStop(.62,'rgba(7,16,11,0)');v.addColorStop(1,'rgba(7,16,11,.9)');g.fillStyle=v;g.fillRect(0,0,W,H);
 if(sT>50)txtC(g,E.title,W/2,10,'#ffd77a',2.6,'#3a1a08');
 const L=[...E.lines,'SCORE '+String(G.score).padStart(7,'0')],n=L.length;
 L.forEach((l,i)=>{if(sT>110+i*40)txtC(g,l,W/2,152+i*12,i===n-1?'#ffd77a':'#f2ead6',1,'#07100b');});
 if(sT>240){txtC(g,'HOWARDAI - I WANT THAT',W/2,192,'#c9b6ff',1,'#07100b');if((frame>>5)%2)txtC(g,'PRESS Z',W/2,204,'#9fc77a',.9,'#07100b');}}
// --- titan splash (device space) ---
function splashRender(){if(SPLASH<=0||!ok(IMG.titan))return;const t=100-SPLASH,a=t<14?t/14:SPLASH<18?SPLASH/18:1;
 D.save();D.setTransform(1,0,0,1,0,0);D.globalAlpha=a*.95;D.imageSmoothingEnabled=true;D.imageSmoothingQuality='high';cover(IMG.titan,1.12-.1*t/100,.5,.4);
 D.globalAlpha=a;const k=u();D.fillStyle='rgba(11,20,15,.75)';D.fillRect(0,cv.height-52*k,cv.width,52*k);
 const sh=Math.sin(t*.9)*(t<30?2:0);TXTLW=.6;txtDC('TIMBER TITAN!',W/2+sh,H-46,'#d8ff6a',3.6,'#132010');TXTLW=1;
 txtDC('SMASH ROCKS - X ROAR - DOWN IN AIR GROUND POUND',W/2,H-12,'#f2ead6',1,'#07100b');D.restore();}
// ================= MAIN LOOP =================
function step(){pollInput();if(!READY())return;frame++;sT++;
 if(PR.M){muted=!muted;if(MG)MG.gain.value=muted?0:.32;}
 switch(scene){case'title':titleUpdate();break;case'map':mapUpdate();break;case'level':levelUpdate();break;case'hut':hutUpdate();break;case'over':overUpdate();break;case'ending':endingUpdate();break;}}
function render(){musicTick();const k=u();D.setTransform(1,0,0,1,0,0);D.filter='none';D.globalAlpha=1;D.imageSmoothingEnabled=true;D.imageSmoothingQuality='high';
 if(!READY()){D.fillStyle='#07100b';D.fillRect(0,0,cv.width,cv.height);D.setTransform(k,0,0,k,0,0);txtC(D,LOADMSG,W/2,92,'#9fc77a',1.2);
  D.fillStyle='#2a3a2e';D.beginPath();D.roundRect(W/2-80,112,160,6,3);D.fill();D.fillStyle='#f2a93b';D.beginPath();D.roundRect(W/2-80,112,Math.max(6,160*LOADN/Math.max(1,LOADT)),6,3);D.fill();return;}
 if(scene==='title'){titleRender();return;}
 D.setTransform(k,0,0,k,0,0);
 if(scene==='map')mapRender();else if(scene==='level')drawLevel();else if(scene==='hut')hutRender();else if(scene==='over')overRender();else if(scene==='ending')endingRender();
 if(scene==='level'&&sT<100&&!P.dead){const g=X;pBox(g,W/2-78,58,156,44,6);txtC(g,LDEF[CUR].card||('WORLD '+CUR),W/2,64,'#f2a93b',2,'#1a1208');txtC(g,LDEF[CUR].name,W/2,87,'#9fc77a');}
 if(scene==='level')splashRender();
 D.setTransform(1,0,0,1,0,0);
 if(muted){txtD('MUTED',W-40,2,'#8a9a7a',1,'#07100b');}}
let last=performance.now(),acc=0;
function loop(now){acc+=Math.min(100,now-last);last=now;while(acc>=1000/60){acc-=1000/60;step();}render();requestAnimationFrame(loop);}
// boot: core art + the saved world load in the background while the title waits
loadArt(CORE_ART);goMap.boot=ensureWorld(G.world||1).catch(()=>{G.world=1;G.node=1;return ensureWorld(1);});
goScene('title');requestAnimationFrame(loop);
