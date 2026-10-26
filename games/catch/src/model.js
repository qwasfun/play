import {rng} from '@playground/game-sdk';
export function generateHarvest(seed) {
  const random = rng(`${seed}:orchard`);
  const schedule = [];
  let time = 0.65;
  for (let index = 0; time < 56.8; index++) {
    const type = index % 5 === 4 ? 'rock' : 'fruit';
    schedule.push({
      id: index, time, type, x: 60 + random() * 480,
      speed: 125 + random() * 35 + time * 0.5,
      variety: Math.floor(random() * 3), rotation: random() * Math.PI,
    });
    time += 0.62 + random() * 0.22;
  }
  return schedule;
}
