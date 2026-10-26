import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:12000,increment:10,counters:{"cleared":60,"round":3},check:r=>(r.round>=1&&r.won===(r.cleared===60)),});
