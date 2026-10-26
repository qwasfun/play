import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
export const rules=createResultRules({manifest,cap:600,increment:20,counters:{"handled":24,"caught":24,"lives":3},check:r=>(r.caught<=r.handled&&r.score>=r.caught*20&&r.score<=r.caught*40&&r.won===(r.caught===24)),});
