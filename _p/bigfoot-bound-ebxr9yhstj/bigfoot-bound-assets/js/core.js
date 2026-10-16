'use strict';
// ================= CORE =================
const W=384,H=216,PH=192,T=16;
const cv=document.getElementById('c'),D=cv.getContext('2d');
const X=D; // all scenes draw straight to the device canvas in game units (setTransform per frame)
let S=1;
// Size the canvas in physical device pixels so painted art and vector text render at full display resolution.
let TM=false; // touch mode: switched on by the first touch
function resize(){const dpr=window.devicePixelRatio||1,land=innerWidth>=innerHeight;let aw=innerWidth,ah=innerHeight;
 if(TM){if(land)aw=innerWidth-2*Math.min(142,innerWidth*.17);else ah=Math.max(120,innerHeight-260);}
 const s=Math.min(aw*dpr/W,ah*dpr/H);S=s;cv.width=Math.round(W*S);cv.height=Math.round(H*S);cv.style.width=cv.width/dpr+'px';cv.style.height=cv.height/dpr+'px';
 const ch=cv.height/dpr;cv.style.top=(TM&&!land)?Math.max(ch/2+8,(innerHeight-260)/2)+'px':'50%';
 const r=document.getElementById('rot');if(r)r.style.top=(TM&&!land?Math.max(ch+16,(innerHeight-260)/2+ch/2+10):0)+'px';}
addEventListener('resize',resize);resize();
if(window.matchMedia)matchMedia('(resolution: '+(window.devicePixelRatio||1)+'dppx)').addEventListener?.('change',resize);
const IMG={};for(const[k,f]of[['title','title.webp'],['titan','titan.webp']]){const i=new Image();i.src='bigfoot-bound-assets/'+f;IMG[k]=i;}
const ok=i=>i&&i.complete&&i.naturalWidth>0;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function rng(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;}}

// ================= TEXT (vector) =================
let TXTLW=1;const FONTF="'Arial Black','Segoe UI Black',Impact,sans-serif",_mc=document.createElement('canvas').getContext('2d');
function txt(g,s,x,y,col,sc=1,sh){s=String(s).toUpperCase();g.save();g.font=`${9*sc}px ${FONTF}`;g.textBaseline='top';
 if(sh){g.lineJoin='round';g.strokeStyle=sh;g.lineWidth=2.4*sc*TXTLW;g.strokeText(s,x,y);}g.fillStyle=col;g.fillText(s,x,y);g.restore();}
const tw=(s,sc=1)=>{_mc.font=`${9*sc}px ${FONTF}`;return _mc.measureText(String(s).toUpperCase()).width;};
function txtC(g,s,cx,y,col,sc=1,sh){txt(g,s,cx-tw(s,sc)/2,y,col,sc,sh);}

// ================= INPUT =================
const K={},TOUCH={},KEYMAP={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',KeyZ:'J',Space:'J',KeyK:'J',KeyX:'B',ShiftLeft:'B',ShiftRight:'B',KeyJ:'B',Enter:'S',Escape:'P',KeyP:'P',KeyM:'M'};
const IN={L:0,R:0,U:0,D:0,J:0,B:0,S:0,P:0,M:0},PR={};
// Run without holding Shift (Shift+Right+Space ghosts on many keyboards): double-tap a direction, or Caps Lock = always run.
let DASH=null,CAPS=false;const TAP={};
addEventListener('keydown',e=>{const k=KEYMAP[e.code];CAPS=e.getModifierState&&e.getModifierState('CapsLock');
 if((k==='L'||k==='R')&&!e.repeat){const t=performance.now();DASH=(TAP[k]&&t-TAP[k]<280)?k:(DASH===k?k:null);TAP[k]=t;}
 if(k){K[k]=1;e.preventDefault();}initAudio();});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];CAPS=e.getModifierState&&e.getModifierState('CapsLock');if(k){K[k]=0;if(DASH===k)DASH=null;}});
