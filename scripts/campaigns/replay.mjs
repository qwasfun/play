import { boardPoint } from '../../packages/game-sdk/src/level.js';
const keyDirection = (a, b, cols) =>
  b - a === 1
    ? 'ArrowRight'
    : b - a === -1
      ? 'ArrowLeft'
      : b - a === cols
        ? 'ArrowDown'
        : 'ArrowUp';
/** Uses only public engine input/update; also records a browser-replayable input stream. */
export function playLevel(id, level, engine, solution = []) {
  const events = [];
  let frame = 0;
  const state = () => engine.getState(),
    done = () => state().finished || state().done;
  const input = (type, payload = {}) => {
    if (done()) return;
    events.push({ frame, type, payload });
    engine.input(type, payload);
  };
  const key = (key) => input('key-down', { key }),
    tap = (p) => {
      input('primary-down', p);
      input('primary-up', p);
    };
  const update = (frames = 1) => {
    for (let i = 0; i < frames && !done(); i++) {
      engine.update(1 / 60);
      frame++;
    }
  };
  const until = (time) => {
    while (frame / 60 < time - 1e-9 && !done()) update();
  };
  const cell = (i, cols, rows = cols, bounds) => tap(boardPoint(i, cols, rows, bounds));
  if (id === 'echo') {
    until(0.6 + level.sequence.length * level.beat + 0.35);
    for (const i of solution) {
      key(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][i]);
      update(2);
    }
  }
  if (id === 'pairs') {
    until(level.preview + 0.05);
    for (const i of solution) {
      cell(i, level.cols, Math.ceil(level.board.length / level.cols));
      update(3);
    }
  }
  if (id === 'merge')
    for (const dir of solution) {
      key({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[dir]);
      update(3);
    }
  if (id === 'bubbles')
    for (const i of solution) {
      cell(i, level.size);
      update(3);
    }
  if (id === 'balance')
    for (const i of solution) {
      cell(
        i,
        level.weights.length <= 6 ? 3 : 5,
        Math.ceil(level.weights.length / (level.weights.length <= 6 ? 3 : 5)),
        { x: 20, y: 160, width: 560, height: 400 },
      );
      update(3);
    }
  if (id === 'pebble')
    for (const [a, , c] of solution) {
      cell(a, 5);
      cell(c, 5);
      update(3);
    }
  if (id === 'jugs')
    for (const i of solution) {
      cell(i, 3, 2, { x: 20, y: 330, width: 560, height: 240 });
      update(3);
    }
  if (id === 'weave')
    for (const i of solution) {
      cell(i, 5, 5, { x: 110, y: 110, width: 470, height: 470 });
      update(3);
    }
  if (id === 'constellation')
    for (const i of solution) {
      tap(level.nodes[i]);
      update(3);
    }
  if (id === 'courier') {
    let from = level.start;
    for (const to of solution) {
      key(keyDirection(from, to, 6));
      from = to;
      update(8);
    }
  }
  if (id === 'snake') {
    let from = 64;
    for (const to of solution) {
      const direction = keyDirection(from, to, 12),
        current = state().direction,
        wanted =
          direction === 'ArrowRight'
            ? { x: 1, y: 0 }
            : direction === 'ArrowLeft'
              ? { x: -1, y: 0 }
              : direction === 'ArrowDown'
                ? { x: 0, y: 1 }
                : { x: 0, y: -1 };
      if (current.x !== wanted.x || current.y !== wanted.y) update(Math.floor(level.step * 30));
      key(direction);
      const before = state().body[0];
      for (
        let ticks = 0;
        ticks < 30 && !done() && state().body[0].x === before.x && state().body[0].y === before.y;
        ticks++
      )
        update();
      from = to;
    }
  }
  if (id === 'star') {
    const groups = new Map();
    for (const e of level.schedule) {
      const list = groups.get(e.time) || [];
      list.push(e);
      groups.set(e.time, list);
    }
    for (const [time, list] of groups) {
      const mail = list.find((e) => e.type === 'mail'),
        lane = mail ? mail.lane : 1 - list[0].lane;
      until(time - 0.18);
      if (state().lane !== lane) key(' ');
      until(time + 0.02);
    }
    until(level.endTime + 0.1);
  }
  if (id === 'catch') {
    const crossings = level.schedule
      .map((e) => ({ ...e, at: e.time + (429 - (e.type === 'rock' ? 16 : 15)) / e.speed }))
      .sort((a, b) => a.at - b.at);
    for (const e of crossings) {
      until(e.at - 0.12);
      input('primary-down', { x: e.type === 'fruit' ? e.x : e.x < 300 ? 500 : 100, y: 420 });
      until(e.at + 0.03);
      input('primary-up', { x: e.type === 'fruit' ? e.x : e.x < 300 ? 500 : 100, y: 420 });
    }
    until(level.endTime + 0.1);
  }
  if (id === 'rain')
    for (const e of level.schedule) {
      until(e.crossTime - 0.12);
      input('primary-down', { x: e.x, y: 330 });
      until(e.crossTime + 0.02);
      input('primary-up', { x: e.x, y: 330 });
    }
  if (id === 'bridge')
    for (let i = 0; i < level.target; i++) {
      const island = level.islands[i];
      while (state().phase !== 'idle' && !done()) update();
      input('primary-down', { x: 300, y: 250 });
      update(Math.round(((island.gap + island.width / 2) / island.speed) * 60));
      input('primary-up', { x: 300, y: 250 });
      update(80);
    }
  if (id === 'jump')
    for (const e of level.schedule) {
      until(e.time - 0.52);
      key(' ');
      until(e.time + 0.65);
    }
  if (id === 'rhythm')
    for (const e of level.schedule) {
      until(e.time);
      key(['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'][e.lane]);
      update();
    }
  if (id === 'tower') {
    for (let guard = 0; guard < 20000 && !done(); guard++) {
      const s = state();
      if (s.phase === 'moving' && Math.abs(s.moving.x - s.top.x) < 2.5) key(' ');
      update();
    }
  }
  if (id === 'lantern')
    for (let i = 0; i < level.schedule.length && !done(); i++) {
      until(i * level.period + level.preview + 0.12);
      const c = level.schedule[i];
      tap({ x: 120 + (c % 3) * 180, y: 127.5 + Math.floor(c / 3) * 125 });
      until((i + 1) * level.period + 0.01);
    }
  if (id === 'sail')
    for (let i = 0; i < level.gates.length && !done(); i++) {
      until(i * level.interval + 0.2);
      const target = level.gates[i];
      while (state().lane !== target && !done())
        key(state().lane < target ? 'ArrowRight' : 'ArrowLeft');
      until((i + 1) * level.interval + 0.01);
    }
  if (id === 'windmill')
    for (let guard = 0; guard < 15000 && !done(); guard++) {
      const s = state(),
        delta = Math.abs(Math.atan2(Math.sin(s.angle - s.target), Math.cos(s.angle - s.target)));
      if (delta < level.window * 0.3) key(' ');
      update();
    }
  if (id === 'rings')
    for (let guard = 0; guard < 20000 && !done(); guard++) {
      const s = state();
      if (s.phase === 'aim') {
        update(10);
        let velocity;
        for (let t = 0.8; t <= 1.5; t += 0.005) {
          const vx = (s.target.x - 88 - (s.wind * t * t) / 2) / t,
            vy = (s.target.y - 390 - 165 * t * t) / t,
            power = Math.hypot(vx, vy),
            angle = Math.atan2(-vy, vx);
          if (power >= 310 && power <= 480 && angle >= 0.6 && angle <= 1.23) {
            velocity = { vx, vy };
            break;
          }
        }
        if (!velocity) throw Error(`ring aim ${level.number}`);
        input('primary-down', { x: 260, y: 250 });
        input('primary-move', { x: 260 - velocity.vx / 3.7, y: 250 - velocity.vy / 3.7 });
        input('primary-up', { x: 260 - velocity.vx / 3.7, y: 250 - velocity.vy / 3.7 });
      }
      update();
    }
  if (id === 'bounce') {
    // Predict the next paddle crossing including wall reflections; vary the rebound
    // to cover all brick columns instead of entering a periodic vertical orbit.
    let target,
      lastVy = 0,
      rebounds = 0;
    for (let guard = 0; guard < 60000 && !done(); guard++) {
      const s = state(),
        b = s.ball;
      if (b.vy < 0 && lastVy > 0) rebounds++;
      lastVy = b.vy;
      if (s.phase === 'serve') target = 300;
      else if (b.vy > 0) {
        let x = b.x + b.vx * Math.max(0, (418 - b.y) / b.vy),
          span = 540;
        const phase = (((x - 30) % (span * 2)) + span * 2) % (span * 2);
        x = 30 + (phase <= span ? phase : span * 2 - phase);
        const offset = Math.sin(rebounds * 2.399 + level.number) * 25;
        target = Math.max(78, Math.min(522, x - offset));
      } else target = b.x;
      if (guard === 0) input('primary-down', { x: target, y: 430 });
      else if (guard % 3 === 0 || b.y > 390) input('primary-move', { x: target, y: 430 });
      update();
    }
  }
  return { events, frames: frame, state: state() };
}
