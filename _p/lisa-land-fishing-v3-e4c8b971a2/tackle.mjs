export const LURES = [
  {id:'spinner',name:'Silver spinner',color:'#e8eade',sink:82,depth:390,note:'Light flash / slow sink'},
  {id:'spoon',name:'Copper spoon',color:'#eaa370',sink:114,depth:480,note:'Wobbling baitfish / medium sink'},
  {id:'jig',name:'Deepwater jig',color:'#a9c9f3',sink:185,depth:575,note:'Weighted presentation / fast sink'},
];
export const BAITS = [
  {id:'bare',name:'Bare lure',note:'Let the lure do the work.'},
  {id:'eggs',name:'Salmon eggs',note:'A small, subtle offering.'},
  {id:'herring',name:'Cut herring',note:'An oily baitfish presentation.'},
  {id:'squid',name:'Squid strip',note:'A substantial bottom-fishing bait.'},
];
export const HOOKS = [
  {id:'small',name:'Small hook',note:'Discreet / smaller mouths'},
  {id:'medium',name:'Medium hook',note:'Balanced / mid-size fish'},
  {id:'large',name:'Large hook',note:'Big bait / bigger mouths'},
];
export const DEFAULT_RIG = {lure:'spinner',bait:'bare',hook:'small'};
export const PREFERENCES = {
  pink:{lures:[5,3,1],baits:[4,5,2,1],hooks:[5,3,1],depth:365,water:'Shallow water',caution:.9,tip:'Small, flashing presentations. Pink salmon favor a spinner, eggs, and a small hook.'},
  coho:{lures:[4,5,2],baits:[3,3,5,2],hooks:[3,5,3],depth:420,water:'Upper midwater',caution:1,tip:'A moving baitfish presentation. Try a spoon, herring, and a medium hook.'},
  sockeye:{lures:[3,5,1],baits:[3,5,2,1],hooks:[5,3,1],depth:475,water:'Midwater',caution:1.2,tip:'Keep it small and subtle. A spoon, eggs, and a small hook suit these cautious fish.'},
  halibut:{lures:[1,2,5],baits:[1,1,4,5],hooks:[1,3,5],depth:575,water:'Near the bottom',caution:1.15,tip:'Fish low and let the bait settle. A heavy jig, squid, and a large hook are the strongest match.'},
  king:{lures:[2,5,4],baits:[2,3,5,3],hooks:[1,4,5],depth:520,water:'Deep midwater',caution:1.3,tip:'A substantial baitfish offering. A spoon, herring, and a large hook suit a king.'},
};
export function validateRig(rig) {
  if (!rig || !LURES.some(x=>x.id===rig.lure) || !BAITS.some(x=>x.id===rig.bait) || !HOOKS.some(x=>x.id===rig.hook)) {
    throw new TypeError('Invalid fishbox tackle selection.');
  }
  return {lure:rig.lure,bait:rig.bait,hook:rig.hook};
}
export function parseFishbox(raw) {
  const data=JSON.parse(raw);
  if (!data || data.version!==1) throw new TypeError('Invalid saved fishbox.');
  return validateRig(data.rig);
}
export function rateRig(speciesId, rig) {
  const profile=PREFERENCES[speciesId];
  if (!profile) throw new TypeError('Unknown tackle preference species.');
  validateRig(rig);
  const lure=profile.lures[LURES.findIndex(x=>x.id===rig.lure)];
  const bait=profile.baits[BAITS.findIndex(x=>x.id===rig.bait)];
  const hook=profile.hooks[HOOKS.findIndex(x=>x.id===rig.hook)];
  return {lure,bait,hook,score:Math.round((lure*.45+bait*.35+hook*.2)*100)/100};
}
export function recommendedRig(speciesId) {
  const profile=PREFERENCES[speciesId];
  if (!profile) throw new TypeError('Unknown tackle preference species.');
  const best=(items,ratings)=>items[ratings.indexOf(Math.max(...ratings))].id;
  return {lure:best(LURES,profile.lures),bait:best(BAITS,profile.baits),hook:best(HOOKS,profile.hooks)};
}
export class FishInterest {
  constructor(random=Math.random) {
    this.random=random;
    this.state='cruise';
    this.wait=1.5+random()*3;
    this.appetite=.8+random()*.4;
    this.chaseLeft=0;
  }
  distract(seconds=5) {
    this.state='cruise';
    this.wait=seconds;
  }
  tick(dt,{active,settled,distance,vertical,match,caution=1,twitched=false}) {
    if (!(dt>0)) return false;
    this.wait=Math.max(0,this.wait-dt);
    if (!active || !settled) {
      if (this.state!=='cruise') this.distract(2);
      return false;
    }
    const radius=95+match*60+(twitched?12:0);
    if (distance>radius+25 || vertical>75) {
      if (this.state!=='cruise') this.distract(3);
      return false;
    }
    if (this.state==='approach') {
      this.chaseLeft-=dt;
      if (this.chaseLeft<=0) {this.distract(5);return false;}
      if (distance<20) {this.distract(8);return true;}
    } else if (this.wait===0) {
      if (this.state==='watch') {
        if (this.random()<.3+match*.55) {
          this.state='approach';this.chaseLeft=8+this.random()*4;
        } else this.distract(4+this.random()*4);
      } else if (distance<=radius) {
        const chance=(.1+.52*match*match+(twitched?.04:0))*this.appetite;
        if (this.random()<chance) {
          this.state='watch';this.wait=1.1*caution+this.random()*1.5;
        } else this.distract(3+this.random()*5);
      }
    }
    return false;
  }
}
