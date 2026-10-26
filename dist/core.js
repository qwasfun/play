import {games} from './catalog.js';
export const RULE_VERSION = 1;
export const GAME_IDS = Object.freeze(games.map(game=>game.id));
export const EXPANDED_DAILY_START = '2026-10-27';
export const TWELVE_DAILY_START = '2026-11-04';
export const SIXTEEN_DAILY_START = '2026-11-16';
const LEGACY_DAILY_IDS = Object.freeze(['star','bridge','lights','echo']);
const EXPANDED_DAILY_IDS = Object.freeze(['catch','bounce','pairs','merge',...LEGACY_DAILY_IDS]);
const TWELVE_DAILY_IDS = Object.freeze(['rings','snake','boxes','pipes',...EXPANDED_DAILY_IDS]);
const SIXTEEN_DAILY_IDS = Object.freeze(['jump','bubbles','slide','rhythm',...TWELVE_DAILY_IDS]);
export function hash(value) {
  let h = 2166136261;
  for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
export function label(ctx, value, x, y, size = 16, color = '#233c39', align = 'center', weight = 600) {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y);
}
export function beijingDate(now = Date.now()) { return new Date(Number(now) + 8 * 3600000).toISOString().slice(0, 10); }
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function dailyGame(date) {
  if (!validDate(date)) throw new Error('挑战日期：请使用有效的 YYYY-MM-DD 日期');
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  if(date < EXPANDED_DAILY_START) return LEGACY_DAILY_IDS[((day % 4) + 4) % 4];
  if(date >= SIXTEEN_DAILY_START){
    const start=Math.floor(Date.parse(`${SIXTEEN_DAILY_START}T00:00:00Z`)/86400000);
    return SIXTEEN_DAILY_IDS[(day-start)%SIXTEEN_DAILY_IDS.length];
  }
  if(date >= TWELVE_DAILY_START){
    const start=Math.floor(Date.parse(`${TWELVE_DAILY_START}T00:00:00Z`)/86400000);
    return TWELVE_DAILY_IDS[(day-start)%TWELVE_DAILY_IDS.length];
  }
  // Keep each dated pool fixed so previously shared challenge links never change games.
  const start = Math.floor(Date.parse(`${EXPANDED_DAILY_START}T00:00:00Z`) / 86400000);
  return EXPANDED_DAILY_IDS[(day-start)%EXPANDED_DAILY_IDS.length];
}
export function dailySeed(date, id, version = RULE_VERSION) { return hash(`${date}:${id}:v${version}`); }
export function playLink(id, date = '') { return `#/play/${id}${date ? `?date=${date}&v=${RULE_VERSION}` : ''}`; }
export function compareResult(id, next, previous) {
  if (!previous) return true;
  if (id === 'lights') {
    if (next.won !== previous.won) return next.won;
    if (!next.won) return false;
    if (next.steps !== previous.steps) return next.steps < previous.steps;
    return next.elapsed < previous.elapsed;
  }
  return next.score > previous.score || (next.score === previous.score && next.elapsed < previous.elapsed);
}
export function resultText(id, result) {
  if (!result) return '等待你的第一个纪录';
  if (id === 'lights') return result.won ? `${result.steps} 步 · ${Math.ceil(result.elapsed)} 秒` : '已尝试，等待点亮灵感';
  if (id === 'echo') return `${result.rounds ?? result.score} 轮`;
  return `${result.score} 分`;
}
export function parseRoute(fragment, today = beijingDate()) {
  const [path, query = ''] = fragment.replace(/^#/, '').split('?');
  if (path === '/daily') return { type: 'play', id: dailyGame(today), date: today };
  if (path === '/favorites') return { type: 'favorites' };
  if (path?.startsWith('/play/')) {
    const id = path.split('/')[2];
    if (!GAME_IDS.includes(id)) return { type: 'error', message: '游戏：没有找到这款游戏，请返回首页选择。' };
    const params = new URLSearchParams(query), date = params.get('date');
    if (date !== null) {
      if (!validDate(date)) return { type: 'error', message: '挑战日期：请使用有效的 YYYY-MM-DD 日期。' };
      if (date > today) return { type: 'error', message: '挑战日期：未来挑战尚未开放，请选择今天或过去的日期。' };
      if (params.get('v') && params.get('v') !== String(RULE_VERSION)) return { type: 'error', message: '挑战版本：暂不支持此规则版本，请从首页进入当前挑战。' };
      if (dailyGame(date) !== id) return { type: 'error', message: '挑战游戏：与所选日期不符，请从每日挑战入口重新进入。' };
    }
    return { type: 'play', id, date: date || '' };
  }
  return { type: 'home' };
}
