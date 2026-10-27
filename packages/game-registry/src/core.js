import {games,gameRules} from './index.js';
import {hash,beijingDate,validDate} from '@playground/game-sdk';
export {hash,rng,roundRect,label,beijingDate,validDate} from '@playground/game-sdk';
export const RULE_VERSION = 1;
export const GAME_IDS = Object.freeze(games.map(game=>game.id));
export const EXPANDED_DAILY_START = '2026-10-27';
export const TWELVE_DAILY_START = '2026-11-04';
export const SIXTEEN_DAILY_START = '2026-11-16';
export const TWENTY_DAILY_START = '2026-12-02';
export const TWENTY_FOUR_DAILY_START = '2027-01-11';
const LEGACY_DAILY_IDS = Object.freeze(['star','bridge','lights','echo']);
const EXPANDED_DAILY_IDS = Object.freeze(['catch','bounce','pairs','merge',...LEGACY_DAILY_IDS]);
const TWELVE_DAILY_IDS = Object.freeze(['rings','snake','boxes','pipes',...EXPANDED_DAILY_IDS]);
const SIXTEEN_DAILY_IDS = Object.freeze(['jump','bubbles','slide','rhythm',...TWELVE_DAILY_IDS]);
const TWENTY_DAILY_IDS = Object.freeze(['constellation','tower','rain','mines',...SIXTEEN_DAILY_IDS]);






const TWENTY_FOUR_DAILY_IDS=Object.freeze(['lantern','sail','balance','pebble',...TWENTY_DAILY_IDS]);
export function dailyGame(date) {
  if (!validDate(date)) throw new Error('挑战日期：请使用有效的 YYYY-MM-DD 日期');
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  if(date < EXPANDED_DAILY_START) return LEGACY_DAILY_IDS[((day % 4) + 4) % 4];
  if(date >= TWENTY_FOUR_DAILY_START){
    const start=Math.floor(Date.parse(`${TWENTY_FOUR_DAILY_START}T00:00:00Z`)/86400000);
    return TWENTY_FOUR_DAILY_IDS[(day-start)%TWENTY_FOUR_DAILY_IDS.length];
  }
  if(date >= TWENTY_DAILY_START){
    const start=Math.floor(Date.parse(`${TWENTY_DAILY_START}T00:00:00Z`)/86400000);
    return TWENTY_DAILY_IDS[(day-start)%TWENTY_DAILY_IDS.length];
  }
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
export function compareResult(id,next,previous){return gameRules[id].compare(next,previous);}
export function resultText(id,result){return gameRules[id].format(result);}
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
