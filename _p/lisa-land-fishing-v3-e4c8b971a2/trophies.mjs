import {SPECIES} from './fishing.mjs?v=trophies-1';

export const RARITIES = [
  {id:'normal',name:'Normal',color:'#a2b695',percent:0},
  {id:'rare',name:'Rare',color:'#7eafd4',percent:.5},
  {id:'epic',name:'Epic',color:'#b495de',percent:.8},
  {id:'legendary',name:'Legendary',color:'#edc96b',percent:.95},
];
const QUALITIES = ['Beautiful','Lovely','Scrappy'];
export const createTrophyBook = () => ({version:1,cards:{}});
const tenth = n => Math.round(n * 10) / 10;

export function rarityMinimum(species, rarity) {
  return Math.ceil((species.min + (species.max - species.min) * rarity.percent) * 10 - 1e-8) / 10;
}

export function rarityForCatch(speciesId, weight) {
  const species = SPECIES.find(s => s.id === speciesId);
  if (!species || !Number.isFinite(weight) || weight < species.min || weight > species.max) {
    throw new TypeError('Invalid trophy species or weight.');
  }
  const rounded = tenth(weight);
  return [...RARITIES].reverse().find(r => rounded >= rarityMinimum(species,r));
}

function validateRecord(record, key) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Invalid trophy record.');
  const rarity = rarityForCatch(record.speciesId,record.bestWeight);
  if (rarity.id !== record.rarityId || key !== `${record.speciesId}:${record.rarityId}`
    || record.bestWeight !== tenth(record.bestWeight)
    || !Number.isSafeInteger(record.count) || record.count < 1
    || !Number.isInteger(record.place) || record.place < 0 || record.place > 2
    || !QUALITIES.includes(record.quality)
    || typeof record.caughtAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.caughtAt)
    || !Number.isFinite(Date.parse(record.caughtAt))) {
    throw new TypeError('Invalid trophy record fields.');
  }
  return {
    speciesId:record.speciesId,rarityId:record.rarityId,bestWeight:record.bestWeight,
    count:record.count,place:record.place,quality:record.quality,caughtAt:record.caughtAt,
  };
}

export function parseTrophyBook(raw) {
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !data.cards || typeof data.cards !== 'object' || Array.isArray(data.cards)
    || Object.keys(data.cards).length > SPECIES.length * RARITIES.length) {
    throw new TypeError('Invalid saved trophy room.');
  }
  const book = createTrophyBook();
  for (const [key, record] of Object.entries(data.cards)) book.cards[key] = validateRecord(record,key);
  return book;
}

export function recordTrophy(book, caught) {
  const rarity = rarityForCatch(caught.speciesId,caught.weight);
  const key = `${caught.speciesId}:${rarity.id}`;
  const previous = book.cards[key];
  const weight = tenth(caught.weight);
  const isNew = !previous;
  const isBest = isNew || weight > previous.bestWeight;
  const record = isBest ? {
    speciesId:caught.speciesId,rarityId:rarity.id,bestWeight:weight,
    place:caught.place,quality:caught.quality,caughtAt:caught.caughtAt,
  } : {...previous};
  record.count = (previous?.count || 0) + 1;
  book.cards[key] = validateRecord(record,key);
  return {key,rarity,record:book.cards[key],isNew,isBest};
}
