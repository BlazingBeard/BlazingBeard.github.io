import {SPECIES} from './fishing.mjs?v=wildlife-2';

export const RARITIES = [
  {id:'normal',name:'Normal',color:'#a2b695',chance:55},
  {id:'rare',name:'Rare',color:'#7eafd4',chance:28},
  {id:'epic',name:'Epic',color:'#b495de',chance:14},
  {id:'legendary',name:'Legendary',color:'#edc96b',chance:3},
];
export const TROPHY_CHANCE = .25;
const QUALITIES = ['Beautiful','Lovely','Scrappy'];
export const createTrophyBook = () => ({version:2,cards:{}});
const tenth = n => Math.round(n * 10) / 10;

export function rollTrophy(random = Math.random) {
  const sample = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Invalid random sample.');
    return value;
  };
  if (sample() >= TROPHY_CHANCE) return null;
  const roll = sample() * 100;
  let threshold = 0;
  for (const rarity of RARITIES) {
    threshold += rarity.chance;
    if (roll < threshold) return rarity;
  }
}

function validateRecord(record, key, version = 2) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Invalid trophy record.');
  const species = SPECIES.find(s => s.id === record.speciesId);
  if (!species || !Number.isFinite(record.bestWeight) || record.bestWeight < species.min || record.bestWeight > species.max
    || !RARITIES.some(r => r.id === record.rarityId) || key !== `${record.speciesId}:${record.rarityId}`
    || record.bestWeight !== tenth(record.bestWeight)
    || !Number.isSafeInteger(record.count) || record.count < 1
    || !Number.isInteger(record.place) || record.place < 0 || record.place > 2
    || !QUALITIES.includes(record.quality)
    || typeof record.caughtAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.caughtAt)
    || !Number.isFinite(Date.parse(record.caughtAt))) {
    throw new TypeError('Invalid trophy record fields.');
  }
  if (version === 1) {
    const legacyThresholds = [0,.5,.8,.95];
    const legacyRarity = RARITIES.findLast((r,i) => record.bestWeight >= Math.ceil((species.min + (species.max-species.min)*legacyThresholds[i])*10-1e-8)/10);
    if (legacyRarity.id !== record.rarityId) throw new TypeError('Invalid legacy trophy rarity.');
  }
  return {
    speciesId:record.speciesId,rarityId:record.rarityId,bestWeight:record.bestWeight,
    count:record.count,place:record.place,quality:record.quality,caughtAt:record.caughtAt,
  };
}

export function parseTrophyBook(raw) {
  const data = JSON.parse(raw);
  if (!data || ![1,2].includes(data.version) || !data.cards || typeof data.cards !== 'object' || Array.isArray(data.cards)
    || Object.keys(data.cards).length > SPECIES.length * RARITIES.length) {
    throw new TypeError('Invalid saved trophy room.');
  }
  const book = createTrophyBook();
  for (const [key, record] of Object.entries(data.cards)) book.cards[key] = validateRecord(record,key,data.version);
  return book;
}

export function recordTrophy(book, caught) {
  const key = `${caught.speciesId}:${caught.rarityId}`;
  const specimen = validateRecord({
    speciesId:caught.speciesId,rarityId:caught.rarityId,bestWeight:tenth(caught.weight),
    count:1,place:caught.place,quality:caught.quality,caughtAt:caught.caughtAt,
  },key);
  const rarity = RARITIES.find(r => r.id === caught.rarityId);
  const previous = book.cards[key];
  const isNew = !previous;
  const isBest = isNew || specimen.bestWeight > previous.bestWeight;
  const record = isBest ? specimen : {...previous};
  record.count = (previous?.count || 0) + 1;
  book.cards[key] = validateRecord(record,key);
  return {key,rarity,record:book.cards[key],isNew,isBest};
}