addEventListener('blur',()=>{for(const k in K)K[k]=0;});
const TP={},TCH=new Map(),$pad=document.getElementById('pad'),$btn=[...document.querySelectorAll('#ab .b,#st')];
function hitKeys(x,y){const ks=new Set(),p=$pad.getBoundingClientRect(),r=p.width/2,dx=x-p.left-r,dy=y-p.top-r;
 if(Math.hypot(dx,dy)<r*1.4){if(dx>r*.3)ks.add('R');if(dx<-r*.3)ks.add('L');if(dy>r*.42)ks.add('D');if(dy<-r*.55)ks.add('U');}
 for(const b of $btn){const q=b.getBoundingClientRect();if(b.id==='st'){if(x>q.left-6&&x<q.right+6&&y>q.top-6&&y<q.bottom+6)ks.add('S');}
  else if(Math.hypot(x-q.left-q.width/2,y-q.top-q.height/2)<q.width*.74)ks.add(b.dataset.k);}
 return ks;}
function onTouch(e){if(!TM){TM=true;document.getElementById('touch').style.display='block';document.body.classList.add('tm');resize();}
 let used=false;const prevJ=TP.J;
 for(const t of e.changedTouches){if(e.type==='touchend'||e.type==='touchcancel'){if(TCH.delete(t.identifier))used=true;continue;}
  const ks=hitKeys(t.clientX,t.clientY);if(e.type==='touchstart'&&!ks.size)continue;if(e.type==='touchmove'&&!TCH.has(t.identifier))continue;TCH.set(t.identifier,ks);used=true;}
 for(const k of'LRUDJBS')TP[k]=0;for(const ks of TCH.values())for(const k of ks)TP[k]=1;
 document.querySelectorAll('#touch .b').forEach(b=>b.classList.toggle('on',!!TP[b.dataset.k]));
 if(TP.J&&!prevJ&&navigator.vibrate)navigator.vibrate(12);
 if(used){e.preventDefault();initAudio();}}
for(const ev of['touchstart','touchmove','touchend','touchcancel'])addEventListener(ev,onTouch,{passive:false});
// Android: go fullscreen + landscape on first tap (needs a user gesture; iPhone Safari ignores this)
addEventListener('touchend',()=>{const d=document.documentElement;if(d.requestFullscreen&&innerWidth>innerHeight)d.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{});},{once:true});
cv.addEventListener('pointerdown',e=>{if(TM&&hitKeys(e.clientX,e.clientY).size)return;initAudio();TOUCH.S=1;setTimeout(()=>TOUCH.S=0,80);});
function pollInput(){let gp=null;if(navigator.getGamepads){for(const p of navigator.getGamepads())if(p){gp=p;break;}}
 const b=i=>gp&&gp.buttons[i]&&gp.buttons[i].pressed,ax=gp?gp.axes:[0,0];
 for(const k in IN){let v=K[k]||TOUCH[k]||TP[k]||0;if(gp){if(k==='L'&&(b(14)||ax[0]<-.4))v=1;if(k==='R'&&(b(15)||ax[0]>.4))v=1;if(k==='U'&&(b(12)||ax[1]<-.5))v=1;if(k==='D'&&(b(13)||ax[1]>.5))v=1;if(k==='J'&&b(0))v=1;if(k==='B'&&(b(1)||b(2)))v=1;if(k==='S'&&b(9))v=1;if(k==='P'&&b(8))v=1;}
  if(k==='B'&&scene==='level'&&((DASH&&K[DASH])||(CAPS&&(K.L||K.R))))v=1;
  PR[k]=!!(v&&!IN[k]);IN[k]=v;}
 if(scene==='level'&&K.U){if(PR.U)PR.J=true;IN.J=1;}}

