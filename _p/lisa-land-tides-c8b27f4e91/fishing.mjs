export const SPECIES = [
  {id:'pink',name:'Pink salmon',rarity:'COVE REGULAR',temper:'A gentle little scrapper',min:3,max:7,length:22,power:.78,color:'#dda590',quip:'Small fish. Enormous opinions.'},
  {id:'coho',name:'Coho salmon',rarity:'SILVER ACROBAT',temper:'Likes to leap for freedom',min:7,max:15,length:30,power:1,color:'#93cab2',quip:'All that silver, and not a penny of rent.'},
  {id:'sockeye',name:'Sockeye salmon',rarity:'SCARLET SPRINTER',temper:'Quick runs. Short rests.',min:5,max:12,length:27,power:1.12,color:'#d1856c',quip:'Red carpet energy. Dockside manners.'},
  {id:'halibut',name:'Pacific halibut',rarity:'DEEP-WATER DAYDREAM',temper:'Dives deep. Pulls hard.',min:12,max:45,length:44,power:1.2,color:'#afb285',quip:'The ocean sent you a very stubborn pancake.'},
  {id:'king',name:'King salmon',rarity:'SANCTUARY ROYALTY',temper:'The big one has big plans',min:18,max:50,length:42,power:1.4,color:'#d8c381',quip:'This story will get bigger every time you tell it.'},
];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class FishingRound {
  constructor(random = Math.random) {
    this.random = random;
    this.reset();
  }
  reset() {
    this.phase = 'idle';
    this.age = 0;
    this.species = null;
    this.events = [];
    this.held = false;
    this.result = null;
  }
  enter(phase) {
    this.phase = phase;
    this.age = 0;
    this.events.push(phase);
  }
  cast(species, distance = 0) {
    if (this.phase !== 'idle') return false;
    this.species = species;
    this.approach = 1.3 + distance / 80 + this.random() * 1.5;
    this.nibbles = 1 + Math.floor(this.random() * 3);
    this.nibbleCount = 0;
    this.waitTime = this.approach;
    this.enter('casting');
    return true;
  }
  press() {
    if (this.phase === 'bite') {
      this.reaction = this.age;
      this.progress = .12;
      this.tension = .42;
      this.fightAge = 0;
      this.mode = 'rest';
      this.modeAge = 0;
      this.modeLength = 2.4;
      this.nextMode = this.species.id === 'halibut' ? 'dive' : 'run';
      this.highTime = 0;
      this.slackTime = 0;
      this.roughTime = 0;
      this.direction = this.random() > .5 ? 1 : -1;
      this.held = false;
      this.enter('fight');
    } else if (this.phase === 'fight') {
      this.held = true;
    } else if (['waiting', 'nibble'].includes(this.phase)) {
      this.escape('Too soon! That was only a nibble.', 'Wait for the big splash and the “Hook it!” sign.');
    }
  }
  release() { this.held = false; }
  escape(title, hint) {
    this.held = false;
    this.result = {title, hint};
    this.enter('escaped');
  }
  get telegraph() {
    return this.phase === 'fight' && this.mode === 'rest' && this.modeLength - this.modeAge < .75;
  }
  tick(dt) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, .05);
    this.age += dt;
    if (this.phase === 'casting' && this.age >= .85) this.enter('waiting');
    else if (this.phase === 'waiting' && this.age >= this.waitTime) {
      if (!this.species) this.escape('A quiet patch of water.', 'Try casting closer to one of the moving fish shadows.');
      else if (this.nibbleCount < this.nibbles) {
        this.nibbleCount++;
        this.enter('nibble');
      } else {
        this.biteWindow = this.species.power > 1.2 ? 1.15 : 1.55;
        this.enter('bite');
      }
    } else if (this.phase === 'nibble' && this.age >= .43) {
      this.waitTime = .85 + this.random() * .8;
      this.enter('waiting');
    } else if (this.phase === 'bite' && this.age >= this.biteWindow) {
      this.escape('A splash. A flash. Gone.', 'Hook on the big splash. That fish was quicker this time.');
    } else if (this.phase === 'fight') this.fight(dt);
  }
  fight(dt) {
    this.fightAge += dt;
    this.modeAge += dt;
    if (this.modeAge >= this.modeLength) {
      if (this.mode === 'rest') {
        this.mode = this.nextMode;
        this.direction = this.random() > .5 ? 1 : -1;
        this.modeLength = (this.mode === 'dive' ? 1.75 : 1.2) + this.random() * .75;
      } else {
        this.mode = 'rest';
        this.modeLength = 2.35 + this.random() * 1.3 - (this.species.power - .8) * .45;
        this.nextMode = this.species.id === 'halibut' || this.random() > .6 ? 'dive' : 'run';
      }
      this.modeAge = 0;
      this.events.push('mood');
    }
    const fighting = this.mode !== 'rest';
    const power = this.species.power * Math.max(.7, 1 - this.fightAge / 120);
    const pull = fighting ? (this.mode === 'dive' ? .19 : .15) * power : 0;
    const reel = this.held ? (fighting ? .3 : .165) : (fighting ? -.21 : -.25);
    this.tension = clamp(this.tension + (pull + reel) * dt, 0, 1);
    if (this.held && this.tension > .1 && this.tension < .9) {
      this.progress += (fighting ? .018 : .16 / Math.sqrt(power)) * dt;
    } else {
      this.progress -= (fighting ? .018 * power : .006) * dt;
    }
    this.highTime = this.tension >= .93 ? this.highTime + dt : Math.max(0, this.highTime - dt * 2);
    this.slackTime = this.tension <= .07 ? this.slackTime + dt : Math.max(0, this.slackTime - dt * 2);
    if (this.tension < .14 || this.tension > .87) this.roughTime += dt;
    if (this.highTime > .8) {
      this.escape('Ping! The line gave out.', 'When it runs or dives, let go. Reel again when it rests.');
    } else if (this.slackTime > 1.4) {
      this.escape('A loose line. A lucky fish.', 'Keep a little tension. Reel before the marker reaches the left edge.');
    } else if (this.progress < -.12 || this.fightAge > 70) {
      this.escape('Back to the deep blue.', 'Reel during its rests to stop the fish gaining distance.');
    } else if (this.progress >= 1) {
      this.held = false;
      this.result = {
        species: this.species,
        weight: +(this.species.min + this.random() * (this.species.max - this.species.min)).toFixed(1),
        length: Math.round(this.species.length * (.85 + this.random() * .3)),
        quality: this.roughTime < .25 ? 'Beautiful' : this.roughTime < 2 ? 'Lovely' : 'Scrappy',
        reaction: this.reaction,
      };
      this.enter('landed');
    }
  }
  drainEvents() { return this.events.splice(0); }
}
