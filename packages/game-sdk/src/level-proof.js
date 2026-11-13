// Fixed-step replay shared by the browser recorder and the server verifier.
export const MAX_LEVEL_TICKS = 108000;
const types = new Set([
  'primary-down',
  'primary-up',
  'primary-move',
  'primary-cancel',
  'key-down',
  'key-up',
  'undo',
]);
export function recordLevel(createGame, options) {
  let tick = 0,
    finished = false,
    overflow = false;
  const events = [];
  const engine = createGame({
    ...options,
    onFinish(result) {
      finished = true;
      options.onFinish?.({ ...result, levelProof: overflow ? null : { ticks: tick, events } });
    },
  });
  return {
    ...engine,
    update(dt) {
      if (!finished) tick++;
      if (tick > MAX_LEVEL_TICKS) overflow = true;
      engine.update(dt);
    },
    input(type, payload = {}) {
      if (!finished && !overflow) {
        const clean = {};
        for (const key of ['x', 'y', 'key', 'repeat'])
          if (payload[key] !== undefined) clean[key] = payload[key];
        if (events.length < 6000) events.push([tick, type, clean]);
        else overflow = true;
      }
      engine.input(type, payload);
    },
  };
}
export function replayLevel(createGame, level, proof) {
  if (
    !proof ||
    !Number.isInteger(proof.ticks) ||
    proof.ticks < 0 ||
    proof.ticks > MAX_LEVEL_TICKS ||
    !Array.isArray(proof.events) ||
    proof.events.length > 6000
  )
    throw Error('关卡操作：请完成在线对局后提交，最多支持 30 分钟及 6000 次操作');
  let tick = 0,
    result;
  const engine = createGame({
    level,
    seed: 0,
    onFinish: (value) => {
      result = value;
    },
  });
  try {
    for (const event of proof.events) {
      if (!Array.isArray(event) || event.length !== 3)
        throw Error('关卡操作：记录格式无效，请重新游玩');
      const [at, type, payload] = event;
      if (
        !Number.isInteger(at) ||
        at < tick ||
        at > proof.ticks ||
        !types.has(type) ||
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        Object.keys(payload).some((key) => !['x', 'y', 'key', 'repeat'].includes(key)) ||
        ['x', 'y'].some(
          (key) =>
            payload[key] !== undefined &&
            (!Number.isFinite(payload[key]) || Math.abs(payload[key]) > 10000),
        ) ||
        (payload.key !== undefined &&
          (typeof payload.key !== 'string' || payload.key.length > 32)) ||
        (payload.repeat !== undefined && typeof payload.repeat !== 'boolean')
      )
        throw Error('关卡操作：记录内容无效，请重新游玩');
      while (tick < at && !result) {
        tick++;
        engine.update(1 / 60);
      }
      if (result) throw Error('关卡操作：通关后不能追加操作，请重新游玩');
      engine.input(type, payload);
    }
    while (tick < proof.ticks && !result) {
      tick++;
      engine.update(1 / 60);
    }
    if (!result || tick !== proof.ticks) throw Error('关卡操作：尚未完成有效结算，请重新完成本关');
    return result;
  } finally {
    engine.destroy?.();
  }
}
