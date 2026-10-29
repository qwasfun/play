import { gameRules } from './index.js';
import { cleanResult as legacyCleanResult } from '@playground/game-sdk/rules';
export { nicknameError } from '@playground/game-sdk/rules';
export function cleanResult(value, id) {
  return id ? gameRules[id].clean(value) : legacyCleanResult(value);
}
export function validateResult(id, value, context) {
  return (
    gameRules[id]?.validate(value, context) || [
      { field: 'gameId', code: 'invalid_game', message: '游戏：请选择已开放的游戏' },
    ]
  );
}
