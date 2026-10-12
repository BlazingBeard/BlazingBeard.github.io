import {FishingRound, SPECIES, clamp} from './fishing.mjs';

const $ = id => document.getElementById(id);
const canvas = $('water');
const ctx = canvas.getContext('2d');
const game = new FishingRound();
const SAVE_KEY = 'howardai-lisaland-little-tides-v2';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const random = (a, b) => a + Math.random() * (b - a);
const art = {};
let W = 1200, H = 800, scale = 1;
let started = false, paused = false, modalPaused = false, assetsReady = false;
let elapsed = 0, previous = 0, idleAge = 0, casts = 0, day = 0;
let hookedFish = null, bobber = {x:.52, y:.71}, aim = {x:.45, y:.72};
let ripples = [], droplets = [], floaters = [], fish = [];
let storageAvailable = true, audio = null, sound = false, ambience = null;
let lastReelSound = 0, catchCount = 0, activePointer = null;
const keys = new Set();
const colors = ['#3d8274', '#718969', '#4a637e'];
const times = ['Golden afternoon', 'Honey-hour sunset', 'Blue-hour hush'];
const collection = {counts:SPECIES.map(() => 0), best:SPECIES.map(() => 0), total:0};

function notify(message, error) {
  if (error) console.error(message, error);
  $('notice').hidden = false;
  $('notice').textContent = message;
}
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw !== null) {
    const data = JSON.parse(raw);
    const valid = data && Array.isArray(data.counts) && data.counts.length === 5
      && data.counts.every(n => Number.isSafeInteger(n) && n >= 0)
      && Array.isArray(data.best) && data.best.length === 5
      && data.best.every((n, i) => Number.isFinite(n) && n >= 0 && n <= SPECIES[i].max)
      && Number.isSafeInteger(data.total) && data.total === data.counts.reduce((a,b) => a+b, 0);
    if (!valid) throw new Error('Saved field notes have an invalid format.');
    Object.assign(collection, data);
  }
} catch (error) {
  storageAvailable = false;
  notify('Your saved field notes could not be read. This visit will not overwrite them; new catches are session-only.', error);
}

function saveCatch(result) {
  const index = SPECIES.indexOf(result.species);
  const isNew = collection.counts[index] === 0;
  const record = result.weight > collection.best[index];
  collection.counts[index]++;
  collection.best[index] = Math.max(collection.best[index], result.weight);
  collection.total++;
  catchCount++;
  if (storageAvailable) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(collection)); }
    catch (error) {
      storageAvailable = false;
      notify('Your browser could not save these field notes. Your catches will remain here for this visit only.', error);
    }
  }
  renderJournal();
  return isNew ? 'NEW SPECIES! A PAGE IN YOUR STORY.' : record ? 'YOUR PERSONAL BEST. TELL EVERYONE.' : 'A LITTLE MOMENT. A LOVELY CATCH.';
}

function renderJournal() {
  $('total').textContent = collection.total;
  $('discovered').innerHTML = `${collection.counts.filter(Boolean).length}<span>/5</span>`;
  $('speciesList').innerHTML = SPECIES.map((s, i) => `
    <div class="species-row ${collection.counts[i] ? 'found' : ''}">
      <div class="specimen"><img src="assets/fish-${s.id}.webp" alt=""></div>
      <div><div class="species-name">${s.name}</div><div class="species-detail">${collection.counts[i] ? `Best ${collection.best[i].toFixed(1)} lb` : s.temper}</div></div>
      <span class="species-count">${collection.counts[i] ? '×'+collection.counts[i] : '—'}</span>
    </div>`).join('');
  const biggest = Math.max(...collection.best);
  if (biggest) {
    const index = collection.best.indexOf(biggest);
    $('record').textContent = `${biggest.toFixed(1)} lb of ${SPECIES[index].name.toLowerCase()} stories.`;
  }
}
renderJournal();

