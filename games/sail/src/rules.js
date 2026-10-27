import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:540,counters:{lives:3,handled:18,passed:18},check:r=>r.score===r.passed*30&&r.passed<=r.handled&&(r.won?r.handled===18&&r.lives>0:r.lives===0)});
