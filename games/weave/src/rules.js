import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:500,counters:{"steps": 25},check:r=>r.score===(r.won?500:0)});
