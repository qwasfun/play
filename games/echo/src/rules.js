import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:12,increment:0,counters:{"rounds":12},check:r=>(r.score===r.rounds&&r.won===(r.rounds===12)),format:r=>`${r.rounds??r.score} 轮`,stored:r=>Number.isInteger(r.rounds)&&r.rounds>=0&&r.rounds<=12,});
