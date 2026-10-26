import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:1800,increment:50,counters:{"progress":12,"lives":3},check:r=>(r.score>=r.progress*100&&r.score<=r.progress*150&&r.won===(r.progress===12)),});
