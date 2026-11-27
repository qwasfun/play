export const ACORN_GLIDE = {
  shots: 6,
  bullScore: 200,
  ringScore: 100,
  limit: 75,
  friction: 1.6,
  stopSpeed: 18,
  minSpeed: 330,
  maxSpeed: 520,
  launchScale: 8,
  restDelay: 0.58,
  angleStep: 5,
  powerStep: 0.05,
  minPower: 0.55,
  maxPower: 1,
};

export const START = { x: 300, y: 405 };

function hashSeed(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function speedFor(power) {
  return ACORN_GLIDE.minSpeed + power * (ACORN_GLIDE.maxSpeed - ACORN_GLIDE.minSpeed);
}

export function targetPoint(item) {
  const radians = (item.angle * Math.PI) / 180;
  const distance = (speedFor(item.power) - ACORN_GLIDE.stopSpeed) / ACORN_GLIDE.friction;
  return {
    x: START.x + Math.sin(radians) * distance,
    y: START.y - Math.cos(radians) * distance,
  };
}

export function pullPoint(item) {
  const radians = (item.angle * Math.PI) / 180;
  const pull = speedFor(item.power) / ACORN_GLIDE.launchScale;
  return {
    x: START.x - Math.sin(radians) * pull,
    y: START.y + Math.cos(radians) * pull,
  };
}

export function generateCourse(seed) {
  const next = random(seed);
  const choices = [];
  for (const angle of [-15, -10, -5, 0, 5, 10, 15])
    for (const power of [0.6, 0.7, 0.8, 0.9]) choices.push({ angle, power });
  for (let index = choices.length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }
  const course = [];
  const angles = new Set();
  for (const choice of choices) {
    if (angles.has(choice.angle) && angles.size < ACORN_GLIDE.shots) continue;
    course.push(choice);
    angles.add(choice.angle);
    if (course.length === ACORN_GLIDE.shots) return course;
  }
  return choices.slice(0, ACORN_GLIDE.shots);
}
