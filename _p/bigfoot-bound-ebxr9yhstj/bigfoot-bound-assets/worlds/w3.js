'use strict';
// ================= WORLD 3 - REDWOOD GIANTS =================
// Generated from levels authored in w3build.py (session tooling); edit freely - it is plain data + registries.
const STUMP=SP('stump',26),RSHROOM=SP('shroom',15),MTOWER=SP('map_tower',30),MRBOSS=SP('map_rboss',44);
ES.ranger=SP('ranger',27);ES.pecker=SP('pecker',16);ES.squirrel=SP('squirrel',19);ES.chief=SP('chief',80);
Object.assign(ED,{ranger:{w:12,h:22},pecker:{w:16,h:11},squirrel:{w:12,h:15},chief:{w:44,h:50}});
// mossy top lip: the grass lip, tinted deeper and warmer for the redwood floor
const RTOP=(()=>{const c=document.createElement('canvas');c.width=GTOP.width;c.height=GTOP.height;const g=c.getContext('2d');g.filter='hue-rotate(-14deg) saturate(.8) brightness(.86)';g.drawImage(GTOP,0,0);return c;})();
THEMES.redwood={dirt:'rwdirt',top:RTOP,slope:['#2a1a0c','#5f8f34','#a9d06a']};
const motes=(g,n,col,sp,par)=>{g.fillStyle=col;for(let i=0;i<n;i++){const x=((i*97.3+Math.sin(frame*.01+i)*14-camX*par)%W+W)%W,y=((i*53.1+frame*sp*(1+(i%3)*.4)-camY*.2)%PH+PH)%PH;g.globalAlpha=.25+.5*Math.abs(Math.sin(frame*.03+i));g.beginPath();g.arc(x,y,.6+(i%3)*.4,0,7);g.fill();}g.globalAlpha=1;};
Object.assign(BGS,{
 redwood:{draw(g,dy){const sg=g.createLinearGradient(0,0,0,PH);sg.addColorStop(0,'#c98a4e');sg.addColorStop(1,'#f3dcae');g.fillStyle=sg;g.fillRect(0,0,W,PH);bandH(g,A.bg_redwood,-34+dy*.08,232,.06);
   g.save();g.globalAlpha=.5;bandH(g,A.bg_redwoodmid,PH-124+dy*.3,72,.2);g.restore();const hz=g.createLinearGradient(0,60,0,PH);hz.addColorStop(0,'rgba(250,225,170,0)');hz.addColorStop(1,'rgba(245,215,160,.4)');g.fillStyle=hz;g.fillRect(0,60,W,PH-60);
   bandH(g,A.bg_redwoodmid,PH-112+dy*.5,112,.42);},
  over(g){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const x=((i*131-camX*.15)%(W+120)+W+120)%(W+120)-60,a=.05+.03*Math.sin(frame*.01+i*2);const gr=g.createLinearGradient(x,0,x-50,PH);gr.addColorStop(0,`rgba(255,230,160,${a})`);gr.addColorStop(1,'rgba(255,230,160,0)');g.fillStyle=gr;g.beginPath();g.moveTo(x-8,0);g.lineTo(x+14,0);g.lineTo(x-34,PH);g.lineTo(x-70,PH);g.fill();}g.restore();motes(g,40,'#ffe6a8',.12,.3);}},
 canopy3:{draw(g,dy){g.fillStyle='#8cc8ec';g.fillRect(0,0,W,PH);bandH(g,A.bg_canopy3,-34+dy*.14,232,.06);},
  over(g){for(let i=0;i<14;i++){const x=((i*71.7-frame*.4-camX*.4)%W+W)%W,y=((i*37+frame*(.4+(i%4)*.1)-camY*.3)%PH+PH)%PH;g.save();g.translate(x,y);g.rotate(frame*.03+i);g.fillStyle=i&1?'#6fa83a':'#9bc456';g.beginPath();g.ellipse(0,0,2.6,1.1,0,0,7);g.fill();g.restore();}}},
 hollow:{draw(g,dy){g.fillStyle='#0c0a10';g.fillRect(0,0,W,PH);bandH(g,A.bg_hollow,-12+dy*.1,216,.15);g.fillStyle='rgba(12,6,18,.25)';g.fillRect(0,0,W,PH);},
  over(g){vign(g,70,.55);g.save();g.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const x=((i*83.3+Math.sin(frame*.015+i)*20-camX*.5)%W+W)%W,y=((i*29.7+Math.cos(frame*.012+i)*14-camY*.4)%PH+PH)%PH;glow(g,x,y,5,`rgba(140,255,200,${.25+.2*Math.sin(frame*.07+i)})`);}g.restore();}},
 rboss:{draw(g,dy){g.fillStyle='#2a1530';g.fillRect(0,0,W,PH);bandH(g,A.bg_rboss,-20+dy*.1,222,.12);},
  over(g){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<26;i++){const x=((i*61.1+Math.sin(frame*.02+i)*10-camX*.3)%W+W)%W,y=PH-(((i*47+frame*(.4+(i%5)*.12))%(PH+20)));g.fillStyle=`rgba(255,${120+(i%4)*30},60,${.5+.3*Math.sin(frame*.1+i)})`;g.fillRect(x,y,1.2,1.2);}g.restore();vign(g,90,.45);}}});
