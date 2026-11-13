import { rng } from '@playground/game-sdk';
export function generateStarSchedule(seed) {
  const random = rng(`${seed}:star-schedule`);
  const events = [];
  let time = 3.1;
  while (time < 59.4) {
    const lane = random() < 0.5 ? 0 : 1;
    events.push({ time, lane, type: 'mail' });
    if (random() > 0.2) events.push({ time, lane: 1 - lane, type: 'rock' });
    time += 1.25 + random() * 0.45;
  }
  return events.sort((a, b) => a.time - b.time);
}
