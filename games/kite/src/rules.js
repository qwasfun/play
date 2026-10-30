import {createResultRules} from '@playground/game-sdk/rules';
import {manifest} from './manifest.js';
import {FLIGHT} from './course.js';
export const rules=createResultRules({
  manifest,cap:1200,increment:100,counters:{passed:12,handled:12,lives:3},
  labels:{handled:'经过花环数',passed:'穿过花环数'},
  check:r=>r.score===r.passed*100 && r.passed<=r.handled &&
    r.lives===3-(r.handled-r.passed) &&
    r.won===(r.handled===12&&r.passed>=10) &&
    (r.won||r.lives===0||r.elapsed>=FLIGHT.limit) &&
    (r.handled===0||r.elapsed+0.02>=(FLIGHT.first-FLIGHT.x)/FLIGHT.speed+(r.handled-1)*FLIGHT.spacing)
});