async function loadImage(name, path) {
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Artwork failed to load: ${path}`));
    image.src = path;
  });
  art[name] = image;
}
async function prepare() {
  try {
    await Promise.all([
      loadImage('island', 'assets/island.webp'),
      ...SPECIES.map(s => loadImage(s.id, `assets/fish-${s.id}.webp`)),
      loadImage('postcard', 'assets/postcard.webp'),
    ]);
    assetsReady = true;
    $('start').disabled = false;
    $('start').textContent = 'Find my happy place  →';
  } catch (error) {
    $('start').textContent = 'Retry loading the island';
    $('start').disabled = false;
    notify('The island artwork could not load. Check your connection and choose “Retry loading the island”.', error);
  }
}
prepare();

function resize() {
  const rect = canvas.getBoundingClientRect();
  W = H * rect.width / rect.height;
  scale = Math.min(devicePixelRatio || 1, 2) * rect.height / H;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
new ResizeObserver(resize).observe($('scene'));

function spawnFish(index, initial = false) {
  return {
    species:SPECIES[index], x:initial ? .14 + index * .17 : random(.12,.88),
    y:random(.64,.86), baseY:random(.66,.84), direction:Math.random() > .5 ? 1 : -1,
    speed:random(.009,.018), phase:random(0,6), angle:0, spooked:0,
    size:(index === 4 ? 1.28 : index === 3 ? 1.22 : index === 0 ? .83 : 1),
  };
}
fish = SPECIES.map((_, i) => spawnFish(i, true));

function status(title, hint) {
  $('statusTitle').textContent = title;
  $('statusHint').textContent = hint;
}
function setAction(text, enabled = true) {
  $('actionText').textContent = text;
  $('action').disabled = !enabled;
}
function label(text) { $('statePill').lastChild.textContent = text; }
function splash(x, y, strength = 1) {
  ripples.push({x,y,age:0,strength});
  if (!reducedMotion) {
    for (let i=0; i<8*strength; i++) droplets.push({
      x,y,vx:random(-.06,.06)*strength,vy:random(-.2,-.06)*strength,age:0,life:random(.35,.7),r:random(1.5,4),
    });
  }
}
function floater(text, x, y, color = '#fff4c8') {
  floaters.push({text,x,y,age:0,color});
}

function unlockAudio() {
  if (!audio) {
    audio = new AudioContext();
    const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i=0;i<data.length;i++) {
      last = (last + (Math.random()*2-1)*.025)/1.025;
      data[i] = last * 3;
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    ambience = audio.createGain();
    ambience.gain.value = 0;
    source.connect(filter).connect(ambience).connect(audio.destination);
    source.start();
  }
  if (audio.state === 'suspended') audio.resume().catch(error => notify('Sound could not start in this browser.', error));
}
function tone(freq, duration = .12, volume = .04, type = 'sine', delay = 0) {
  if (!sound || !audio || paused || modalPaused) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  oscillator.frequency.exponentialRampToValueAtTime(freq*.8, start+duration);
  gain.gain.setValueAtTime(.001, start);
  gain.gain.linearRampToValueAtTime(volume, start+.01);
  gain.gain.exponentialRampToValueAtTime(.001, start+duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start+duration+.02);
}
function updateAmbience() {
  if (ambience) ambience.gain.setTargetAtTime(sound && !paused && !modalPaused ? .13 : 0, audio.currentTime, .3);
}
$('sound').onclick = () => {
  try {
    unlockAudio();
    sound = !sound;
    $('sound').textContent = sound ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound));
    updateAmbience();
    tone(660,.15);
  } catch (error) { notify('Sound is not available in this browser. You can still fish using the visual cues.', error); }
};

function start() {
  if (!assetsReady) { $('start').disabled = true; prepare(); return; }
  started = true;
  $('welcome').hidden = true;
  $('pause').disabled = false;
  status('Your first cast is a little hello.', 'Tap the water near a shadow. Or aim with the arrows and press Space.');
  setAction('Cast a line');
  canvas.focus({preventScroll:true});
  tone(523,.16);
}
$('start').onclick = start;

function inputAllowed() { return started && !paused && !modalPaused && assetsReady; }
function clearHold() {
  game.release();
  activePointer = null;
  keys.clear();
  $('action').classList.remove('reeling');
}
function setPause(value) {
  if (!started) return;
  paused = value;
  clearHold();
  $('pauseScreen').hidden = !paused;
  $('pause').textContent = paused ? 'Resume' : 'Pause';
  $('action').disabled = paused || ['casting','landed'].includes(game.phase);
  updateAmbience();
  if (!paused) canvas.focus({preventScroll:true});
}
$('pause').onclick = () => setPause(!paused);
$('resume').onclick = () => setPause(false);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
window.addEventListener('blur', () => { if (started) setPause(true); });

function openDialog(id) {
  modalPaused = true;
  clearHold();
  updateAmbience();
  $(id).showModal();
}
$('help').onclick = () => openDialog('helpDialog');
$('postcard').onclick = () => openDialog('postcardDialog');
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => {
  modalPaused = false;
  clearHold();
  updateAmbience();
  if (started && !paused) canvas.focus({preventScroll:true});
}));
$('time').onclick = () => {
  day = (day+1)%3;
  $('timeLabel').textContent = times[day];
  tone(440+day*110,.16,.025);
};

function cast() {
  if (!inputAllowed() || game.phase !== 'idle') return;
  casts++;
  bobber = {...aim};
  let nearest = null, distance = Infinity;
  for (const f of fish) {
    const d = Math.hypot((f.x-aim.x)*W, (f.y-aim.y)*H);
    if (d < distance && !f.spooked) { nearest=f; distance=d; }
  }
  hookedFish = distance < Math.min(165, W*.23) ? nearest : null;
  if (hookedFish) {
    hookedFish.start = {x:hookedFish.x, y:hookedFish.y};
  }
  game.cast(hookedFish?.species || null, hookedFish ? distance : 0);
  idleAge = 0;
  $('waterLabel').hidden = true;
  tone(240,.25,.035);
  handleEvents();
}

function press() {
  if (!inputAllowed()) return;
  if (game.phase === 'idle') cast();
  else if (game.phase === 'escaped') {
    if (game.age > .65) resetRound();
  } else {
    game.press();
    if (game.held) $('action').classList.add('reeling');
    handleEvents();
  }
}
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:clamp((event.clientX-rect.left)/rect.width,.08,.92),y:clamp((event.clientY-rect.top)/rect.height,.62,.88)};
}
canvas.addEventListener('pointermove', event => {
  if (game.phase === 'idle' && inputAllowed()) aim = pointerPosition(event);
});
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || activePointer !== null) return;
  event.preventDefault();
  canvas.focus({preventScroll:true});
  if (game.phase === 'idle') {
    const rect = canvas.getBoundingClientRect();
    if ((event.clientY-rect.top)/rect.height < .57) {
      if (inputAllowed()) status('The fish are in the water, dreamer.', 'Cast below the shoreline, near one of the moving shadows.');
      return;
    }
    aim = pointerPosition(event);
  }
  activePointer = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  press();
});
$('action').addEventListener('pointerdown', event => {
  if (event.button !== 0 || activePointer !== null) return;
  event.preventDefault();
  activePointer = event.pointerId;
  $('action').setPointerCapture(event.pointerId);
  press();
});
// Keyboard and assistive-technology clicks have no preceding pointerdown.
$('action').addEventListener('click', event => { if (event.detail === 0) press(); });
window.addEventListener('pointerup', event => {
  if (activePointer === event.pointerId) { game.release(); activePointer=null; $('action').classList.remove('reeling'); }
});
window.addEventListener('pointercancel', clearHold);
document.addEventListener('keydown', event => {
  if (modalPaused) return;
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (!event.repeat && started) { event.preventDefault(); setPause(!paused); }
    return;
  }
  if (!inputAllowed()) return;
  if (event.code === 'Space' && (event.target === canvas || event.target === document.body || event.target === $('action'))) {
    event.preventDefault();
    if (!event.repeat) press();
  }
  if (event.code.startsWith('Arrow') && (event.target === canvas || event.target === document.body)) {
    event.preventDefault();
    keys.add(event.code);
  }
});
document.addEventListener('keyup', event => {
  keys.delete(event.code);
  if (event.code === 'Space' || event.code === 'Enter') { game.release(); $('action').classList.remove('reeling'); }
});

function resetRound() {
  if (hookedFish) {
    const index = fish.indexOf(hookedFish);
    if (index >= 0) fish[index] = spawnFish(SPECIES.indexOf(hookedFish.species));
  }
  hookedFish = null;
  game.reset();
  previousMood = '';
  idleAge = 0;
  clearHold();
  $('catchOverlay').hidden = true;
  $('bitePrompt').hidden = true;
  $('fightPanel').hidden = true;
  $('action').classList.remove('strike');
  label('One more little cast');
  status('There’s another story out there.', 'Cast near a moving shadow. Smaller fish are a gentler place to start.');
  setAction('Cast a line');
  canvas.focus({preventScroll:true});
}
$('release').onclick = () => {
  if (game.phase !== 'landed') return;
  splash(bobber.x,bobber.y,1.4);
  floater('Until next time.', bobber.x, bobber.y-.07);
  tone(659,.2,.035); tone(880,.3,.025,'sine',.12);
  resetRound();
};

function handleEvents() {
  for (const event of game.drainEvents()) {
    if (event === 'casting') {
      status('A little wish, on a fishing line.', 'Let the float settle. The fish are curious.');
      setAction('Casting…', false);
      label('A little splash');
    } else if (event === 'waiting') {
      if (game.nibbleCount === 0) {
        splash(bobber.x,bobber.y,.85);
        tone(180,.18,.045);
      }
      status(game.nibbleCount ? 'Not yet. Let it get curious.' : 'Shh. Something might be listening.',
        'Small nibbles are a tease. Wait for the big splash and “Hook it!”');
      setAction('Wait for it…');
      label('Patience looks good on you');
    } else if (event === 'nibble') {
      splash(bobber.x,bobber.y,.45);
      tone(360,.08,.03);
      floater('…nibble', bobber.x, bobber.y-.04, '#fff0bc');
      status('Just a nibble. Don’t bite first.', 'Hands off for now. The real bite has a big splash.');
      label('A curious little nibble');
    } else if (event === 'bite') {
      splash(bobber.x,bobber.y,1.7);
      tone(880,.12,.075); tone(1175,.18,.06,'sine',.09);
      $('bitePrompt').hidden = false;
      $('action').classList.add('strike');
      setAction('Hook it!');
      status('That’s your bite! Hook it!', 'Tap now or press Space!');
      label('NOW! Set the hook');
      if (navigator.vibrate) navigator.vibrate([50,40,70]);
    } else if (event === 'fight') {
      $('bitePrompt').hidden = true;
      $('fightPanel').hidden = false;
      $('action').classList.remove('strike');
      splash(bobber.x,bobber.y,1.5);
      setAction('Hold to reel');
      label('A fish with other plans');
      status('You’re connected. Easy does it.', 'Hold to reel while it rests. Release when it runs or dives.');
      tone(440,.13,.05); tone(550,.16,.04,'sine',.1);
    } else if (event === 'mood') {
      if (game.mode !== 'rest') {
        splash(bobber.x,bobber.y,game.mode === 'run' ? 1.5 : 1.1);
        tone(game.mode === 'run' ? 290 : 160,.17,.045);
      }
    } else if (event === 'escaped') {
      $('bitePrompt').hidden = true;
      $('fightPanel').hidden = true;
      $('action').classList.remove('strike','reeling');
      if (hookedFish) hookedFish.spooked = 2.5;
      splash(bobber.x,bobber.y,1.2);
      floater('The one that got away…', bobber.x,bobber.y-.05);
      status(game.result.title,game.result.hint);
      setAction('Try another cast');
      label('The fish wins this one');
      tone(320,.2,.035); tone(240,.3,.025,'sine',.15);
    } else if (event === 'landed') {
      $('fightPanel').hidden = true;
      $('action').classList.remove('reeling');
      const result = game.result;
      $('catchEyebrow').textContent = saveCatch(result);
      $('catchImage').src = art[result.species.id].src;
      $('catchImage').alt = result.species.name;
      $('catchName').textContent = result.species.name;
      $('catchRarity').textContent = result.species.rarity;
      $('catchQuip').textContent = result.species.quip;
      $('catchWeight').textContent = result.weight.toFixed(1);
      $('catchLength').textContent = result.length;
      $('catchQuality').textContent = result.quality;
      $('catchOverlay').hidden = false;
      $('release').focus({preventScroll:true});
      setAction('A lovely catch', false);
      label('Worth slowing down for');
      status('Well, look who stopped by.', 'A new memory for your field notes. Release when you’re ready.');
      [523,659,784,1046].forEach((n,i) => tone(n,.3,.045,'sine',i*.12));
      splash(bobber.x,bobber.y,2);
      if (collection.counts.every(Boolean)) {
        $('dockTip').textContent = 'Every fish. Every little story. This cove knows your name.';
        $('tipFoot').textContent = 'All five species discovered. Welcome home.';
      } else if (catchCount >= 2) {
        $('dockTip').textContent = 'Bigger shadows have bigger ideas about escaping.';
        $('tipFoot').textContent = 'Try a different shadow to discover a new species.';
      }
    }
  }
}

let previousMood = '';
function updateFightHUD() {
  const fighting = game.mode !== 'rest';
  let mood = game.telegraph ? (game.nextMode === 'dive' ? 'Bracing for a dive…' : 'About to bolt…')
    : game.mode === 'run' ? 'Making a run for it!' : game.mode === 'dive' ? 'Diving for the deep!' : 'Catching its breath';
  if (game.tension < .15) mood = 'Too loose. Reel a little!';
  if (game.tension > .87) mood = 'Too tight! Let go!';
  $('fishMood').textContent = mood;
  const percent = Math.round(clamp(game.progress,0,1)*100);
  $('fightPercent').textContent = `${percent}%`;
  $('landingFill').style.width = `${percent}%`;
  $('landingTrack').setAttribute('aria-valuenow',percent);
  $('tensionNeedle').style.left = `${game.tension*100}%`;
  $('tensionTrack').setAttribute('aria-valuenow',Math.round(game.tension*100));
  $('tensionText').textContent = game.tension > .87 ? 'Ease off!' : game.tension < .15 ? 'Reel in!' : 'Steady';
  $('tensionText').style.color = game.tension > .87 ? '#ab6940' : '#5a7d54';
  const key = `${game.mode}-${game.telegraph}-${game.tension > .87}-${game.tension < .15}`;
  if (key !== previousMood) {
    previousMood = key;
    status(mood, game.tension < .15 ? 'Hold briefly to take up the slack. Keep the marker in the green.'
      : fighting || game.telegraph || game.tension > .87
        ? 'Let go to give it line. Don’t fight the surge.'
        : 'Now’s your moment. Hold to reel, but don’t let the tension climb too high.');
  }
  $('actionText').textContent = game.held ? 'Reeling…' : fighting || game.telegraph ? 'Easy… let it run' : 'Hold to reel';
  if (game.held && elapsed-lastReelSound > .11) { tone(170+game.tension*110,.035,.012,'triangle'); lastReelSound=elapsed; }
}

function update(dt) {
  elapsed += dt;
  if (started) {
    game.tick(dt);
    handleEvents();
    if (game.phase === 'idle') {
      idleAge += dt;
      if (keys.has('ArrowLeft')) aim.x -= dt*.28;
      if (keys.has('ArrowRight')) aim.x += dt*.28;
      if (keys.has('ArrowUp')) aim.y -= dt*.2;
      if (keys.has('ArrowDown')) aim.y += dt*.2;
      aim.x = clamp(aim.x,.08,.92); aim.y=clamp(aim.y,.62,.88);
      $('waterLabel').hidden = casts > 0 || idleAge > 7;
    }
    if (game.phase === 'bite') $('biteClock').style.transform = `scaleX(${Math.max(0,1-game.age/game.biteWindow)})`;
    if (game.phase === 'fight') {
      updateFightHUD();
      const direction = game.direction;
      const targetX = .5 + Math.sin(game.fightAge*1.35)*.14 + (game.mode === 'run' ? direction*.16 : 0);
      const targetY = .66 + game.progress*.12 + (game.mode === 'dive' ? -.035 : .025);
      bobber.x += (targetX-bobber.x)*dt*(game.mode === 'run' ? 3 : 1.5);
      bobber.y += (targetY-bobber.y)*dt*2;
      if (Math.random() < dt*(game.mode === 'rest' ? 1.5 : 6)) ripples.push({x:bobber.x,y:bobber.y,age:0,strength:.5});
    }
    if (game.phase === 'escaped' && game.age > 4.7) resetRound();
  }
  for (const f of fish) {
    if (f === hookedFish && ['waiting','nibble','bite','fight','landed'].includes(game.phase)) {
      const offset = game.phase === 'fight' ? .01 : .026;
      f.x += (bobber.x+offset-f.x)*Math.min(1,dt*1.5);
      f.y += (bobber.y+.012-f.y)*Math.min(1,dt*1.5);
      f.angle = Math.atan2((bobber.y-f.y)*H,(bobber.x-f.x)*W);
    } else {
      if (f.spooked) f.spooked = Math.max(0,f.spooked-dt);
      f.x += f.direction*f.speed*dt*(f.spooked ? 12 : 1);
      f.y += (f.baseY + Math.sin(elapsed*.55+f.phase)*.025 - f.y)*dt;
      f.angle = f.direction > 0 ? Math.sin(elapsed+f.phase)*.13 : Math.PI+Math.sin(elapsed+f.phase)*.13;
      if (f.x < .06) { f.x=.06; f.direction=1; }
      if (f.x > .94) { f.x=.94; f.direction=-1; }
    }
  }
  for (const p of ripples) p.age += dt;
  ripples = ripples.filter(p => p.age < 1.6);
  for (const p of droplets) {
    p.age += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += dt*.55;
  }
  droplets = droplets.filter(p => p.age < p.life);
  for (const p of floaters) p.age += dt;
  floaters = floaters.filter(p => p.age < 2.4);
}

function ellipse(x,y,rx,ry,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function fishShape(f, visible = false) {
  const x=f.x*W,y=f.y*H;
  const size=24*f.size*(W<800 ? .85 : 1);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(f.angle);
  if (f.species.id === 'halibut') ctx.scale(1,1.6);
  ctx.globalAlpha=visible ? .85 : f===hookedFish && game.phase==='fight' && game.mode==='dive' ? .2 : .5;
  const fill=visible ? f.species.color : '#123e36';
  ellipse(0,0,size,size*.36,fill);
  ctx.fillStyle=fill;
  const tail=Math.sin(elapsed*(f.spooked ? 20 : 8)+f.phase)*4;
  ctx.beginPath();ctx.moveTo(-size*.75,0);ctx.lineTo(-size*1.52,-size*.37+tail);ctx.quadraticCurveTo(-size*1.25,tail,-size*1.52,size*.37+tail);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-3,-4);ctx.lineTo(-8,-size*.59);ctx.lineTo(10,-4);ctx.fill();
  if(visible) {ellipse(size*.63,-size*.1,2.3,2.3,'#294939');ctx.strokeStyle='#f4e0a799';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-size*.5,2);ctx.lineTo(size*.5,2);ctx.stroke();}
  ctx.restore();
}
function drawAim() {
  const x=aim.x*W,y=aim.y*H, pulse=reducedMotion?0:Math.sin(elapsed*3)*2;
  ctx.save();
  ctx.strokeStyle='#fff3c9b0';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(x,y,23+pulse,10+pulse*.3,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#fff3c970';ctx.beginPath();ctx.ellipse(x,y,31+pulse,14+pulse*.3,0,0,Math.PI*2);ctx.stroke();
  ellipse(x,y,2,2,'#fff4ca');
  ctx.restore();
}
function rodAndLine() {
  const active=['casting','waiting','nibble','bite','fight'].includes(game.phase);
  const fighting=game.phase==='fight';
  const bend=fighting ? game.tension : .15;
  const sway=reducedMotion ? 0 : Math.sin(elapsed*1.7)*2;
  const base={x:W*.64,y:H*1.02};
  const tip={x:W*.6 - bend*35,y:H*.57+bend*32+sway};
  ctx.save();
  ctx.lineCap='round';
  ctx.strokeStyle='#584a35';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(W*.72,H*.69,tip.x,tip.y);ctx.stroke();
  ctx.strokeStyle='#d7b984';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(base.x-1,base.y);ctx.quadraticCurveTo(W*.72-1,H*.69,tip.x-1,tip.y);ctx.stroke();
  ctx.strokeStyle='#384d43';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(W*.663,H*.936);ctx.stroke();
  if(active){
    let x=bobber.x*W,y=bobber.y*H;
    if(game.phase==='casting'){
      const t=clamp(game.age/.85,0,1);
      x=tip.x+(x-tip.x)*t;
      y=tip.y+(y-tip.y)*t-Math.sin(t*Math.PI)*H*.22;
    }
    const bob=game.phase==='nibble'?Math.sin(game.age*30)*5:game.phase==='bite'?14:Math.sin(elapsed*3)*2;
    y+=bob;
    ctx.lineWidth=fighting?1.8:1.25;
    ctx.strokeStyle=fighting && game.tension>.87?'#f4ba82':'#fff9d5c0';
    ctx.beginPath();ctx.moveTo(tip.x,tip.y);
    ctx.quadraticCurveTo((tip.x+x)/2,(tip.y+y)/2+(fighting?(1-game.tension)*45:45),x,y);ctx.stroke();
    if(game.phase!=='bite'){
      ellipse(x+2,y+3,8,3,'#173f3a44');
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(elapsed*2)*.12);
      ellipse(0,-5,5,9,'#fff8db');
      ctx.fillStyle='#cd8059';ctx.beginPath();ctx.ellipse(0,-5,5,9,0,Math.PI,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#4d6048';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,-19);ctx.stroke();
      ctx.restore();
    }
    if(fighting && game.mode==='run' && game.modeAge<.75 && !reducedMotion){
      const leap=Math.sin(clamp(game.modeAge/.75,0,1)*Math.PI);
      const f={...hookedFish,x:bobber.x,y:bobber.y-leap*.08,angle:game.direction>0?-.4:.4+Math.PI};
      fishShape(f,true);
    }
  }
  ctx.restore();
}
function drawBackground() {
  if(art.island){
    const im=art.island, factor=Math.max(W/im.width,H/im.height);
    ctx.drawImage(im,(W-im.width*factor)/2,(H-im.height*factor)/2,im.width*factor,im.height*factor);
  }else{
    ctx.fillStyle='#508f7e';ctx.fillRect(0,0,W,H);
  }
  if(day){
    ctx.fillStyle=day===1?'#b9753538':'#173e735f';ctx.fillRect(0,0,W,H);
  }
  const shade=ctx.createLinearGradient(0,H*.52,0,H);
  shade.addColorStop(0,'#16695d00');shade.addColorStop(.5,'#12685820');shade.addColorStop(1,'#11494528');
  ctx.fillStyle=shade;ctx.fillRect(0,H*.52,W,H*.48);
  if(!reducedMotion){
    for(let i=0;i<38;i++){
      const x=((i*137.51+elapsed*(i%2?3:-3))%W+W)%W;
      const y=H*(.56+(i*0.127% .35));
      const alpha=(Math.sin(elapsed*1.3+i*1.8)+1)*.065;
      ctx.strokeStyle=`rgba(246,246,207,${alpha})`;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+8,y-2,x+18+(i%4)*4,y);ctx.stroke();
    }
  }
  ctx.save();ctx.strokeStyle=day===2?'#eeeaca80':'#fff9dfc0';ctx.lineWidth=1.6;
  for(let i=0;i<3;i++){
    const x=((W*.25+i*41+elapsed*(reducedMotion?0:7))%(W+100))-50;
    const y=H*.16+i*14;
    const flap=Math.sin(elapsed*3+i)*3;
    ctx.beginPath();ctx.moveTo(x-6,y-flap);ctx.quadraticCurveTo(x-3,y-3,x,y);ctx.quadraticCurveTo(x+3,y-3,x+6,y-flap);ctx.stroke();
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0,0,W,H);
  drawBackground();
  for(const f of fish) {
    if(f===hookedFish && game.phase==='landed') continue;
    fishShape(f);
  }
  for(const p of ripples){
    const fade=1-p.age/1.6;
    ctx.strokeStyle=`rgba(255,247,204,${fade*.65})`;ctx.lineWidth=1.5;
    const size=8+p.age*39*p.strength;
    ctx.beginPath();ctx.ellipse(p.x*W,p.y*H,size,size*.35,0,0,Math.PI*2);ctx.stroke();
    if(p.age>.2){ctx.strokeStyle=`rgba(255,247,204,${fade*.3})`;ctx.beginPath();ctx.ellipse(p.x*W,p.y*H,size*.66,size*.23,0,0,Math.PI*2);ctx.stroke();}
  }
  if(started && game.phase==='idle') drawAim();
  if(started) rodAndLine();
  for(const p of droplets) {ctx.globalAlpha=1-p.age/p.life;ellipse(p.x*W,p.y*H,p.r,p.r*1.5,'#e8f6d7');}
  ctx.globalAlpha=1;
  for(const f of floaters){
    ctx.globalAlpha=Math.min(1,(2.4-f.age)*1.6);
    ctx.font='italic 17px Georgia';ctx.textAlign='center';ctx.fillStyle=f.color;
    ctx.shadowColor='#16463c';ctx.shadowBlur=5;
    ctx.fillText(f.text,clamp(f.x*W,110,W-110),f.y*H-f.age*13);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
  if(started && game.phase==='fight' && game.tension>.89){
    ctx.strokeStyle=`rgba(230,168,96,${.3+Math.sin(elapsed*10)*.15})`;ctx.lineWidth=9;ctx.strokeRect(4,4,W-8,H-8);
  }
}
function frame(now) {
  const dt=previous?Math.min((now-previous)/1000,.05):0;
  previous=now;
  if(!paused && !modalPaused) update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
