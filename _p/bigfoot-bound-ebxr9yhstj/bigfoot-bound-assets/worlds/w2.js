'use strict';
// ================= WORLD 2 - FROSTBITE PEAKS =================
const ICIC=SP('icicle',17),SBUSH=SP('sbush',20),SNOWMAN=SP('snowman',28),MLODGE=SP('map_lodge',25),MPEAK=SP('map_peak',42);
ES.goat=SP('goat',19);ES.boarder=SP('boarder',27);
const SNOWTOP=(()=>{const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d'),r=rng(9),TAU=Math.PI*2;
 const yb=x=>38+Math.sin(x*TAU/64)*3+Math.sin(x*TAU/128+2)*3+Math.sin(x*TAU/256*2)*2,yt=x=>15+Math.sin(x*TAU/32+1)*1.3+Math.sin(x*TAU/128)*1;
 const shape=()=>{g.beginPath();g.moveTo(0,yt(0));for(let x=0;x<=256;x+=2)g.lineTo(x,yt(x));for(let x=256;x>=0;x-=2)g.lineTo(x,yb(x));g.closePath();};
 g.lineJoin='round';shape();g.strokeStyle='#3d5a78';g.lineWidth=5;g.stroke();
 for(let i=0;i<22;i++){const x=r()*256,l=5+r()*9,w=1.6+r()*1.4;for(const ox of[0,-256,256]){const bx=x+ox,by=yb(x)-1;g.fillStyle='#3d5a78';g.beginPath();g.moveTo(bx-w-1,by);g.lineTo(bx,by+l+1.5);g.lineTo(bx+w+1,by);g.fill();g.fillStyle='#cfe6f7';g.beginPath();g.moveTo(bx-w,by);g.lineTo(bx,by+l);g.lineTo(bx+w,by);g.fill();}}
 const gr=g.createLinearGradient(0,14,0,44);gr.addColorStop(0,'#ffffff');gr.addColorStop(.45,'#e8f2fb');gr.addColorStop(1,'#a9c6e0');shape();g.fillStyle=gr;g.fill();
 g.fillStyle='rgba(255,255,255,.95)';g.beginPath();for(let x=0;x<=256;x+=2)g.lineTo(x,yt(x)+.6);for(let x=256;x>=0;x-=2)g.lineTo(x,yt(x)+3);g.fill();
 for(let i=0;i<26;i++){const x=r()*256,y=20+r()*14;g.fillStyle='rgba(120,160,200,.25)';g.beginPath();g.ellipse(x,y,3+r()*4,1.2,0,0,7);g.fill();}
 for(let i=0;i<30;i++){g.fillStyle='rgba(255,255,255,.9)';g.fillRect(r()*256,17+r()*16,1.2,1.2);}
 return c;})();
THEMES.snow={dirt:'snowdirt',top:SNOWTOP,slope:['#3d5a78','#e8f2fb','#ffffff']};
BGS.snow={draw(g,dy){const sg=g.createLinearGradient(0,0,0,PH);sg.addColorStop(0,'#5d9ad6');sg.addColorStop(1,'#e6f1fa');g.fillStyle=sg;g.fillRect(0,0,W,PH);bandH(g,A.bg_snow,-34+dy*.08,232,.06);
  g.save();g.globalAlpha=.55;bandH(g,A.bg_snowmid,PH-112+dy*.3,64,.2);g.restore();const hz=g.createLinearGradient(0,70,0,PH);hz.addColorStop(0,'rgba(230,242,252,0)');hz.addColorStop(1,'rgba(225,238,250,.5)');g.fillStyle=hz;g.fillRect(0,70,W,PH-70);bandH(g,A.bg_snowmid,PH-104+dy*.5,100,.42);},
 over(g){g.fillStyle='#ffffff';for(let i=0;i<70;i++){const sz=.6+(i%4)*.35,x=((i*89.7+Math.sin(frame*.02+i)*8-frame*.15-camX*(.25+sz*.3))%W+W)%W,y=((i*41.3+frame*(.35+(i%5)*.12)-camY*.3)%PH+PH)%PH;g.globalAlpha=.45+.1*(i%5);g.beginPath();g.arc(x,y,sz,0,7);g.fill();}g.globalAlpha=1;}};
DECO.sbush=decoSp(SBUSH,20);DECO.snowman=decoSp(SNOWMAN,8);
// rolling snowballs from L.gens; Hoss can stomp them
HAZK.snow={spawn:{k:'snow',w:14,h:14,vx:-1.3,vy:0,g:.3},roll:1,stomp:1,draw(g,h,cx,cy){g.save();g.translate(cx,cy+.5);g.rotate(h.t*.19*Math.sign(h.vx||-1));g.fillStyle='#3d5a78';g.beginPath();g.arc(0,0,8,0,7);g.fill();const sg=g.createRadialGradient(-2.5,-3,1,0,0,7.2);sg.addColorStop(0,'#ffffff');sg.addColorStop(.7,'#e2eef8');sg.addColorStop(1,'#a9c6e0');g.fillStyle=sg;g.beginPath();g.arc(0,0,7.2,0,7);g.fill();g.fillStyle='rgba(90,130,170,.45)';for(const[a,b]of[[2.5,1],[-2,3],[0,-4],[-4,-1]]){g.beginPath();g.arc(a,b,1,0,7);g.fill();}g.restore();}};
Object.assign(ED,{goat:{w:16,h:15},boarder:{w:12,h:22},icicle:{w:8,h:16}});
function drawGB(g,e){const s2=ES[e.t],cx=e.x+e.w/2;let y=e.y+e.h-s2.h+1,x=cx-s2.w/2;const o={};
  if(e.t==='goat'){if(e.st==='walk'){y-=Math.abs(Math.sin(e.tm*.2))*1.2;o.rot=Math.sin(e.tm*.2)*.05;}else if(e.st==='paw'){x+=Math.sin(e.tm*1.3)*.7;o.rot=e.dir*.06;}else if(e.st==='charge'){o.rot=e.dir*.1+Math.sin(e.tm*.5)*.04;y-=Math.abs(Math.sin(e.tm*.4))*1.5;}}
  else if(e.st!=='dead')o.rot=e.ground?Math.sin(e.tm*.15)*.05:-e.dir*.22;
  ds(g,s2,x,y,e.dir>0,e.st==='dead',1,o);}
