import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:3200,increment:50,counters:{"hits":32,"perfects":32,"combo":32,"lives":5},check:r=>(r.perfects<=r.hits&&r.combo<=r.hits&&r.score===(r.hits+r.perfects)*50),});
