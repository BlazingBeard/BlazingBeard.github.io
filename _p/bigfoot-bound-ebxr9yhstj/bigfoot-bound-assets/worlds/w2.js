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
 lodge:{draw(g,n,x,y,shadow){shadow(11);ds(g,MLODGE,x+8-MLODGE.w/2,y+16-MLODGE.h);if((frame>>4)&1){g.fillStyle='rgba(235,240,245,.6)';g.beginPath();g.arc(x+12,y+16-MLODGE.h-2-(frame&15)*.3,1.8,0,7);g.fill();}}},
 peak:{draw(g,n,x,y,shadow){shadow(16);glow(g,x+8,y-8,26,`rgba(170,230,255,${.3+.1*Math.sin(frame*.06)})`);ds(g,MPEAK,x+8-MPEAK.w/2,y+17-MPEAK.h);}}});
function mapG2(NODES){const g=Array.from({length:MR},()=>Array(MC).fill('.')),path=Array.from({length:MR},()=>Array(MC).fill(0));
 for(let c=15;c<=20;c++)for(let r=5;r<=8;r++)if(!((c===15||c===20)&&(r===5||r===8)))g[r][c]='~';
 trailGrid(NODES,path);const rr=rng(2077);
 for(let r=0;r<MR;r++)for(let c=0;c<MC;c++){if(g[r][c]!=='.'||path[r][c]||nearN(NODES,c,r))continue;const v=rr();
  if(r<=1&&v<.75)g[r][c]='m';else if(v<.45)g[r][c]=rr()<.5?'P':'p';else if(v<.53)g[r][c]='b';else if(v<.6)g[r][c]='o';}
 return{g,path};}
defWorld({id:2,name:'FROSTBITE PEAKS',overBg:'bg_snow',
 art:["bg_snow","bg_snowmid","snowdirt","snow","goat","boarder","icicle","sbush","snowman","map_spine","map_smtn","map_irock","map_lodge","map_peak"],
 songs:{snow:{bpm:156,lead:'D5 . F#5 . A5 - F#5 . B5 . A5 . F#5 - D5 . E5 . G5 . B5 - A5 . G5 . F#5 . E5 - - . D5 . F#5 . A5 - D6 . C#6 . A5 . B5 - G5 . A5 . F#5 . E5 . G5 . F#5 . D5 - - - . . A4 .',bass:'D3 . A3 . D3 . A3 . G2 . D3 . G2 . D3 . E2 . B2 . E2 . B2 . A2 . E3 . A2 . C#3 . D3 . A3 . D3 . A3 . B2 . F#3 . B2 . F#3 . G2 . D3 . A2 . E3 . D3 . A3 . D3 . A2 .',drum:'k . h h s . h .'}},
 map:{tex:'snow',fill:'#e2ecf5',shadow:'rgba(40,62,96,.3)',vign:'rgba(30,50,90,.3)',shore:'#f6fafd',water:['#d2eefa','#86bfe0'],nameCol:'#bfe6ff',gen:mapG2,
  props:{P:SP('map_spine',23),p:SP('map_spine',18),b:SP('sbush',10),o:SP('map_irock',11),m:SP('map_smtn',27)}},
 nodes:[
 {id:'back',n:'BACK TO BIGFOOT VALLEY',c:1,r:8,k:'warp',to:1,at:'w2',sign:['W1','#c8f08a','#5fae36']},
 {id:'2-1',n:'2-1 SNOWDRIFT SLOPES',c:1,r:4,k:'lvl',num:1,lvl:1},
 {id:'2-2',n:'2-2 COMING SOON',c:6,r:4,k:'lvl',num:2,soon:1},
 {id:'lodge',n:'SKI LODGE - COMING SOON',c:6,r:7,k:'lodge',soon:1},
 {id:'2-3',n:'2-3 COMING SOON',c:12,r:7,k:'lvl',num:3,soon:1},
 {id:'2-4',n:'2-4 COMING SOON',c:12,r:2,k:'lvl',num:4,soon:1},
 {id:'peak',n:'THE SUMMIT - COMING SOON',c:19,r:2,k:'peak',soon:1,big:1},
 {id:'w3',n:'TO REDWOOD GIANTS',c:22,r:2,k:'warp',to:3,at:'back',glow:'peak',sign:['W3','#ffd0a0','#b8582a']}],
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
`}}}}});