DECO.stump=decoSp(STUMP,16);
DECO.rshroom=(g,d)=>{glow(g,d.x+8,d.y-7,18,`rgba(110,255,210,${.24+.08*Math.sin(frame*.05+d.x)})`);decoSp(RSHROOM,8)(g,d);};
// pinecones: thrown by squirrels / the Chief (arc), or dropped from the canopy by L.gens (k:'drop')
const drawCone=(g,h,cx,cy)=>{const s=IS.cone;g.save();g.translate(cx,cy);g.rotate(h.t*.25*Math.sign(h.vx||1));ds(g,s,-s.w*.4,-s.h*.4,false,false,.8);g.restore();};
HAZK.pcone={draw:drawCone};
HAZK.drop={spawn:{k:'drop',w:10,h:10,vx:0,vy:0,g:.14},roll:1,draw(g,h,cx,cy){if(h.ground){h.gone=1;dust(cx,cy+4,4);return;}drawCone(g,h,cx,cy);}};
function drawW3(g,e){const s=ES[e.t],cx=e.x+e.w/2;let y=e.y+e.h-s.h+1,x=cx-s.w/2;const o={};
 if(e.st!=='dead'){if(e.t==='ranger'){y-=Math.abs(Math.sin(e.tm*(e.st==='lunge'?.4:.2)))*1.3;o.rot=e.st==='lunge'?e.dir*.18:Math.sin(e.tm*.2)*.05;}
  else if(e.t==='pecker'){y=e.y+e.h/2-s.h/2;o.rot=e.st==='dive'?Math.atan2(e.vy,Math.abs(e.vx)+.01)*(e.dir>0?1:-1)*.7:Math.sin(e.tm*.3)*.08;o.sy=1+Math.sin(e.tm*.6)*.06;}
  else if(e.t==='squirrel'){if(e.throwT>0)o.rot=-e.dir*.2;else o.sy=1+Math.sin(e.tm*.15)*.03;}}
 ds(g,s,x,y,e.dir>0,e.st==='dead',1,o);}
