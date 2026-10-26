import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
import {generateStarSchedule} from './model.js';
export const rules=createResultRules({manifest,cap:500,increment:10,counters:{"lives":3},check:r=>(!r.won||r.elapsed>=manifest.limit-.05),seedCap:seed=>generateStarSchedule(seed).filter(item=>item.type==='mail').length*10,});
