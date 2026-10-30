import { manifest as orchardSort } from '@playground/game-orchard-sort/manifest';
import { rules as orchardSortRules } from '@playground/game-orchard-sort/rules';
import { manifest as jugs } from '@playground/game-jugs/manifest';
import { rules as jugsRules } from '@playground/game-jugs/rules';
import { manifest as weave } from '@playground/game-weave/manifest';
import { rules as weaveRules } from '@playground/game-weave/rules';
import { manifest as courier } from '@playground/game-courier/manifest';
import { rules as courierRules } from '@playground/game-courier/rules';
import { manifest as windmill } from '@playground/game-windmill/manifest';
import { rules as windmillRules } from '@playground/game-windmill/rules';
import { manifest as lantern } from '@playground/game-lantern/manifest';
import { rules as lanternRules } from '@playground/game-lantern/rules';
import { manifest as sail } from '@playground/game-sail/manifest';
import { rules as sailRules } from '@playground/game-sail/rules';
import { manifest as balance } from '@playground/game-balance/manifest';
import { rules as balanceRules } from '@playground/game-balance/rules';
import { manifest as pebble } from '@playground/game-pebble/manifest';
import { rules as pebbleRules } from '@playground/game-pebble/rules';
import { manifest as star } from '@playground/game-star/manifest';
import { rules as starRules } from '@playground/game-star/rules';
import { manifest as bridge } from '@playground/game-bridge/manifest';
import { rules as bridgeRules } from '@playground/game-bridge/rules';
import { manifest as lights } from '@playground/game-lights/manifest';
import { rules as lightsRules } from '@playground/game-lights/rules';
import { manifest as echo } from '@playground/game-echo/manifest';
import { rules as echoRules } from '@playground/game-echo/rules';
import { manifest as catchGame } from '@playground/game-catch/manifest';
import { rules as catchRules } from '@playground/game-catch/rules';
import { manifest as bounce } from '@playground/game-bounce/manifest';
import { rules as bounceRules } from '@playground/game-bounce/rules';
import { manifest as pairs } from '@playground/game-pairs/manifest';
import { rules as pairsRules } from '@playground/game-pairs/rules';
import { manifest as merge } from '@playground/game-merge/manifest';
import { rules as mergeRules } from '@playground/game-merge/rules';
import { manifest as rings } from '@playground/game-rings/manifest';
import { rules as ringsRules } from '@playground/game-rings/rules';
import { manifest as snake } from '@playground/game-snake/manifest';
import { rules as snakeRules } from '@playground/game-snake/rules';
import { manifest as boxes } from '@playground/game-boxes/manifest';
import { rules as boxesRules } from '@playground/game-boxes/rules';
import { manifest as pipes } from '@playground/game-pipes/manifest';
import { rules as pipesRules } from '@playground/game-pipes/rules';
import { manifest as jump } from '@playground/game-jump/manifest';
import { rules as jumpRules } from '@playground/game-jump/rules';
import { manifest as bubbles } from '@playground/game-bubbles/manifest';
import { rules as bubblesRules } from '@playground/game-bubbles/rules';
import { manifest as slide } from '@playground/game-slide/manifest';
import { rules as slideRules } from '@playground/game-slide/rules';
import { manifest as rhythm } from '@playground/game-rhythm/manifest';
import { rules as rhythmRules } from '@playground/game-rhythm/rules';
import { manifest as constellation } from '@playground/game-constellation/manifest';
import { rules as constellationRules } from '@playground/game-constellation/rules';
import { manifest as tower } from '@playground/game-tower/manifest';
import { rules as towerRules } from '@playground/game-tower/rules';
import { manifest as rain } from '@playground/game-rain/manifest';
import { rules as rainRules } from '@playground/game-rain/rules';
import { manifest as mines } from '@playground/game-mines/manifest';
import { rules as minesRules } from '@playground/game-mines/rules';
export const games = [
  star,
  bridge,
  lights,
  echo,
  catchGame,
  bounce,
  pairs,
  merge,
  rings,
  snake,
  boxes,
  pipes,
  jump,
  bubbles,
  slide,
  rhythm,
  constellation,
  tower,
  rain,
  mines,
  lantern,
  sail,
  balance,
  pebble,
  windmill,
  courier,
  weave,
  jugs,
  orchardSort,
];
export const byId = Object.fromEntries(games.map((game) => [game.id, game]));
export function leaderboardPolicy(id) {
  return byId[id]?.leaderboard || { normal: false, daily: false, reason: '排行榜：该游戏尚未开放' };
}
export const gameRules = {
  'orchard-sort': orchardSortRules,
  star: starRules,
  bridge: bridgeRules,
  lights: lightsRules,
  echo: echoRules,
  catch: catchRules,
  bounce: bounceRules,
  pairs: pairsRules,
  merge: mergeRules,
  rings: ringsRules,
  snake: snakeRules,
  boxes: boxesRules,
  pipes: pipesRules,
  jump: jumpRules,
  bubbles: bubblesRules,
  slide: slideRules,
  rhythm: rhythmRules,
  constellation: constellationRules,
  tower: towerRules,
  rain: rainRules,
  mines: minesRules,
  lantern: lanternRules,
  sail: sailRules,
  balance: balanceRules,
  pebble: pebbleRules,
  windmill: windmillRules,
  courier: courierRules,
  weave: weaveRules,
  jugs: jugsRules,
};
