import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:100,increment:10,counters:{"stars":10},check:r=>(r.score===r.stars*10&&r.won===(r.stars===10)),});
