import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:600,counters:{"hits": 12, "lives": 3},check:r=>r.score===r.hits*50&&r.won===(r.hits===12)});
