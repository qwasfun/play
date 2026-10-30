import { art as kiteArt } from '@playground/game-kite/art';
import { art as orchardSortArt } from '@playground/game-orchard-sort/art';
import { art as jugsArt } from '@playground/game-jugs/art';
import { art as weaveArt } from '@playground/game-weave/art';
import { art as courierArt } from '@playground/game-courier/art';
import { art as windmillArt } from '@playground/game-windmill/art';
import { art as lanternArt } from '@playground/game-lantern/art';
import { art as sailArt } from '@playground/game-sail/art';
import { art as balanceArt } from '@playground/game-balance/art';
import { art as pebbleArt } from '@playground/game-pebble/art';
export { games, byId, gameRules } from './index.js';
import { art as starArt } from '@playground/game-star/art';
import { art as bridgeArt } from '@playground/game-bridge/art';
import { art as lightsArt } from '@playground/game-lights/art';
import { art as echoArt } from '@playground/game-echo/art';
import { art as catchArt } from '@playground/game-catch/art';
import { art as bounceArt } from '@playground/game-bounce/art';
import { art as pairsArt } from '@playground/game-pairs/art';
import { art as mergeArt } from '@playground/game-merge/art';
import { art as ringsArt } from '@playground/game-rings/art';
import { art as snakeArt } from '@playground/game-snake/art';
import { art as boxesArt } from '@playground/game-boxes/art';
import { art as pipesArt } from '@playground/game-pipes/art';
import { art as jumpArt } from '@playground/game-jump/art';
import { art as bubblesArt } from '@playground/game-bubbles/art';
import { art as slideArt } from '@playground/game-slide/art';
import { art as rhythmArt } from '@playground/game-rhythm/art';
import { art as constellationArt } from '@playground/game-constellation/art';
import { art as towerArt } from '@playground/game-tower/art';
import { art as rainArt } from '@playground/game-rain/art';
import { art as minesArt } from '@playground/game-mines/art';
export const campaignLoaders = {
  jugs: () => import('@playground/game-jugs/campaign'),
  weave: () => import('@playground/game-weave/campaign'),
  pebble: () => import('@playground/game-pebble/campaign'),
  balance: () => import('@playground/game-balance/campaign'),
  constellation: () => import('@playground/game-constellation/campaign'),
  bubbles: () => import('@playground/game-bubbles/campaign'),
  merge: () => import('@playground/game-merge/campaign'),
  pairs: () => import('@playground/game-pairs/campaign'),
  echo: () => import('@playground/game-echo/campaign'),
  courier: () => import('@playground/game-courier/campaign'),
  windmill: () => import('@playground/game-windmill/campaign'),
  sail: () => import('@playground/game-sail/campaign'),
  lantern: () => import('@playground/game-lantern/campaign'),
  rain: () => import('@playground/game-rain/campaign'),
  tower: () => import('@playground/game-tower/campaign'),
  rhythm: () => import('@playground/game-rhythm/campaign'),
  jump: () => import('@playground/game-jump/campaign'),
  snake: () => import('@playground/game-snake/campaign'),
  rings: () => import('@playground/game-rings/campaign'),
  bounce: () => import('@playground/game-bounce/campaign'),
  catch: () => import('@playground/game-catch/campaign'),
  bridge: () => import('@playground/game-bridge/campaign'),
  star: () => import('@playground/game-star/campaign'),
  boxes: () => import('@playground/game-boxes/campaign'),
  pipes: () => import('@playground/game-pipes/campaign'),
  mines: () => import('@playground/game-mines/campaign'),
  lights: () => import('@playground/game-lights/campaign'),
  slide: () => import('@playground/game-slide/campaign'),
};
export const illustrations = {
  kite: kiteArt,
  'orchard-sort': orchardSortArt,
  star: starArt,
  bridge: bridgeArt,
  lights: lightsArt,
  echo: echoArt,
  catch: catchArt,
  bounce: bounceArt,
  pairs: pairsArt,
  merge: mergeArt,
  rings: ringsArt,
  snake: snakeArt,
  boxes: boxesArt,
  pipes: pipesArt,
  jump: jumpArt,
  bubbles: bubblesArt,
  slide: slideArt,
  rhythm: rhythmArt,
  constellation: constellationArt,
  tower: towerArt,
  rain: rainArt,
  mines: minesArt,
  lantern: lanternArt,
  sail: sailArt,
  balance: balanceArt,
  pebble: pebbleArt,
  windmill: windmillArt,
  courier: courierArt,
  weave: weaveArt,
  jugs: jugsArt,
};
export const loaders = {
  kite: () => import('@playground/game-kite'),
  'orchard-sort': () => import('@playground/game-orchard-sort'),
  windmill: () => import('@playground/game-windmill'),
  courier: () => import('@playground/game-courier'),
  weave: () => import('@playground/game-weave'),
  jugs: () => import('@playground/game-jugs'),

  lantern: () => import('@playground/game-lantern'),
  sail: () => import('@playground/game-sail'),
  balance: () => import('@playground/game-balance'),
  pebble: () => import('@playground/game-pebble'),

  star: () => import('@playground/game-star'),
  bridge: () => import('@playground/game-bridge'),
  lights: () => import('@playground/game-lights'),
  echo: () => import('@playground/game-echo'),
  catch: () => import('@playground/game-catch'),
  bounce: () => import('@playground/game-bounce'),
  pairs: () => import('@playground/game-pairs'),
  merge: () => import('@playground/game-merge'),
  rings: () => import('@playground/game-rings'),
  snake: () => import('@playground/game-snake'),
  boxes: () => import('@playground/game-boxes'),
  pipes: () => import('@playground/game-pipes'),
  jump: () => import('@playground/game-jump'),
  bubbles: () => import('@playground/game-bubbles'),
  slide: () => import('@playground/game-slide'),
  rhythm: () => import('@playground/game-rhythm'),
  constellation: () => import('@playground/game-constellation'),
  tower: () => import('@playground/game-tower'),
  rain: () => import('@playground/game-rain'),
  mines: () => import('@playground/game-mines'),
};