Object.assign(ENT,{
 goat:{upd(e,L){const pd=P.x+P.w/2<e.x+e.w/2?-1:1,dx=Math.abs(P.x-e.x),dy=Math.abs(P.y+P.h-(e.y+e.h));grav(e);
    if(e.st==='walk'){e.vx=e.dir*.4;if(e.ground&&dx<130&&dy<26&&e.tm>45&&!P.dead){e.st='paw';e.tm=0;e.dir=pd;e.vx=0;}}
    else if(e.st==='paw'){e.vx=0;if(e.tm%8===0)dust(e.x+e.w/2-e.dir*6,e.y+e.h,1);if(e.tm>32){e.st='charge';e.tm=0;sfx('step');}}
    else if(e.st==='charge'){e.vx=e.dir*2.6;if(e.tm%5===0)dust(e.x+e.w/2-e.dir*6,e.y+e.h,1);if(e.tm>85){e.st='walk';e.tm=0;}}
    moveBody(e,L);if(e.hitWall){e.dir*=-1;if(e.st==='charge'){e.st='walk';e.tm=0;shake=Math.max(shake,4);sfx('bump');}}if(e.st==='walk')edgeTurn(e,L);},draw:drawGB,stomp:stompKO},
 boarder:{upd(e,L){grav(e);if(e.ground){e.vx=e.dir*1.55;if(e.tm%110===100){e.vy=-5;e.ground=false;}if(e.tm%4===0)part({k:'dust',x:e.x+e.w/2-e.dir*7,y:e.y+e.h-2,vx:-e.dir*.8,vy:-.8,life:18});}moveBody(e,L);if(e.hitWall)e.dir*=-1;},draw:drawGB,stomp:stompKO},
 icicle:{upd(e,L){
    if(e.st==='hang'){if(Math.abs(P.x+P.w/2-(e.x+e.w/2))<28&&P.y>e.y&&!P.dead){e.st='shake';e.tm=0;sfx('tink');}}
    else if(e.st==='shake'){if(e.tm>22){e.st='fall';e.vy=0;}}
    else if(e.st==='fall'){e.vy=Math.min(e.vy+.4,6);e.y+=e.vy;const r=Math.floor((e.y+e.h)/T),c=Math.floor((e.x+e.w/2)/T);if(SOL.has(tile(L,c,r))&&e.y+e.h>r*T+2){e.gone=1;sfx('brk');for(let i=0;i<6;i++)part({k:'dust',x:e.x+e.w/2,y:r*T-2,vx:(Math.random()*2-1)*1.6,vy:-1-Math.random()*2,g:.15,life:24});}}
    },draw(g,e){let x=e.x+e.w/2-ICIC.w/2;if(e.st==='shake')x+=Math.sin(e.tm*1.6);ds(g,ICIC,x,e.y-1);}}});
Object.assign(NODEK,{
 lodge:{draw(g,n,x,y,shadow){const cl=G.cleared[n.id];shadow(11);g.save();if(cl)g.filter='grayscale(.8) brightness(.8)';ds(g,MLODGE,x+8-MLODGE.w/2,y+16-MLODGE.h);g.restore();if(!cl&&(frame>>4)&1){g.fillStyle='rgba(235,240,245,.6)';g.beginPath();g.arc(x+12,y+16-MLODGE.h-2-(frame&15)*.3,1.8,0,7);g.fill();}if(cl)mapCheck(g,x,y);}},
 peak:{draw(g,n,x,y,shadow){const cl=G.cleared[n.id];shadow(16);if(!cl)glow(g,x+8,y-8,26,`rgba(170,230,255,${.3+.1*Math.sin(frame*.06)})`);g.save();if(cl)g.filter='grayscale(.85) brightness(.8)';ds(g,MPEAK,x+8-MPEAK.w/2,y+17-MPEAK.h);g.restore();if(cl)mapCheck(g,x,y);}}});
function mapG2(NODES){const g=Array.from({length:MR},()=>Array(MC).fill('.')),path=Array.from({length:MR},()=>Array(MC).fill(0));
 for(let c=15;c<=20;c++)for(let r=5;r<=8;r++)if(!((c===15||c===20)&&(r===5||r===8)))g[r][c]='~';
 trailGrid(NODES,path);const rr=rng(2077);
 for(let r=0;r<MR;r++)for(let c=0;c<MC;c++){if(g[r][c]!=='.'||path[r][c]||nearN(NODES,c,r))continue;const v=rr();
  if(r<=1&&v<.75)g[r][c]='m';else if(v<.45)g[r][c]=rr()<.5?'P':'p';else if(v<.53)g[r][c]='b';else if(v<.6)g[r][c]='o';}
 return{g,path};}