Object.assign(ENT,{
 ranger:{upd(e,L){grav(e);const pd=P.x+P.w/2<e.x+e.w/2?-1:1,near=Math.abs(P.x-e.x)<72&&Math.abs(P.y+P.h-e.y-e.h)<30;
    if(e.st==='walk'){e.vx=e.dir*.45;if(near&&e.tm>70&&e.ground&&!P.dead){e.st='lunge';e.tm=0;e.dir=pd;e.vy=-2.6;e.ground=false;sfx('tink');}}
    else if(e.st==='lunge'){e.vx=e.dir*1.9;if(e.ground&&e.tm>8){e.st='walk';e.tm=0;}}
    moveBody(e,L);if(e.hitWall)e.dir*=-1;if(L.edge&&e.st==='walk')edgeTurn(e,L);},draw:drawW3,stomp:stompKO},
 pecker:{upd(e,L){if(e.x0===undefined){e.x0=e.x;e.y0=e.y;}
    if(e.st==='walk'){e.x+=e.dir*.6;if(Math.abs(e.x-e.x0)>48)e.dir=e.x>e.x0?-1:1;e.y=e.y0+Math.sin(e.tm*.08)*4;
     const dx=P.x+P.w/2-(e.x+e.w/2),dy=P.y-e.y;if(dy>12&&dy<150&&Math.abs(dx)<dy*.7&&e.tm>50&&!P.dead){const d=Math.hypot(dx,dy);e.st='dive';e.tm=0;e.vx=dx/d*2.7;e.vy=dy/d*2.7;e.dir=Math.sign(dx)||e.dir;sfx('throw');}}
    else if(e.st==='dive'){e.x+=e.vx;e.y+=e.vy;if(SOL.has(tile(L,Math.floor((e.x+e.w/2)/T),Math.floor((e.y+e.h)/T)))||e.tm>70){e.st='rise';e.tm=0;dust(e.x+e.w/2,e.y+e.h,3);}}
    else if(e.st==='rise'){e.y-=1.1;e.x+=Math.sign(e.x0-e.x)*.4;if(e.y<=e.y0){e.y=e.y0;e.st='walk';e.tm=0;}}},draw:drawW3,stomp:stompKO},
 squirrel:{upd(e,L){grav(e);e.vx=0;e.dir=P.x<e.x?-1:1;if(e.cd===undefined)e.cd=50+Math.random()*60;if(e.throwT>0)e.throwT--;
    if(--e.cd<=0&&Math.abs(P.x-e.x)<230&&!P.dead&&lvState==='play'){const dx=P.x-e.x;throwHaz({k:'pcone',x:e.x+e.w/2-5,y:e.y-4,vx:clamp(dx/55,-2.6,2.6),vy:-4.3});e.cd=120+Math.random()*60;e.throwT=14;sfx('throw');}
    if(e.ground&&e.tm%95===0){e.vy=-2.2;e.ground=false;}moveBody(e,L);},draw:drawW3,stomp:stompKO},
 // Chief Ranger Rick's walking lookout tower: pinecone volleys, quake stomps that shake cones out of the canopy, searchlight charge
 chief:{upd(e,L){grav(e);if(e.st==='wait'){if(LV.lock!=null&&Math.abs(camX-LV.lock)<4){e.st='walk';e.tm=0;e.cd=90;}moveBody(e,L);return;}
    if(e.inv>0)e.inv--;const pd=P.x+P.w/2<e.x+e.w/2?-1:1,rage=e.hp<=4;e.cd--;
    if(e.st==='walk'){e.dir=pd;e.vx=pd*(rage?.7:.4);if(e.cd<=0&&e.ground){const r=Math.random();e.tm=0;
      if(r<.38){e.st='volley';e.n=rage?4:3;e.vx=0;}else if(r<.72){e.st='stomp';e.vy=-6.8;e.ground=false;e.vx=pd*1.3;}else{e.st='light';e.vx=0;sfx('tink');}e.cd=rage?70:110;}}
    else if(e.st==='volley'){e.vx=0;e.dir=pd;if(e.tm%16===8&&e.n>0){e.n--;throwHaz({k:'pcone',x:e.x+e.w/2-5,y:e.y+2,vx:pd*(.8+Math.abs(P.x-e.x)/110)+(Math.random()-.5)*.6,vy:-5.2});sfx('throw');}if(e.n<=0&&e.tm>64)e.st='walk';}
    else if(e.st==='stomp'){if(e.ground&&e.tm>6){e.st='walk';e.vx=0;shake=14;sfx('quake');dust(e.x+e.w/2,e.y+e.h,12);
      for(let i=0;i<(rage?5:3);i++)throwHaz({k:'drop',x:(LV.lock||camX)+24+Math.random()*(W-48),y:camY-12-i*34,w:10,h:10,vx:0,vy:0,g:.12});}}
    else if(e.st==='light'){e.vx=0;e.dir=pd;if(e.tm>(rage?36:54)){e.st='charge';e.tm=0;sfx('step');}}
    else if(e.st==='charge'){e.vx=e.dir*(rage?2.6:2);if(e.tm%6===0)dust(e.x+e.w/2-e.dir*14,e.y+e.h,1);if(e.hitWall||e.tm>100){e.st='walk';e.tm=0;e.vx=0;shake=Math.max(shake,6);sfx('bump');}}
    moveBody(e,L);},
  draw(g,e){const s=ES.chief,cx=e.x+e.w/2;let y=e.y+e.h-s.h+3;const o={};
    if(e.st==='light'&&!P.dead){const lx=cx+e.dir*12,ly=y+18,tx=P.x+P.w/2,ty=P.y+P.h/2,a=Math.atan2(ty-ly,tx-lx),d=Math.hypot(tx-lx,ty-ly)+20;
     g.save();g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,240,170,${.18+.08*Math.sin(frame*.5)})`;g.beginPath();g.moveTo(lx,ly);g.lineTo(lx+Math.cos(a-.14)*d,ly+Math.sin(a-.14)*d);g.lineTo(lx+Math.cos(a+.14)*d,ly+Math.sin(a+.14)*d);g.fill();glow(g,lx,ly,10,'rgba(255,240,170,.6)');g.restore();}
    if(e.inv>0&&(frame&2))return;
    if(e.st==='walk')y-=Math.abs(Math.sin(e.tm*.1))*2;if(e.st==='charge')o.rot=-e.dir*.08;if(e.st==='wait')o.sy=1+Math.sin(frame*.1)*.02;if(e.st==='volley'&&e.tm%16<6)o.sy=.96;
    ds(g,s,cx-s.w/2,y,e.dir>0,e.st==='dead',1,o);}}});
Object.assign(NODEK,{
 rboss:{draw(g,n,x,y,shadow){shadow(16);g.save();if(G.cleared[n.id])g.filter='grayscale(.85) brightness(.8)';else{const a=Math.sin(frame*.03)*.6-1.57;g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,90,60,.22)';g.beginPath();g.moveTo(x+8,y-22);g.lineTo(x+8+Math.cos(a-.2)*40,y-22+Math.sin(a-.2)*40);g.lineTo(x+8+Math.cos(a+.2)*40,y-22+Math.sin(a+.2)*40);g.fill();g.restore();}
   ds(g,MRBOSS,x+8-MRBOSS.w/2,y+17-MRBOSS.h);g.restore();if(G.cleared[n.id])mapCheck(g,x,y);}}});
const W3TOW=[[4,6],[19,3],[14,1]];
function mapG3(NODES){const g=Array.from({length:MR},()=>Array(MC).fill('.')),path=Array.from({length:MR},()=>Array(MC).fill(0));
 for(let r=0;r<MR;r++)g[r][12+(r>4?1:0)]='~';g[4][13]='~';
 for(const[c,r]of W3TOW)g[r][c]='T';
 trailGrid(NODES,path);const rr=rng(3033);
 for(let r=0;r<MR;r++)for(let c=0;c<MC;c++){if(g[r][c]!=='.'||path[r][c]||nearN(NODES,c,r))continue;const v=rr();
  if(v<.52)g[r][c]=rr()<.55?'P':'p';else if(v<.62)g[r][c]='b';else if(v<.68)g[r][c]='o';}
 return{g,path};}
defWorld({id:3,name:'REDWOOD GIANTS',overBg:'bg_redwood',
 art:["bg_redwood", "bg_redwoodmid", "bg_canopy3", "bg_hollow", "bg_rboss", "rwdirt", "moss", "ranger", "pecker", "squirrel", "chief", "stump", "shroom", "plank", "map_redwood", "map_rstump", "map_tower", "map_rboss", "map_bush", "ending3"],
 songs:{
 redwood:{bpm:132,lead:'E5 . G5 . A5 - - . B5 . A5 . G5 . E5 - D5 . E5 . G5 . A5 - - . C6 . B5 . A5 . G5 - - . E5 . G5 . A5 - - . B5 . D6 . C6 . B5 . A5 - G5 . A5 . B5 . G5 . E5 - - - . . . .',bass:'A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . A2 . E3 . A2 . E3 . C3 . G3 . C3 . G3 . F2 . C3 . F2 . C3 . G2 . D3 . E2 . B2 . A2 . E3 . A2 . A2 .',drum:'k . h . s . h h'},
 canopy3:{bpm:148,lead:'G5 . B5 . D6 . B5 . C6 . A5 . F#5 - D5 . E5 . G5 . A5 . B5 - - . G5 . B5 . D6 . E6 . D6 . B5 . A5 - G5 . A5 . B5 . A5 . G5 - - - . . D5 .',bass:'G2 . D3 . G2 . D3 . C3 . G3 . D3 . A3 . G2 . D3 . E3 . B3 . C3 . G3 . D3 . A3 . G2 . D3 . G2 . D3 .',drum:'k . h h s . h .'},
 hollow:{bpm:100,lead:'A4 - - . C5 - E5 - D5 - - . B4 - - . A4 - - . G4 - B4 - A4 - - - . . . . E5 - - . D5 - C5 - B4 - - . G#4 - - . A4 - - - . . . .',bass:'A2 - - - A2 - - - F2 - - - F2 - - - D2 - - - D2 - - - E2 - - - E2 - - -',drum:'k . . h . . s . . h . .'},
 lookout:{bpm:150,lead:'D5 . D5 F5 . A5 . G5 . F5 . D5 - . C5 . D5 . F5 . G5 - A5 . G5 . F5 . E5 . D5 - - . A4 . D5 . F5 . A5 - C6 . A5 . G5 . F5 . G5 . A5 - - - . .',bass:'D3 . D3 . A2 . A2 . A#2 . A#2 . C3 . C3 . D3 . D3 . A2 . A2 . G2 . G2 . A2 . A2 .',drum:'k k s . k . s h'}},
 map:{tex:'moss',fill:'#4f7a3a',shadow:'rgba(20,30,10,.35)',vign:'rgba(30,12,4,.38)',shore:'#c9a46a',water:['#5aaac0','#2a6a80'],nameCol:'#ffb27a',saved:['lookout','REDWOODS SAVED!'],gen:mapG3,
  props:{P:SP('map_redwood',28),p:SP('map_redwood',21),b:SP('map_bush',10),o:SP('map_rstump',11)},
  deco(g){for(const[c,r]of W3TOW){const x=MOX+c*T,y=MOY+r*T;g.fillStyle='rgba(20,30,10,.35)';g.beginPath();g.ellipse(x+8,y+15,8,2,0,0,7);g.fill();ds(g,MTOWER,x+8-MTOWER.w/2,y+16-MTOWER.h);}}},
 nodes:[
 {id:'back',n:'BACK TO FROSTBITE PEAKS',c:1,r:8,k:'warp',to:2,at:'w3',sign:['W2','#e4f6ff','#5aa0d8']},
 {id:'3-1',n:"3-1 GIANT'S FLOOR",c:1,r:3,k:'lvl',num:1,lvl:1},
 {id:'3-2',n:'3-2 RANGER TOWERS',c:8,r:3,k:'lvl',num:2,lvl:1},
 {id:'3-3',n:'3-3 HEARTWOOD HOLLOW',c:8,r:7,k:'lvl',num:3,lvl:1},
 {id:'lookout',n:'THE LOOKOUT',c:17,r:7,k:'rboss',lvl:1,big:1},
 {id:'w4',n:'TO WORLD 4',c:21,r:7,k:'warp',to:4,at:'back',glow:'lookout',sign:['W4','#ffe0a0','#c87a2a']}],
 ending:{img:'ending3',title:'WORLD 3 CLEAR!',lines:['CHIEF RANGER RICK IS TOPPLED','THE REDWOOD GIANTS STAND TALL']},
 levels:{
 "3-1":{"name":"GIANT'S FLOOR",areas:{
  main:{
   "bg":"redwood",
   "song":"redwood",
   "goalX":200,
   "start":{"x":48,"y":272},
   "theme":"redwood",
   "tex":"bark",
   "spawns":[["squirrel",23,14],["ranger",30,17],["ranger",58,17],["pecker",60,9],["squirrel",84,10],["ranger",72,17],["ranger",90,17],["pecker",101,8],["ranger",122,14],["ranger",130,14],["pecker",124,7],["squirrel",152,14],["squirrel",160,13],["pecker",175,7],["ranger",197,17]],
   "cont":{"12,13":"coin","14,13":"power","16,13":"coin","62,13":"coin","64,13":"feather","68,12":"coins10","84,6":"power","126,10":"acorn","142,10":"power"},
   "items0":[{"t":"cast","i":0,"x":1345,"y":48},{"t":"cast","i":1,"x":2241,"y":144},{"t":"cast","i":2,"x":2801,"y":64}],
   "trunks":[{"c0":74,"c1":78,"r":13},{"c0":82,"c1":86,"r":10},{"c0":96,"c1":98,"r":14},{"c0":169,"c1":171,"r":14},{"c0":174,"c1":176,"r":12},{"c0":179,"c1":181,"r":14}],
   "gens":[{"x":1059,"y":4,"cd":30,"every":150,"k":"drop"},{"x":1683,"y":4,"cd":60,"every":170,"k":"drop"},{"x":2499,"y":4,"cd":90,"every":140,"k":"drop"}],
   "deco":[{"k":"fern","x":48,"y":272},{"k":"fern","x":144,"y":272},{"k":"bush","x":448,"y":272},{"k":"bush","x":768,"y":272},{"k":"bush","x":1120,"y":272},{"k":"bush","x":1472,"y":272},{"k":"fern","x":1744,"y":272},{"k":"bush","x":2208,"y":272},{"k":"fern","x":2352,"y":272},{"k":"fern","x":2640,"y":272},{"k":"bush","x":2944,"y":272},{"k":"fern","x":3248,"y":272},{"k":"stump","x":304,"y":272},{"k":"stump","x":720,"y":272},{"k":"stump","x":1600,"y":272},{"k":"stump","x":1792,"y":272},{"k":"stump","x":2528,"y":272},{"k":"stump","x":3296,"y":272}],
   grid:String.raw`
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................?...............................................................................................................................
....................................................................................................................................................................................................................
..................................................................................CCCCC.............................................................................................................................
.............C.C.C...........................................................................................................................................................C.C.C..................................
..................................................................................LLLLL.......................................H..............R?R................................................SS..................
...................................CCCC........................................................................................................................................................SSS..................
....................................................................H.........................................................................................................LLL.............SSSS..................
............?R?R?..........................LLLLL....XXXX......?R?.........LLLLL.....................................C.C.C.C.C.C.C.C.C.C.........................XX...........................SSSSS..................
......................XXX........../GG\.............XXXX........................................LLL.................XXXXXXXXXXXXXXXXXXX.................XX......XX.......LLL.......LLL......SSSSSS..................
......................XXX........./GGGG\...........XXXXX............................................................XXXXXXXXXXXXXXXXXXX......./G\.......XX......XX.........................SSSSSSS..................
......................XXX......../GGGGGG\..........XXXXX............................................................XXXXXXXXXXXXXXXXXXX....../GGG\......XX......XX........................SSSSSSSS..................
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..............GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..............GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "3-2":{"name":"RANGER TOWERS",areas:{
  main:{
   "bg":"canopy3",
   "song":"canopy3",
   "goalX":200,
   "edge":1,
   "start":{"x":48,"y":272},
   "theme":"redwood",
   "tex":"plank",
   "spawns":[["ranger",23,13],["squirrel",30,12],["pecker",44,5],["ranger",58,11],["ranger",82,13],["squirrel",101,10],["pecker",104,6],["ranger",114,11],["pecker",113,4],["ranger",137,12],["squirrel",144,9],["pecker",152,6],["ranger",163,12],["squirrel",178,12]],
   "cont":{"22,9":"power","72,6":"coin","74,6":"feather","129,5":"coins10","144,5":"power"},
   "items0":[{"t":"cast","i":0,"x":1393,"y":16},{"t":"cast","i":1,"x":2065,"y":96},{"t":"cast","i":2,"x":2785,"y":128}],
   "lifts":[{"x":544,"y":208,"w":32,"k":"v","a":80,"x0":544,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":992,"y":192,"w":48,"k":"h","a":96,"x0":992,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1392,"y":192,"w":32,"k":"fall","a":0,"x0":1392,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1456,"y":176,"w":32,"k":"fall","a":0,"x0":1456,"y0":176,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1520,"y":192,"w":32,"k":"fall","a":0,"x0":1520,"y0":192,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1952,"y":224,"w":32,"k":"v","a":96,"x0":1952,"y0":224,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2368,"y":176,"w":48,"k":"h","a":112,"x0":2368,"y0":176,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "trunks":[{"c0":14,"c1":18,"r":15},{"c0":21,"c1":25,"r":13},{"c0":39,"c1":45,"r":10},{"c0":49,"c1":52,"r":13},{"c0":56,"c1":59,"r":11},{"c0":79,"c1":84,"r":13},{"c0":99,"c1":103,"r":10},{"c0":127,"c1":131,"r":9},{"c0":135,"c1":139,"r":12},{"c0":160,"c1":165,"r":12},{"c0":169,"c1":172,"r":14},{"c0":176,"c1":180,"r":12}],
   "deco":[{"k":"fern","x":48,"y":272},{"k":"fern","x":128,"y":272},{"k":"fern","x":3040,"y":272},{"k":"fern","x":3264,"y":272}],
   grid:String.raw`
..................................................................................................................................................................................................................
..................................................................................................................................................................................................................
.............................................................................C.C.C.C.C.C..........................................................................................................................
............................................................................cccccccccccc..........................................................................................................................
..................................................................................................................................................................................................................
.................................................................................................................................H.............R?R................................................................
........................................................................?R?R......................................................................................................................................
.............................................................................................................C.C.C.C.C............................................................................................
........................................CCCCC.....................................................................................................................................................................
.....................R?R.......................................................................................................LLLLL...........XXX................................................................
.......................................LLLLLLL..........................XXXX.......................LLLLL.......................................XXX................................................................
........................................................LLLL............XXXX..............................XXLLLLLLLLLLLXX......................XXX..............................................SS................
.............................XXX........................................XXXX..............................XX...........XX..............LLLLL...XXX..............LLLLLL..........LLLLL..........SSS................
.....................LLLLL...XXX.................LLLL...................XXXX...LLLLLL.....................XX...........XX......................XXX............................................SSSS................
.............................XXX........................................XXXX..............................XX...........XX......................XXX.......................LLLL................SSSSS................
..............LLLLL..........XXX........................................XXXX..............................XX...........XX......................XXX..........................................SSSSSS................
.............................XXX........................................XXXX..............................XX...........XX......................XXX.........................................SSSSSSS................
GGGGGGGGGGGG.................XXX........................................XXXX..............................XX...........XX......................XXX......................................GGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGG.................XXX........................................XXXX..............................XX...........XX......................XXX......................................GGGGGGGGGGGGGGGGGGGGGGGGGG
`}}},
 "3-3":{"name":"HEARTWOOD HOLLOW",areas:{
  main:{
   "bg":"hollow",
   "song":"hollow",
   "goalX":190,
   "start":{"x":48,"y":272},
   "tex":"bark",
   "spawns":[["squirrel",20,12],["ranger",48,17],["ranger",54,17],["squirrel",51,12],["pecker",66,8],["ranger",90,17],["squirrel",96,12],["ranger",110,17],["ranger",118,17],["pecker",115,9],["pecker",126,8],["squirrel",166,17],["ranger",170,17]],
   "cont":{"10,13":"coin","11,13":"coins10","12,13":"power","84,13":"feather","111,13":"power","113,13":"coin","160,13":"firefly"},
   "items0":[{"t":"cast","i":0,"x":625,"y":96},{"t":"cast","i":1,"x":1633,"y":176},{"t":"cast","i":2,"x":2353,"y":144}],
   "lifts":[{"x":992,"y":224,"w":32,"k":"fall","a":0,"x0":992,"y0":224,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":1056,"y":208,"w":32,"k":"fall","a":0,"x0":1056,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2272,"y":240,"w":32,"k":"fall","a":0,"x0":2272,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2320,"y":208,"w":48,"k":"h","a":48,"x0":2320,"y0":208,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":2400,"y":240,"w":32,"k":"fall","a":0,"x0":2400,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "deco":[{"k":"rshroom","x":80,"y":272},{"k":"rshroom","x":368,"y":272},{"k":"rshroom","x":608,"y":272},{"k":"rshroom","x":928,"y":272},{"k":"rshroom","x":1168,"y":272},{"k":"rshroom","x":1408,"y":272},{"k":"rshroom","x":1728,"y":272},{"k":"rshroom","x":1920,"y":272},{"k":"rshroom","x":2192,"y":272},{"k":"rshroom","x":2480,"y":272},{"k":"rshroom","x":2608,"y":272},{"k":"rshroom","x":2976,"y":272},{"k":"rshroom","x":3136,"y":272}],
   grid:String.raw`
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
............................................XXXXXXXXXXXXX.........................................................................XXXXX.................................................................
............................................XXXXXXXXXXXXX.........................................................................XXXXX.................................................................
............................................XXXXXXXXXXXXX.........................................................................XXXXX.................................................................
............................................XXXXXXXXXXXXX.........................................................................XXXXX.................................................................
............................................XXXXXXXXXXXXX.........................................................................XXXXX.................................................................
..............................C.C.C.C.C......C.C.C.C.C.C..........................................................................XXXXX.................................................................
.............................LLLLLLLLLLLL......................................CCCCCCCCCC...............................................................................................................
..............................................................................LLLLLLLLLLLL..............................................................................................................
........................................................................................................................................................................................................
....................................................................................................................................................................................XX..................
..................LLLLLL..........................LLLL.........................................XXX.................................................................................XXX..................
..........?R?.......................................................................H..........XXX............R?R?R.............................................?.................XXXX..................
...............................................................................................XXX........................XXX....................................................XXXXX..................
...............................................................................................XXX........................XXX...................................................XXXXXX..................
...........................F................................................F..................XXX........................XXX..................................................XXXXXXX..................
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....XXXXXXXXXXXXXXXXXXXXXXXXXX..........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....XXXXXXXXXXXXXXXXXXXXXXXXXX..........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
`}}},
 "lookout":{"name":"THE LOOKOUT","card":"FINAL STAGE","ending":1,clr:()=>({title:'TOWER TOPPLED!',sub:'THE REDWOODS STAND TALL'}),areas:{
  main:{
   "bg":"rboss",
   "song":"lookout",
   "tex":"plank",
   "theme":"redwood",
   "arena":126,
   "start":{"x":32,"y":272},
   "spawns":[["squirrel",18,13],["ranger",25,17],["pecker",36,9],["ranger",44,17],["squirrel",53,14],["ranger",70,13],["ranger",76,17],["pecker",80,8],["squirrel",85,13],["ranger",100,17],["ranger",106,17],["pecker",114,7],{"t":"chief","x":2240,"y":222,"o":{"boss":1,"st":"wait","hp":10,"mhp":10,"name":"CHIEF RANGER RICK","inv":0}}],
   "cont":{"6,13":"power","8,13":"coin","47,12":"feather","94,13":"power","96,13":"coins10","120,13":"power"},
   "items0":[{"t":"cast","i":0,"x":753,"y":112},{"t":"cast","i":1,"x":1121,"y":144},{"t":"cast","i":2,"x":1889,"y":160}],
   "lifts":[{"x":496,"y":240,"w":32,"k":"fall","a":0,"x0":496,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0},{"x":944,"y":240,"w":32,"k":"fall","a":0,"x0":944,"y0":240,"t":0,"vy":0,"dx":0,"dy":0,"trig":0}],
   "trunks":[{"c0":68,"c1":72,"r":13}],
   "gens":[{"x":771,"y":4,"cd":30,"every":130,"k":"drop"},{"x":1443,"y":4,"cd":40,"every":120,"k":"drop"}],
   "deco":[{"k":"fern","x":48,"y":272},{"k":"fern","x":352,"y":272},{"k":"fern","x":640,"y":272},{"k":"fern","x":1056,"y":272},{"k":"fern","x":1440,"y":272},{"k":"fern","x":1664,"y":272},{"k":"fern","x":1952,"y":272}],
   grid:String.raw`
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
......................................................................................................................................................
..............................................R?R.....................................................................................................
......?R?.........XX................................................LLLLL...........XXX.......?R?.......................?........LLLL..........LLLL...
..................XX................................XXX.............................XXX.......................XXX.....................................
................XXXX................................XXX.............................XXX.......................XXX.....................................
................XXXX................................XXX.............................XXX.......................XXX.....................................
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG
`}}}}});