// ================= AUDIO =================
let AC=null,MG,MUS,SFXG,NB,muted=false,pendingSong=null;
function initAudio(){if(AC){if(AC.state==='suspended')AC.resume();return;}try{AC=new(window.AudioContext||window.webkitAudioContext)();MG=AC.createGain();MG.gain.value=.32;MG.connect(AC.destination);MUS=AC.createGain();MUS.gain.value=.55;MUS.connect(MG);SFXG=AC.createGain();SFXG.gain.value=.9;SFXG.connect(MG);
 NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;if(pendingSong){const p=pendingSong;pendingSong=null;playSong(p);}}catch(e){AC=null;}}
function tone(f,t,d,type='square',v=.2,dest=SFXG,f2){if(!AC||!f)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.03);}
function noise(t,d,v=.2,dest=SFXG,fr=3000,ft='lowpass'){if(!AC)return;const s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=ft;fl.frequency.value=fr;const g=AC.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(g);g.connect(dest);s.start(t);s.stop(t+d+.03);}
const arp=(ns,dt,d,type='square',v=.11)=>{const t=AC.currentTime;ns.forEach((f,i)=>tone(f,t+i*dt,d,type,v));};
const SFX={
 jump(){tone(260,AC.currentTime,.16,'square',.1,SFXG,640);},
 coin(){const t=AC.currentTime;tone(988,t,.06,'square',.09);tone(1319,t+.06,.25,'square',.09);},
 bump(){tone(150,AC.currentTime,.09,'square',.15,SFXG,70);},
 stomp(){const t=AC.currentTime;tone(520,t,.12,'square',.13,SFXG,120);noise(t,.06,.15);},
 brk(){const t=AC.currentTime;noise(t,.28,.35,SFXG,1400);tone(200,t,.1,'square',.1,SFXG,60);},
 sprout(){arp([300,380,460,540,620,700],.05,.06,'square',.08);},
 power(){arp([523,659,784,1047,784,1047,1319,1568],.055,.09);},
 hurt(){arp([784,622,523,392,330],.07,.1);},
 kick(){tone(900,AC.currentTime,.07,'square',.12,SFXG,350);},
 throw(){const t=AC.currentTime;tone(1200,t,.07,'triangle',.18,SFXG,500);noise(t,.04,.08,SFXG,6000,'highpass');},
 pipe(){const t=AC.currentTime;for(let i=0;i<3;i++)tone(240,t+i*.11,.09,'square',.1,SFXG,110);},
 oneup(){arp([659,784,1319,1047,1175,1568],.08,.1);},
 tink(){tone(1800,AC.currentTime,.05,'square',.08);},
 fly(){tone(500,AC.currentTime,.06,'triangle',.12,SFXG,900);},
 roar(){const t=AC.currentTime;tone(110,t,.9,'sawtooth',.25,SFXG,50);tone(166,t,.7,'sawtooth',.12,SFXG,70);noise(t,.8,.35,SFXG,700);},
 quake(){const t=AC.currentTime;noise(t,.8,.55,SFXG,240);tone(60,t,.7,'sine',.45,SFXG,28);},
 step(){const t=AC.currentTime;noise(t,.12,.25,SFXG,180);tone(70,t,.12,'sine',.3,SFXG,38);},
 bounce(){tone(180,AC.currentTime,.2,'square',.12,SFXG,900);},
 pause(){arp([659,523,659,523],.07,.06);},
 select(){tone(880,AC.currentTime,.05,'square',.08);},
 titan(){const t=AC.currentTime;[196,247,294,392,494,587,784].forEach((f,i)=>{tone(f,t+i*.07,.3,'sawtooth',.08);tone(f/2,t+i*.07,.3,'square',.06);});noise(t+.4,.9,.3,SFXG,500);},
 die(){arp([494,698,0,698,698,659,587,523,330,262],.11,.12);},
 clear(){const t=AC.currentTime;[[523,0],[659,.12],[784,.24],[1047,.36],[784,.6],[1047,.72],[1319,.84]].forEach(([f,d])=>{tone(f,t+d,.22,'square',.1);tone(f/2,t+d,.22,'triangle',.18);});tone(1568,t+1.08,.7,'square',.1);tone(523,t+1.08,.7,'triangle',.2);},
 gameover(){arp([523,392,330,440,494,440,415,466,415,392],.16,.18,'square',.1);},
};
function sfx(n){if(AC&&!muted&&SFX[n])SFX[n]();}
const SONGS={
 level:{bpm:152,lead:'E5 . G5 . A5 - G5 E5 D5 . E5 . C5 - - . E5 . G5 . A5 - C6 A5 G5 - - - . . . . A5 . G5 . E5 . D5 C5 D5 . E5 . G5 - E5 . C5 . D5 . E5 G5 E5 D5 C5 - - - . . G4 .',bass:'C3 . G3 . C3 . G3 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 . A2 . E3 . A2 . E3 . E2 . B2 . E2 . B2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 .',drum:'k . h k s . h .'},
 map:{bpm:112,lead:'G4 . B4 . D5 - B4 . C5 . B4 . A4 - - . G4 . B4 . D5 - G5 . F#5 - E5 - D5 - - . E5 . D5 . B4 - G4 . A4 . B4 . A4 - - . G4 . B4 . D5 . E5 . D5 - - - - - . .',bass:'G2 - - - D3 - - - C3 - - - D3 - - - G2 - - - B2 - - - D3 - - - D2 - - - C3 - - - G2 - - - D3 - - - A2 - - - G2 - - - C3 - - - D3 - - - G2 - - -',drum:'k . . . h . . . k . . . h . h .',lt:'triangle'},
 titan:{bpm:172,lead:'E5 . E5 G5 . E5 A5 . G5 . E5 . D5 . B4 . E5 . E5 G5 . E5 B5 . A5 . G5 . F#5 . D5 .',bass:'E2 E2 E3 E2 E2 E3 E2 E3 C2 C2 C3 C2 D2 D2 D3 D2 E2 E2 E3 E2 E2 E3 E2 E3 C2 C2 C3 C2 D2 D2 B2 B2',drum:'k h s h k k s h'},
 cave:{bpm:128,lead:'. . A4 . C5 . E5 . D5 . C5 . A4 - - . . . A4 . C5 . E5 . G5 . E5 . D5 - - .',bass:'A2 . . . A2 . . . F2 . . . F2 . . . A2 . . . A2 . . . G2 . . . E2 . . .',drum:'k . . . s . . .',lt:'triangle'},
 canopy:{bpm:144,lead:'C5 . E5 G5 . E5 C6 . B5 . G5 . A5 - - . F5 . A5 C6 . A5 D6 . C6 . A5 . G5 - - . E5 . G5 C6 . G5 E6 . D6 . C6 . B5 . G5 . A5 . B5 . C6 - - - . . G4 .',bass:'C3 . G3 . E3 . G3 . F2 . C3 . A2 . C3 . F2 . C3 . A2 . C3 . G2 . D3 . B2 . D3 . C3 . G3 . E3 . G3 . A2 . E3 . C3 . E3 . G2 . D3 . B2 . D3 . C3 . G3 . C3 . G2 .',drum:'k . h . s . h h'},
 battle:{bpm:164,lead:'A4 . C5 . E5 . A4 . G4 . B4 . D5 . G4 . F4 . A4 . C5 . F5 - E5 . D5 . C5 . B4 . G#4 - - .',bass:'A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 . F2 . F2 . F2 . F2 . E2 . E2 . E2 . E2 .',drum:'k h s h k k s h'},
 river:{bpm:150,lead:'G4 . B4 . D5 . G5 - F#5 . D5 . E5 - - . C5 . E5 . G5 . C6 - B5 . G5 . A5 - - . D5 . F#5 . A5 . D6 - C6 . A5 . B5 . G5 . E5 . D5 - - - . .',bass:'G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . D3 . A3 . D3 . A3 .',drum:'k . h . s . h k'},
 fort:{bpm:118,lead:'E4 . . F4 E4 . . . E4 . . F4 E4 . . . G4 . F4 . E4 . D#4 . E4 - - - . . . . B4 . . C5 B4 . . . B4 . . C5 B4 . . . D5 . C5 . B4 . A#4 . B4 - - - . . . .',bass:'E2 . E2 . E2 . E2 . F2 . F2 . E2 . E2 .',drum:'k . . k s . . .'},
 boss:{bpm:178,lead:'E5 D#5 E5 . B4 . E5 D#5 E5 . C5 . E5 D#5 E5 . D5 . C5 . B4 . A4 . B4 . G4 . A4 . B4 .',bass:'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 B1 B2',drum:'k s k s k s k k'},
 ending:{bpm:96,lead:'C5 - E5 - G5 - C6 - - - B5 - G5 - E5 - F5 - A5 - C6 - F5 - - - E5 - D5 - C5 - - - - - - - . . G4 - C5 - E5 - G5 - - - A5 - G5 - E5 - D5 - E5 - D5 - B4 - G4 - C5 - - - - - - - - - - - . .',bass:'C3 - - - G2 - - - A2 - - - E2 - - - F2 - - - C3 - - - G2 - - - G2 - - -',drum:'k . . . s . . .',lt:'triangle'},
 title:{bpm:120,lead:'E4 . G4 . B4 . E5 - D5 . B4 . G4 - A4 . C5 . E5 . A5 - G5 . E5 . D5 - - . B4 . D5 . G5 - F#5 . D5 . B4 - C5 . B4 . A4 . G4 - - - - - . .',bass:'E2 - - - B2 - - - E2 - - - B2 - - - A2 - - - E3 - - - A2 - - - E3 - - - G2 - - - D3 - - - G2 - - - D3 - - - C3 - - - D3 - - - E2 - - - - - - -',drum:'k . . . s . . h',lt:'triangle'},
};
let song=null,songStep=0,songNext=0;
function noteF(n){const m=/^([A-G])(#?)(\d)$/.exec(n);if(!m)return 0;const i={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]?1:0);return 440*Math.pow(2,(i+(+m[3]+1)*12-69)/12);}
function playSong(name){if(!AC){pendingSong=name;return;}if(song&&song.name===name)return;const s=SONGS[name];const sp=x=>x.trim().split(/\s+/);song={name,bpm:s.bpm,lt:s.lt||'square',L:sp(s.lead),B:sp(s.bass),Dr:sp(s.drum)};songStep=0;songNext=AC.currentTime+.06;}
function stopSong(){song=null;pendingSong=null;}
function musicTick(){if(!AC||!song)return;const st=60/song.bpm/2;if(songNext<AC.currentTime-.5)songNext=AC.currentTime+.02;
 while(songNext<AC.currentTime+.12){const i=songStep;
  const pl=(tr,type,vol)=>{const n=tr[i%tr.length];if(n&&n!=='.'&&n!=='-'){let d=1;while(tr[(i+d)%tr.length]==='-'&&d<16)d++;tone(noteF(n),songNext,st*d*.92,type,vol,MUS);}};
  pl(song.L,song.lt,song.lt==='square'?.07:.16);pl(song.B,'triangle',.22);
  const dn=song.Dr[i%song.Dr.length];if(dn==='k')tone(130,songNext,.12,'sine',.45,MUS,40);else if(dn==='s')noise(songNext,.12,.18,MUS,2600);else if(dn==='h')noise(songNext,.03,.05,MUS,8000,'highpass');
  songStep++;songNext+=st;}}
// ================= HD ART =================
// Gameplay art is painted ComfyUI renders (bigfoot-bound-assets/hd/*.webp), chroma-keyed to transparent sprites.
// Art loads lazily: A[name] hands out a placeholder Image right away (so sprite tables can be built up front);
// loadArt() fills in the pixels. Core art loads at boot, each world brings its own list (see worlds/manifest.js).
const ASSET='bigfoot-bound-assets/';
const CORE_ART=['hoss_small','hoss_big','hoss_pine','hoss_sky','hoss_titan','hiker','hiker_flee','snapper','shell','panda','drone','trap_o','trap_c','berry','cone','coin','feather','acorn','firefly','cast','qblock','used','brick','stone','fungus','log','pipe','bush','fern','dirt','cavetex','hut_bg','chest','chest_o','bark','hunter','salmon','ice'];
for(const f of['small','big','pine','sky','titan'])for(const p of'tbf')CORE_ART.push('rig/hoss_'+f+'_'+p);
const A=new Proxy({},{get:(t,n)=>typeof n!=='string'?undefined:(t[n]||(t[n]=new Image()))});
let PEND=0,LOADN=0,LOADT=0,LOADMSG='GATHERING THE FOREST...';
function loadArt(names,base){if(PEND<=0){LOADN=LOADT=0;}const ps=[];
 for(const n of names){const i=A[n];if(i.src)continue;PEND++;LOADT++;ps.push(new Promise(res=>{i.onload=i.onerror=()=>{PEND--;LOADN++;res();};i.src=(base||ASSET+'hd/')+n+'.webp';}));}
 return Promise.all(ps);}
const READY=()=>PEND<=0;
// A sprite is drawn h game-units tall; width follows the image aspect.
function SP(n,h){return{img:A[n],h,get w(){const i=A[n];return i.naturalWidth?h*i.naturalWidth/i.naturalHeight:h;}};}
// Draw sprite with top-left x,y. Pivot is bottom-centre so squash/tilt keep the feet planted.
function ds(g,s,x,y,fx,fy,sc=1,o){if(!s||!ok(s.img))return;const w=s.w*sc,h=s.h*sc,sx=(o&&o.sx)||1,sy=(o&&o.sy)||1;
 g.save();g.translate(x+w/2,y+h);if(o&&o.rot)g.rotate(o.rot);g.scale((fx?-1:1)*sx,sy);if(fy){g.translate(0,-h/2);g.scale(1,-1);g.translate(0,h/2);}
 g.drawImage(s.img,-w/2,-h,w,h);g.restore();}
function dimg(g,s,x,y,w,h){if(s&&ok(s.img))g.drawImage(s.img,x,y,w,h);}
const HSP={small:SP('hoss_small',21),big:SP('hoss_big',35),pine:SP('hoss_pine',35),sky:SP('hoss_sky',36),titan:SP('hoss_titan',70)};
// Walk rig: each Hoss form is split into torso + back leg + front leg (same canvas); legs swing about the hips.
const RIG={small:{hip:.7,bx:.348,fx:.582},big:{hip:.71,bx:.367,fx:.584},pine:{hip:.69,bx:.36,fx:.565},sky:{hip:.71,bx:.497,fx:.696},titan:{hip:.68,bx:.416,fx:.625}};
function drawRig(g,form,bx,by,fx,ph,amp,lean,bob,sy=1,H){const s=HSP[form],R=RIG[form],n='rig/hoss_'+form+'_',h=H||s.h,w=s.w*h/s.h,x0=-w/2,y0=-h,sn=Math.sin(ph),cs=Math.cos(ph);
 if(!ok(A[n+'t'])){ds(g,s,bx-w/2,by-h,fx,false,h/s.h);return;}
 g.save();g.translate(bx,by);g.scale(fx?-1:1,1);g.rotate(lean);g.scale(1,sy);g.translate(0,-bob);
 const leg=(img,px,ang,lift)=>{const pX=x0+px*w,pY=y0+R.hip*h;g.save();g.translate(pX,pY-lift*h*.035);g.rotate(ang);g.scale(1,1-lift*.12);g.drawImage(img,x0-pX,y0-pY,w,h);g.restore();};
 leg(A[n+'b'],R.bx,-amp*sn,Math.max(0,cs)*(amp>0?1:0));leg(A[n+'f'],R.fx,amp*sn,Math.max(0,-cs)*(amp>0?1:0));
 g.drawImage(A[n+'t'],x0,y0,w,h);g.restore();}
const ES={hiker:SP('hiker',27),hikerFlee:SP('hiker_flee',27),snapper:SP('snapper',16),shell:SP('shell',13),panda:SP('panda',21),drone:SP('drone',10),trapO:SP('trap_o',30),trapC:SP('trap_c',30),hunter:SP('hunter',27),salmon:SP('salmon',12),foreman:SP('foreman',44),baron:SP('baron',68)};
const IS={berry:SP('berry',15),cone:SP('cone',15),feather:SP('feather',15),acorn:SP('acorn',15),firefly:SP('firefly',15),cast:SP('cast',15),pcone:SP('cone',8)};
const COIN=SP('coin',13),BUSH=SP('bush',26),FERN=SP('fern',13);
// painted grass lip for ground tiles: 4 tile-wide seamless strip, 64px per tile, covers tileTop-4 .. tileTop+12
const GTOP=(()=>{const K=64,c=document.createElement('canvas');c.width=K*4;c.height=K;const g=c.getContext('2d'),r=rng(5),TAU=Math.PI*2;
 const yb=x=>40+Math.sin(x*TAU/32)*3+Math.sin(x*TAU/128+1)*4+Math.sin(x*TAU/256*3)*2;
 g.fillStyle='#1d3d14';g.beginPath();g.moveTo(0,13);for(let x=0;x<=256;x+=2)g.lineTo(x,yb(x)+3);g.lineTo(256,13);g.fill();
 const gr=g.createLinearGradient(0,16,0,48);gr.addColorStop(0,'#a6e05e');gr.addColorStop(.35,'#6fbf3e');gr.addColorStop(1,'#3f8a2a');
 g.fillStyle=gr;g.beginPath();g.moveTo(0,16);for(let x=0;x<=256;x+=2)g.lineTo(x,yb(x));g.lineTo(256,16);g.fill();
 g.fillStyle='#d6f79a';g.fillRect(0,16,256,2.5);
 for(let i=0;i<90;i++){const x=r()*256,h=4+r()*9,w=1.6+r()*1.6,col=r()<.5?'#5fae36':'#86cc4a';
  for(const ox of[0,-256,256]){g.fillStyle='#1d3d14';g.beginPath();g.moveTo(x+ox-w-1,19);g.lineTo(x+ox+(r()-.5)*3,18-h-1);g.lineTo(x+ox+w+1,19);g.fill();
   g.fillStyle=col;g.beginPath();g.moveTo(x+ox-w,19);g.lineTo(x+ox,18-h);g.lineTo(x+ox+w,19);g.fill();}}
 for(let i=0;i<14;i++){const x=r()*256,y=24+r()*10;g.fillStyle='rgba(30,70,20,.35)';g.beginPath();g.ellipse(x,y,3+r()*3,1.2,0,0,7);g.fill();}
 return c;})();

// ================= SAVE / GLOBAL =================
// Save keeps the original key so old progress carries over; G.v + migrate() upgrade older saves.
const SAVE_KEY='bigfootBound.v1',SAVE_V=2;
let G;
function newGame(){return{v:SAVE_V,lives:5,score:0,cones:0,cards:[],items:['berry'],form:'small',cleared:{},lcasts:{},hutUsed:false,node:1,world:1};}
function migrate(s){if(!s.v){s.lcasts=s.lcasts||{};if(s.casts)s.lcasts['1-1']=s.casts;delete s.casts;s.v=2;}return s;}
function loadG(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.lives)return Object.assign(newGame(),migrate(s));}catch(e){}return null;}
function saveG(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(G));}catch(e){}}
G=loadG()||newGame();
