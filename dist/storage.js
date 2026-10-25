import {GAME_IDS, compareResult, validDate} from './core.js';
const KEY = 'tiny-break-arcade:v1';
const empty = () => ({version:1,favorites:[],recent:[],sound:false,best:{},daily:{}});
const isRecord = r => r && typeof r === 'object' && Number.isFinite(r.score) && r.score >= 0 && Number.isFinite(r.elapsed) && r.elapsed >= 0 && typeof r.won === 'boolean' && (!('steps' in r) || Number.isFinite(r.steps) && r.steps >= 0) && (!('rounds' in r) || Number.isFinite(r.rounds) && r.rounds >= 0);
const validRecord = (id,r) => isRecord(r) && (id !== 'lights' || Number.isInteger(r.steps) && r.steps >= 0) && (id !== 'echo' || Number.isInteger(r.rounds) && r.rounds >= 0 && r.rounds <= 12);
export function createStore(storage, onUnavailable = () => {}) {
  let data = empty(), unavailable = false;
  const warn = () => { if (!unavailable) { unavailable = true; onUnavailable(); } };
  try {
    if (!storage) throw new Error('unavailable');
    storage.setItem(`${KEY}:probe`, '1'); storage.removeItem(`${KEY}:probe`);
    const raw = storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) {
        for (const field of ['favorites','recent']) data[field] = [...new Set((Array.isArray(parsed[field]) ? parsed[field] : []).filter(id => GAME_IDS.includes(id)))].slice(0,4);
        data.sound = parsed.sound === true;
        for (const id of GAME_IDS) if (validRecord(id,parsed.best?.[id])) data.best[id] = parsed.best[id];
        for (const [date, entries] of Object.entries(parsed.daily || {})) if (validDate(date) && entries && typeof entries === 'object') {
          data.daily[date] = {};
          for (const id of GAME_IDS) if (validRecord(id,entries[id])) data.daily[date][id] = entries[id];
        }
      }
    }
  } catch(error) { if(error instanceof SyntaxError)data=empty();else warn(); }
  const save = () => { try { if (!storage) throw new Error('unavailable'); storage.setItem(KEY, JSON.stringify(data)); } catch { warn(); } };
  return {
    get data() { return data; },
    toggleFavorite(id) { if (!GAME_IDS.includes(id)) return; data.favorites = data.favorites.includes(id) ? data.favorites.filter(x=>x!==id) : [...data.favorites,id]; save(); },
    recent(id) { if (!GAME_IDS.includes(id)) return; data.recent = [id,...data.recent.filter(x=>x!==id)].slice(0,4); save(); },
    sound(value) { data.sound = Boolean(value); save(); },
    record(id, result, date = '') {
      if (!GAME_IDS.includes(id) || !validRecord(id,result) || date && !validDate(date)) return false;
      const clean = {score:result.score,elapsed:result.elapsed,won:result.won};
      if (Number.isFinite(result.steps)) clean.steps=result.steps;
      if (Number.isFinite(result.rounds)) clean.rounds=result.rounds;
      const records = date ? (data.daily[date] ||= {}) : data.best;
      const improved = compareResult(id,clean,records[id]);
      if (improved) records[id] = clean;
      if (date && compareResult(id,clean,data.best[id])) data.best[id] = clean;
      save(); return improved;
    }
  };
}