// ---- 2-2 .. THE SUMMIT: crystal caverns, the ski lodge, the chairlift, the avalanche and Snowcat Sal ----
ES.patrol=SP('patrol',27);ES.frostbat=SP('frostbat',16);ES.bouncer=SP('bouncer',46);ES.snowcat=SP('snowcat',64);
Object.assign(ED,{patrol:{w:12,h:22},frostbat:{w:14,h:10},bouncer:{w:30,h:40},snowcat:{w:72,h:46}});
const embers=g=>{g.fillStyle='#ffcf8a';for(let i=0;i<24;i++){const x=((i*97.3+Math.sin(frame*.01+i)*14-camX*.3)%W+W)%W,y=((i*53.1-frame*.08*(1+(i%3)*.4)-camY*.2)%PH+PH)%PH;g.globalAlpha=.25+.5*Math.abs(Math.sin(frame*.03+i));g.beginPath();g.arc(x,y,.6+(i%3)*.4,0,7);g.fill();}g.globalAlpha=1;};
const flakes=(g,n,sp,wind,par,a)=>{g.fillStyle='#ffffff';for(let i=0;i<n;i++){const sz=.6+(i%4)*.4,x=((i*89.7+Math.sin(frame*.03+i)*6-frame*wind*(1+(i%3)*.3)-camX*(par+sz*.2))%W+W)%W,y=((i*41.3+frame*sp*(1+(i%5)*.2)-camY*.3)%PH+PH)%PH;g.globalAlpha=a*(.5+.1*(i%5));g.beginPath();g.arc(x,y,sz,0,7);g.fill();}g.globalAlpha=1;};
Object.assign(BGS,{
 icecave:{draw(g,dy){g.fillStyle='#0b1830';g.fillRect(0,0,W,PH);bandH(g,A.bg_icecave,-14+dy*.1,220,.14);g.fillStyle='rgba(10,24,60,.22)';g.fillRect(0,0,W,PH);},
  over(g){vign(g,80,.5);g.save();g.globalCompositeOperation='lighter';for(let i=0;i<22;i++){const x=((i*77.1-camX*.45)%W+W)%W,y=((i*31.7+Math.sin(frame*.01+i)*10-camY*.4)%PH+PH)%PH,a=Math.max(0,Math.sin(frame*.05+i*1.7));glow(g,x,y,4,`rgba(150,235,255,${.45*a})`);}g.restore();}},
 lodge:{draw(g,dy){g.fillStyle='#24140c';g.fillRect(0,0,W,PH);bandH(g,A.bg_lodge,-14+dy*.1,220,.14);g.fillStyle='rgba(40,18,6,.2)';g.fillRect(0,0,W,PH);},
  over(g){g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,140,50,${.05+.02*Math.sin(frame*.2)})`;g.fillRect(0,0,W,PH);g.restore();embers(g);vign(g,90,.5);}},
 alpine:{draw(g,dy){const sg=g.createLinearGradient(0,0,0,PH);sg.addColorStop(0,'#2f6fd0');sg.addColorStop(1,'#bfe0fa');g.fillStyle=sg;g.fillRect(0,0,W,PH);bandH(g,A.bg_alpine,-34+dy*.14,232,.06);},
  over(g){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.8;for(let i=0;i<9;i++){const x=((i*113-frame*(2+i%3)-camX*.6)%(W+80)+W+80)%(W+80)-40,y=((i*47.9-camY*.3)%PH+PH)%PH;g.beginPath();g.moveTo(x,y);g.lineTo(x+18+(i%4)*6,y);g.stroke();}flakes(g,24,.3,.6,.3,.7);}},
 blizzard:{draw(g,dy){g.fillStyle='#4a5a80';g.fillRect(0,0,W,PH);bandH(g,A.bg_blizzard,-30+dy*.1,228,.08);g.fillStyle='rgba(220,230,250,.12)';g.fillRect(0,0,W,PH);},
  over(g){flakes(g,110,1.1,1.6,.35,.9);const s=.08+.05*Math.sin(frame*.013);g.fillStyle=`rgba(235,242,255,${s})`;g.fillRect(0,0,W,PH);}},
 summit:{draw(g,dy){g.fillStyle='#0a1028';g.fillRect(0,0,W,PH);bandH(g,A.bg_summit,-24+dy*.1,224,.1);},
  over(g){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const y=26+i*14+Math.sin(frame*.012+i)*6;g.fillStyle=`rgba(${i&1?170:90},255,${i&1?220:170},${.04+.02*Math.sin(frame*.02+i*2)})`;g.beginPath();g.moveTo(0,y);for(let x=0;x<=W;x+=16)g.lineTo(x,y+Math.sin(x*.03+frame*.02+i)*8);g.lineTo(W,y+24);g.lineTo(0,y+24);g.fill();}g.restore();flakes(g,40,.5,.5,.3,.7);vign(g,100,.4);}}});
// thrown snowballs (patrol, bouncer, snowcat cannon) and snow clumps shaken loose from the summit cornice
const drawSB=(g,h,cx,cy,r)=>{g.save();g.translate(cx,cy);g.rotate(h.t*.2);g.fillStyle='#3d5a78';g.beginPath();g.arc(0,0,r+.8,0,7);g.fill();const sg=g.createRadialGradient(-r*.3,-r*.4,.5,0,0,r);sg.addColorStop(0,'#ffffff');sg.addColorStop(.7,'#e2eef8');sg.addColorStop(1,'#a9c6e0');g.fillStyle=sg;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();};
HAZK.sball={stomp:1,draw(g,h,cx,cy){drawSB(g,h,cx,cy,5);}};
HAZK.chunk={spawn:{k:'chunk',w:12,h:12,vx:0,vy:0,g:.13},roll:1,draw(g,h,cx,cy){if(h.ground){h.gone=1;dust(cx,cy+5,5);sfx('brk');return;}drawSB(g,h,cx,cy,6.5);}};
const sballAt=(e,vx,vy)=>throwHaz({k:'sball',x:e.x+e.w/2-5,y:e.y-4,vx,vy});
function drawW2(g,e){const s=ES[e.t],cx=e.x+e.w/2;let y=e.y+e.h-s.h+1,x=cx-s.w/2,fy=e.st==='dead';const o={};
 if(e.st!=='dead'){if(e.t==='patrol'){if(e.st==='aim')o.rot=-e.dir*(e.tm<18?.18:-.12);else{y-=Math.abs(Math.sin(e.tm*.2))*1.2;o.rot=Math.sin(e.tm*.2)*.05;}}
  else if(e.t==='frostbat'){y=e.y+e.h/2-s.h/2;if(e.st==='hang'){fy=true;y=e.y-2;o.rot=Math.sin(frame*.04+e.x)*.08;}else{o.sy=1+Math.sin(e.tm*.7)*.14;o.rot=Math.atan2(e.vy,Math.abs(e.vx)+.01)*(e.dir>0?1:-1)*.5;}}}
 ds(g,s,x,y,e.dir>0,fy,1,o);}
function drawBossW2(g,e,lift){const s=ES[e.t],cx=e.x+e.w/2;let y=e.y+e.h-s.h+lift;const o={};if(e.inv>0&&(frame&2))return;
 if(e.st==='walk')y-=Math.abs(Math.sin(e.tm*.12))*1.6;if(e.st==='charge'||e.st==='plow')o.rot=-e.dir*.06+Math.sin(e.tm*.6)*.015;if(e.st==='rev'){o.rot=Math.sin(e.tm*1.4)*.02;}if(e.st==='wait')o.sy=1+Math.sin(frame*.1)*.02;if((e.st==='scoop'||e.st==='cannon')&&e.tm%14<5)o.sy=.95;
 ds(g,s,cx-s.w/2,y,e.dir>0,e.st==='dead',1,o);}
const bossWait=(e,L,cd)=>{if(LV.lock!=null&&Math.abs(camX-LV.lock)<4){e.st='walk';e.tm=0;e.cd=cd;}moveBody(e,L);};
Object.assign(ENT,{
 patrol:{upd(e,L){grav(e);if(e.cd===undefined)e.cd=50+Math.random()*60;const pd=P.x+P.w/2<e.x+e.w/2?-1:1;
    if(e.st==='walk'){e.vx=e.dir*.4;if(--e.cd<=0&&Math.abs(P.x-e.x)<210&&!P.dead&&lvState==='play'&&e.ground){e.st='aim';e.tm=0;e.dir=pd;}}
    else if(e.st==='aim'){e.vx=0;e.dir=pd;if(e.tm===18){sballAt(e,clamp((P.x-e.x)/58,-2.5,2.5),-4.3);sfx('throw');}if(e.tm>36){e.st='walk';e.tm=0;e.cd=130+Math.random()*70;}}
    moveBody(e,L);if(e.hitWall)e.dir*=-1;if(e.st==='walk')edgeTurn(e,L);},draw:drawW2,stomp:stompKO},
 // frost bats hang from the cave roof until Hoss passes beneath, then swoop down and back up
 frostbat:{upd(e,L){if(e.st!=='swoop'){e.st='hang';const dx=P.x+P.w/2-(e.x+e.w/2),dy=P.y-e.y;if(Math.abs(dx)<90&&dy>8&&dy<170&&!P.dead){e.st='swoop';e.tm=0;e.dir=Math.sign(dx)||-1;e.vx=e.dir*1.6;e.vy=Math.min(4.2,Math.sqrt(2*.06*(dy+10)));sfx('throw');}}
    else{e.x+=e.vx;e.y+=e.vy;e.vy=Math.max(e.vy-.06,-1.8);if(e.tm>260)e.gone=1;}},draw:drawW2,stomp:stompKO},
 // Bernie the Bouncer (Ski Lodge mini-boss): shovels snowball sprays, belly-flop hops that send snowballs rolling both ways
 bouncer:{upd(e,L){grav(e);if(e.st==='wait'){bossWait(e,L,70);return;}if(e.inv>0)e.inv--;const pd=P.x+P.w/2<e.x+e.w/2?-1:1,rage=e.hp<=2;e.cd--;
    if(e.st==='walk'){e.dir=pd;e.vx=pd*(rage?.8:.5);if(e.cd<=0&&e.ground){e.tm=0;if(Math.random()<.5){e.st='scoop';e.vx=0;}else{e.st='hop';e.vy=-6.4;e.ground=false;e.vx=pd*1.4;}e.cd=rage?60:95;}}
    else if(e.st==='scoop'){e.vx=0;if(e.tm===20){for(const k of rage?[-1,0,1,2]:[-1,0,1])sballAt(e,e.dir*(1.5+k*.55),-4.4-k*.25);sfx('throw');}if(e.tm>44){e.st='walk';e.tm=0;}}
    else if(e.st==='hop'){if(e.ground&&e.tm>6){e.st='walk';e.tm=0;e.vx=0;shake=10;sfx('quake');dust(e.x+e.w/2,e.y+e.h,10);for(const d of[-1,1])throwHaz(Object.assign({},HAZK.snow.spawn,{x:e.x+e.w/2-7+d*20,y:e.y+e.h-15,vx:d*1.6}));}}
    moveBody(e,L);if(e.hitWall&&e.st==='walk')e.vx=0;},draw:(g,e)=>drawBossW2(g,e,3)},
 // Snowcat Sal: snow-cannon volleys, revved plow charges that shake snow off the cornice, and an avalanche horn that rolls snowballs in from the far side
 snowcat:{upd(e,L){grav(e);if(e.st==='wait'){bossWait(e,L,90);return;}if(e.inv>0)e.inv--;const pd=P.x+P.w/2<e.x+e.w/2?-1:1,rage=e.hp<=4;e.cd--;
    if(e.st==='walk'){e.dir=pd;e.vx=pd*(rage?.6:.35);if(e.tm%10===0)dust(e.x+e.w/2-e.dir*30,e.y+e.h,1);if(e.cd<=0&&e.ground){const r=Math.random();e.tm=0;e.vx=0;
      if(r<.36){e.st='cannon';e.n=rage?5:3;}else if(r<.72){e.st='rev';sfx('tink');}else{e.st='horn';e.n=rage?4:3;sfx('quake');shake=12;}e.cd=rage?65:105;}}
    else if(e.st==='cannon'){e.dir=pd;if(e.tm%15===8&&e.n>0){e.n--;sballAt(e,pd*(.7+Math.abs(P.x-e.x)/115)+(Math.random()-.5)*.7,-5.6);sfx('throw');}if(e.n<=0&&e.tm>60){e.st='walk';e.tm=0;}}
    else if(e.st==='rev'){if(e.tm%4===0)dust(e.x+e.w/2-e.dir*30,e.y+e.h,1);if(e.tm>(rage?24:36)){e.st='plow';e.tm=0;sfx('step');}}
    else if(e.st==='plow'){e.vx=e.dir*(rage?3:2.4);if(e.tm%4===0)part({k:'dust',x:e.x+(e.dir>0?e.w:0),y:e.y+e.h-6,vx:e.dir*1.5,vy:-1.5-Math.random(),g:.15,life:22});
      if(e.hitWall||e.tm>110){e.st='walk';e.tm=0;e.vx=0;shake=12;sfx('quake');for(let i=0;i<(rage?5:3);i++)throwHaz(Object.assign({},HAZK.chunk.spawn,{x:LV.lock+24+Math.random()*(W-48),y:camY-14-i*30}));}}
    else if(e.st==='horn'){e.vx=0;if(e.tm%40===20&&e.n>0){e.n--;const fromR=e.x+e.w/2<LV.lock+W/2;throwHaz(Object.assign({},HAZK.snow.spawn,{x:fromR?LV.lock+W-16:LV.lock+2,y:16*T-8,vx:(fromR?-1:1)*(rage?1.9:1.5)}));sfx('pipe');}if(e.n<=0&&e.tm>70){e.st='walk';e.tm=0;}}
    moveBody(e,L);},draw:(g,e)=>drawBossW2(g,e,4)}});
defWorld({id:2,name:'FROSTBITE PEAKS',overBg:'bg_snow',
 art:["bg_snow", "bg_snowmid", "snowdirt", "snow", "goat", "boarder", "icicle", "sbush", "snowman", "map_spine", "map_smtn", "map_irock", "map_lodge", "map_peak", "bg_icecave", "bg_lodge", "bg_alpine", "bg_blizzard", "bg_summit", "icetex", "plank", "patrol", "frostbat", "bouncer", "snowcat", "ending2"],
 songs:{snow:{bpm:156,lead:'D5 . F#5 . A5 - F#5 . B5 . A5 . F#5 - D5 . E5 . G5 . B5 - A5 . G5 . F#5 . E5 - - . D5 . F#5 . A5 - D6 . C#6 . A5 . B5 - G5 . A5 . F#5 . E5 . G5 . F#5 . D5 - - - . . A4 .',bass:'D3 . A3 . D3 . A3 . G2 . D3 . G2 . D3 . E2 . B2 . E2 . B2 . A2 . E3 . A2 . C#3 . D3 . A3 . D3 . A3 . B2 . F#3 . B2 . F#3 . G2 . D3 . A2 . E3 . D3 . A3 . D3 . A2 .',drum:'k . h h s . h .'},
 icecave:{bpm:112,lead:'E5 - G5 - B5 - - . A5 - G5 - E5 - - . D5 - E5 - G5 - - . F#5 - D5 - B4 - - . E5 - G5 - B5 - D6 - C6 - B5 - A5 - - . G5 - F#5 - G5 - E5 - - - . . . .',bass:'E2 - - - B2 - - - C3 - - - G2 - - - A2 - - - E2 - - - B2 - - - B2 - - -',drum:'k . . h . . s . . h . .'},
 lodge:{bpm:126,lead:'G4 . B4 . D5 . G5 - F#5 . E5 . D5 - B4 . C5 . E5 . G5 - E5 . D5 . C5 . B4 - - . G4 . B4 . D5 . G5 - A5 . B5 . A5 . G5 . F#5 . A5 . G5 - - - . .',bass:'G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . D3 . A3 . D3 . A3 . G2 . D3 . G2 . G2 .',drum:'k . s . k k s .'},
 alpine:{bpm:144,lead:'A5 . E5 . A5 . C#6 - B5 . A5 . E5 - F#5 . A5 . B5 . E5 - - . A5 . E5 . A5 . C#6 - E6 . D6 . C#6 . B5 . A5 . B5 . A5 - - - . . E5 .',bass:'A2 . E3 . A2 . E3 . D3 . A3 . D3 . A3 . F#2 . C#3 . E2 . B2 . A2 . E3 . A2 . A2 .',drum:'k . h h s . h .'},
 avalanche:{bpm:172,lead:'E5 E5 . G5 . E5 . B5 - A5 . G5 . F#5 . E5 - . D5 . E5 . G5 . A5 - B5 . A5 . G5 . F#5 - - . E5 E5 . G5 . E5 . B5 - D6 . C6 . B5 . A5 . G5 . A5 . B5 - - - . .',bass:'E2 E2 . E3 . E2 . E3 . C3 C3 . C3 . D3 D3 . D3 . E2 E2 . E3 . E2 . B2 .',drum:'k h s h k k s h'},
 summit:{bpm:140,lead:'D5 . A4 . D5 . F5 - E5 . D5 . C5 . A4 - . D5 . F5 . A5 - G5 . F5 . E5 - - . D5 . A4 . D5 . F5 - A5 . C6 . A5 . G5 . F5 . E5 . D5 - - - . .',bass:'D3 . D3 . A2 . A2 . A#2 . A#2 . C3 . C3 . D3 . D3 . F2 . F2 . A2 . A2 . D3 . D3 .',drum:'k . s . k . s h'}},
 map:{tex:'snow',fill:'#e2ecf5',shadow:'rgba(40,62,96,.3)',vign:'rgba(30,50,90,.3)',shore:'#f6fafd',water:['#d2eefa','#86bfe0'],nameCol:'#bfe6ff',saved:['peak','THE PEAKS ARE FREE!'],gen:mapG2,
  props:{P:SP('map_spine',23),p:SP('map_spine',18),b:SP('sbush',10),o:SP('map_irock',11),m:SP('map_smtn',27)}},
 nodes:[
 {id:'back',n:'BACK TO BIGFOOT VALLEY',c:1,r:8,k:'warp',to:1,at:'w2',sign:['W1','#c8f08a','#5fae36']},
 {id:'2-1',n:'2-1 SNOWDRIFT SLOPES',c:1,r:4,k:'lvl',num:1,lvl:1},
 {id:'2-2',n:'2-2 CRYSTAL CAVERN',c:6,r:4,k:'lvl',num:2,lvl:1},
 {id:'lodge',n:'THE SKI LODGE',c:6,r:7,k:'lodge',lvl:1,done:'THE LODGE IS CLOSED FOR THE SEASON'},
 {id:'2-3',n:'2-3 CHAIRLIFT CLIMB',c:12,r:7,k:'lvl',num:3,lvl:1},
 {id:'2-4',n:'2-4 AVALANCHE RUN',c:12,r:2,k:'lvl',num:4,lvl:1},
 {id:'peak',n:'THE SUMMIT',c:19,r:2,k:'peak',lvl:1,big:1},
 {id:'w3',n:'TO REDWOOD GIANTS',c:22,r:2,k:'warp',to:3,at:'back',glow:'peak',sign:['W3','#ffd0a0','#b8582a']}],
 ending:{img:'ending2',title:'WORLD 2 CLEAR!',lines:['SNOWCAT SAL SPUN OUT ON THE SUMMIT','FROSTBITE PEAKS ARE WILD AGAIN']},
 levels:{
"2-1":{name:'SNOWDRIFT SLOPES',areas:{
  main:{
   "bg":"snow","song":"snow","goalX":206,"edge":1,"start":{"x":48,"y":272},"theme":"snow",
   spawns:[["goat",27,17],["goat",58,14],["boarder",75,17],["boarder",83,17],["icicle",88,12,{"st":"hang","imm":1}],["icicle",91,12,{"st":"hang","imm":1}],["icicle",94,12,{"st":"hang","imm":1}],["icicle",97,12,{"st":"hang","imm":1}],["boarder",106,17],["goat",122,17],["goat",131,17],["goat",148,12],["goat",161,17],["boarder",167,17],["boarder",183,17]],
   cont:{"12,13":"coin","16,13":"power","18,13":"coin","16,9":"coin","58,10":"power","126,13":"feather","134,12":"acorn","178,13":"coin","180,13":"power"},
   items0:[{"t":"cast","i":0,"x":1473,"y":112},{"t":"cast","i":1,"x":1769,"y":128},{"t":"cast","i":2,"x":2745,"y":192}],
   gens:[{"x":992,"y":210,"cd":40,"every":160},{"x":2400,"y":178,"cd":20,"every":170}],
   deco:[{"k":"sbush","x":34,"y":272},{"k":"sbush","x":117,"y":272},{"k":"sbush","x":161,"y":272},{"k":"sbush","x":261,"y":272},{"k":"snowman","x":337,"y":272},{"k":"sbush","x":420,"y":272},{"k":"snowman","x":679,"y":272},{"k":"snowman","x":1077,"y":272},{"k":"snowman","x":1156,"y":272},{"k":"sbush","x":1205,"y":272},{"k":"sbush","x":1366,"y":272},{"k":"sbush","x":1461,"y":272},{"k":"sbush","x":1552,"y":272},{"k":"snowman","x":1890,"y":272},{"k":"sbush","x":1984,"y":272},{"k":"snowman","x":2055,"y":272},{"k":"sbush","x":2135,"y":272},{"k":"snowman","x":2449,"y":272},{"k":"sbush","x":2819,"y":272},{"k":"snowman","x":2900,"y":272},{"k":"sbush","x":2996,"y":272},{"k":"sbush","x":3168,"y":272}],
   grid:String.raw`
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
................?......................................................................C.C.C.C.C.C..................................................................................................................
..........................................................?...........................IIIIIIIIIIIII..........CCCC...................................................................................S...............
...................................................................................................................................................................................................SS...............
.............................................CCCC.............................................................II......................H.........ISSSSSS...........................................SSS...............
............?..R?R?.........................C....C...........................................................................R?R...............IISSSSSS...........................?R?............SSSS...............
...............................C.C.C.C................/GGGGGGGG\..................SS.................II.......................................IIISSSSSS.....C.C.C.C.C.C.C.......................SSSSS...............
...................................................../GGGGGGGGGG\.................SS.........................................................IIIISSSSSS........................................SSSSSS...............
..................................................../GGGGGGGGGGGG\................SS........................................................IIIIISSSSSS.......................................SSSSSSS...............
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGIIIIIIIIIIGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGIIIIIIIIIIIIIIG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "2-2":{"name":"CRYSTAL CAVERN",areas:{
  main:{
   "bg":"icecave",
   "song":"icecave",
   "goalX":194,
   "start":{"x":48,"y":272},
   "theme":"snow",
   "tex":"icetex",
   "spawns":[["icicle",17,6,{"st":"hang","imm":1}],["icicle",19,6,{"st":"hang","imm":1}],["icicle",21,6,{"st":"hang","imm":1}],["goat",22,17],["frostbat",33,3,{"st":"hang"}],["goat",44,17],["patrol",58,17],["frostbat",63,3,{"st":"hang"}],["icicle",78,7,{"st":"hang","imm":1}],["icicle",80,7,{"st":"hang","imm":1}],["icicle",82,7,{"st":"hang","imm":1}],["goat",86,17],["frostbat",90,3,{"st":"hang"}],["patrol",93,14],["goat",110,17],["goat",116,17],["frostbat",107,3,{"st":"hang"}],["frostbat",115,3,{"st":"hang"}],["patrol",133,17],["frostbat",145,3,{"st":"hang"}],["icicle",151,6,{"st":"hang","imm":1}],["icicle",153,6,{"st":"hang","imm":1}],["goat",157,17],["patrol",166,17],["frostbat",174,3,{"st":"hang"}],["goat",188,17]],
   "cont":{"9,13":"coin","11,13":"power","70,13":"feather","74,13":"coins10","136,13":"power","160,13":"coin","162,13":"acorn"},
   "items0":[{"t":"cast","i":0,"x":1009,"y":144},{"t":"cast","i":1,"x":1985,"y":176},{"t":"cast","i":2,"x":2721,"y":144}],
   "deco":[{"k":"sbush","x":64,"y":272},{"k":"sbush","x":496,"y":272},{"k":"sbush","x":1072,"y":272},{"k":"sbush","x":1616,"y":272},{"k":"sbush","x":2224,"y":272},{"k":"sbush","x":2528,"y":272},{"k":"sbush","x":3072,"y":272},{"k":"sbush","x":3184,"y":272}],
   grid:String.raw`
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
................XXXXXXX.................................XXXXX................XXXXXXX.....................................XXXXXXXX.....................XXXXX.................................................
................XXXXXXX.................................XXXXX................XXXXXXX.....................................XXXXXXXX.....................XXXXX.................................................
................XXXXXXX.................................XXXXX................XXXXXXX.....................................XXXXXXXX.....................XXXXX.................................................
........................................................XXXXX................XXXXXXX.....................................XXXXXXXX...........................................................................
........................................................XXXXX............................................................XXXXXXXX...........................................................................
........................................................XXXXX............................................................XXXXXXXX...........................................................................
........................................................XXXXX............................................................XXXXXXXX...........................................................................
..........C.C...........................................XXXXX...............................................................................................................................................
............................................................................................................................................................................................................
.............................................................IIII......................................................................................................................XX...................
......................................C.C.C.C.C.C.C................................................IIII.........................................III...................................XXX...................
.........?R?R............IIII........................................R?R..H.............................C.C.C.C.C.C.C....CCCCCCCC.......?.......................?R?......XXX.........XXXX...................
......................................................XX....................................XXX..........................XXXXXXXX............III.........................XXX........XXXXX...................
......................................................XX....................................XXX..........................XXXXXXXX........................................XXX.......XXXXXX...................
......................................................XX....................................XXX..........................XXXXXXXX........................................XXX......XXXXXXX...................
GGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGIIIIIIIIIIIIIIIIIGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....IIIIIIIIIIIIIIIIGGGGGGGGGGGGGGGGGGGGGG......GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG......GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "lodge":{"name":"THE SKI LODGE","card":"THE LODGE",clr:()=>({title:'LODGE CLEARED!',sub:'BERNIE HUNG UP HIS SHOVEL'}),areas:{
  main:{
   "bg":"lodge",
   "song":"lodge",
   "tex":"plank",
   "arena":126,
   "start":{"x":32,"y":272},
   "spawns":[["patrol",14,17],{"t":"crusher","x":393,"y":128,"o":{"imm":1,"st":"idle"}},["boarder",40,17],{"t":"crusher","x":697,"y":128,"o":{"imm":1,"st":"idle"}},["patrol",54,13],{"t":"crusher","x":1209,"y":128,"o":{"imm":1,"st":"idle"}},{"t":"crusher","x":1273,"y":128,"o":{"imm":1,"st":"idle"}},["patrol",86,17],["boarder",100,17],{"t":"crusher","x":1721,"y":128,"o":{"imm":1,"st":"idle"}},["patrol",112,17],{"t":"bouncer","x":2240,"y":232,"o":{"boss":1,"st":"wait","hp":6,"mhp":6,"name":"BERNIE THE BOUNCER","inv":0}}],
   "cont":{"6,13":"coin","8,13":"power","50,13":"feather","104,13":"coins10","119,13":"power"},
   "items0":[{"t":"cast","i":0,"x":1073,"y":160},{"t":"cast","i":1,"x":1489,"y":144},{"t":"cast","i":2,"x":1841,"y":160}],
   "lifts":[{"x":480,"y":240,"w":32,"k":"fall","a":0,"x0":480,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1008,"y":240,"w":32,"k":"fall","a":0,"x0":1008,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1072,"y":224,"w":32,"k":"fall","a":0,"x0":1072,"y0":224,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "gens":[{"x":960,"y":242,"cd":60,"every":180}],
   "deco":[{"k":"fire","x":160,"y":272},{"k":"fire","x":592,"y":272},{"k":"fire","x":1344,"y":272},{"k":"fire","x":1952,"y":272}],
   grid:String.raw`
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
..........................................................................................C.C.C.C.....................................................
......?R?......................................RRR?RRSSSS.................................SSSSSSS.......H..............?.........LLLL..........LLLL...
...................SSS...............................SSSS.................................SSSSSSS.....................................................
...................SSS...............................SSSS.................................SSSSSSS.....................................................
...................SSS...............................SSSS.................................SSSSSSS.....................................................
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
`}}},
 "2-3":{"name":"CHAIRLIFT CLIMB",areas:{
  main:{
   "bg":"alpine",
   "song":"alpine",
   "goalX":202,
   "edge":1,
   "start":{"x":48,"y":272},
   "theme":"snow",
   "spawns":[["patrol",26,15],["goat",45,13],["boarder",76,14],["patrol",79,14],["goat",97,13],["patrol",121,12],["boarder",140,15],["goat",144,15],["patrol",159,12],["goat",174,15],["patrol",199,17]],
   "cont":{"6,13":"power","8,13":"coin","41,9":"feather","120,8":"coins10","133,11":"coin","135,11":"power","137,11":"coin"},
   "items0":[{"t":"cast","i":0,"x":1169,"y":32},{"t":"cast","i":1,"x":1953,"y":112},{"t":"cast","i":2,"x":2673,"y":128}],
   "lifts":[{"x":224,"y":240,"w":48,"k":"h","a":48,"x0":224,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":480,"y":208,"w":48,"k":"h","a":48,"x0":480,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":784,"y":224,"w":32,"k":"v","a":64,"x0":784,"y0":224,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":928,"y":208,"w":48,"k":"h","a":64,"x0":928,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1312,"y":192,"w":32,"k":"fall","a":0,"x0":1312,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1376,"y":176,"w":32,"k":"fall","a":0,"x0":1376,"y0":176,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1440,"y":192,"w":32,"k":"fall","a":0,"x0":1440,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1616,"y":208,"w":48,"k":"h","a":64,"x0":1616,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1760,"y":176,"w":48,"k":"h","a":48,"x0":1760,"y0":176,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2016,"y":208,"w":32,"k":"v","a":80,"x0":2016,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2368,"y":224,"w":48,"k":"h","a":64,"x0":2368,"y0":224,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2608,"y":192,"w":32,"k":"fall","a":0,"x0":2608,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2672,"y":208,"w":32,"k":"fall","a":0,"x0":2672,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2848,"y":240,"w":48,"k":"h","a":32,"x0":2848,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "gens":[{"x":1280,"y":194,"cd":50,"every":170},{"x":2336,"y":210,"cd":30,"every":160}],
   "deco":[{"k":"sbush","x":32,"y":272},{"k":"sbush","x":160,"y":272},{"k":"sbush","x":384,"y":240},{"k":"sbush","x":688,"y":208},{"k":"sbush","x":1120,"y":224},{"k":"sbush","x":2144,"y":240},{"k":"sbush","x":2992,"y":272},{"k":"sbush","x":3296,"y":272},{"k":"snowman","x":2112,"y":240}],
   grid:String.raw`
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
...................................................................C.C.C.C..........................................................................................................................................
..................................................................cccccccc..........................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
........................................................................................................................H...........................................................................................
...............................C.C.C....R?R.........................................................................................................................................................................
....................................................................................................................................................................................................................
.....................................................................................................................................?R?R?........................................................SS................
.....................................................................................................................GGGGGGGG................................GGGGG...............................SSS................
......?R?.............................GGGGGGGGGG..............................................GGGGGG.................GGGGGGGG................................GGGGG..............................SSSS................
......................................GGGGGGGGGG...................GGGGGGGGGGGGGG.............GGGGGG.................GGGGGGGG................................GGGGG.............................SSSSS................
......................GGGGGGG.........GGGGGGGGGG...................GGGGGGGGGGGGGG.............GGGGGG.................GGGGGGGG.....GGGGGGGGGGGGGGGGG..........GGGGG.........GGGGGG.............SSSSSS................
......................GGGGGGG.........GGGGGGGGGG.....GGGG..........GGGGGGGGGGGGGG.............GGGGGG.................GGGGGGGG.....GGGGGGGGGGGGGGGGG..........GGGGG.........GGGGGG............SSSSSSS................
GGGGGGGGGGGGG.........GGGGGGG.........GGGGGGGGGG.....GGGG..........GGGGGGGGGGGGGG.............GGGGGG.................GGGGGGGG.....GGGGGGGGGGGGGGGGG..........GGGGG.........GGGGGG........GGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGG.........GGGGGGG.........GGGGGGGGGG.....GGGG..........GGGGGGGGGGGGGG.............GGGGGG.................GGGGGGGG.....GGGGGGGGGGGGGGGGG..........GGGGG.........GGGGGG........GGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "2-4":{"name":"AVALANCHE RUN",areas:{
  main:{
   "bg":"blizzard",
   "song":"avalanche",
   "auto":0.6,
   "goalX":206,
   "start":{"x":48,"y":272},
   "theme":"snow",
   "spawns":[["boarder",24,17],["icicle",55,14,{"st":"hang","imm":1}],["icicle",58,14,{"st":"hang","imm":1}],["goat",66,17],["boarder",88,17],["boarder",96,17],["patrol",105,14],["goat",134,17],["icicle",131,13,{"st":"hang","imm":1}],["icicle",134,13,{"st":"hang","imm":1}],["boarder",160,17],["patrol",172,13],["goat",180,17]],
   "cont":{"10,13":"power","12,13":"coin","57,8":"feather","110,12":"coins10","163,13":"power"},
   "items0":[{"t":"cast","i":0,"x":1153,"y":176},{"t":"cast","i":1,"x":2129,"y":112},{"t":"cast","i":2,"x":2849,"y":160}],
   "gens":[{"x":480,"y":242,"cd":10,"every":150},{"x":960,"y":242,"cd":30,"every":140},{"x":1600,"y":242,"cd":20,"every":120},{"x":2240,"y":242,"cd":40,"every":110},{"x":2960,"y":242,"cd":20,"every":130}],
   "deco":[{"k":"sbush","x":48,"y":272},{"k":"sbush","x":336,"y":272},{"k":"sbush","x":656,"y":272},{"k":"sbush","x":1232,"y":272},{"k":"sbush","x":1904,"y":272},{"k":"sbush","x":2512,"y":272},{"k":"sbush","x":3280,"y":272},{"k":"sbush","x":3376,"y":272},{"k":"snowman","x":256,"y":272},{"k":"snowman","x":2320,"y":272}],
   grid:String.raw`
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
.........................................................?..............................................................................................................................................................
........................................................................................................................................................................................................................
........................................................................................................................................................................................................................
..............................................CCCCC...............................................................................SSSSSSS.............................................................SS................
......................................................SSSSSSS.................................................H.................................................................C.C.C................SSS................
..........?R?..........................................................IIII.........C.C.C.C.C.C..................III..............................................R?R......SSS......................SSSS................
...................................III......../GGG\.....................................................SSS............................................III.................SSS.....................SSSSS................
............................................./GGGGG\....................................................SSS................./GGGG\......................................SSSSSS....................SSSSSS................
............................................/GGGGGGG\...................................................SSS................/GGGGGG\.....................................SSSSSS...................SSSSSSS................
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGIIIIIIIIIIIIIIIIGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "peak":{"name":"THE SUMMIT","card":"FINAL STAGE","ending":1,clr:()=>({title:'SNOWCAT STALLED!',sub:'THE PEAKS ARE FREE'}),areas:{
  main:{
   "bg":"summit",
   "song":"summit",
   "theme":"snow",
   "arena":126,
   "start":{"x":32,"y":272},
   "spawns":[["patrol",15,17],["goat",24,17],["boarder",40,17],["icicle",45,14,{"st":"hang","imm":1}],["icicle",49,14,{"st":"hang","imm":1}],["patrol",56,17],["patrol",72,13],["goat",80,17],["boarder",100,17],["patrol",108,17],{"t":"snowcat","x":2208,"y":226,"o":{"boss":1,"st":"wait","hp":10,"mhp":10,"name":"SNOWCAT SAL","inv":0}}],
   "cont":{"6,13":"power","8,13":"coin","47,8":"feather","90,13":"power","92,13":"coins10","119,13":"power"},
   "items0":[{"t":"cast","i":0,"x":753,"y":96},{"t":"cast","i":1,"x":1153,"y":144},{"t":"cast","i":2,"x":1793,"y":160}],
   "lifts":[{"x":432,"y":240,"w":48,"k":"h","a":16,"x0":432,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":944,"y":240,"w":32,"k":"fall","a":0,"x0":944,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "gens":[{"x":866,"y":4,"cd":30,"every":140,"k":"chunk"},{"x":1376,"y":242,"cd":30,"every":150},{"x":1666,"y":4,"cd":50,"every":120,"k":"chunk"}],
   "deco":[{"k":"sbush","x":48,"y":272},{"k":"sbush","x":352,"y":272},{"k":"sbush","x":608,"y":272},{"k":"sbush","x":1056,"y":272},{"k":"sbush","x":1568,"y":272},{"k":"sbush","x":1952,"y":272},{"k":"snowman","x":192,"y":272}],
   grid:String.raw`
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
...............................................?......................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
............................................SSSSSSS...................................................................................................
......?R?..............................................................SSS................?R?..........................?.........LLLL..........LLLL...
...................SS..................................................SSS............................................................................
...................SS...............................................SSSSSS............................................................................
...................SS...............................................SSSSSS............................................................................
GGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGIIIIIIIIIIIIGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}}}});
