import { describeConfig, normalizeConfig, preGameSchema, validateConfig } from './config.js';
import { applyTurn, evaluateInput, replay } from './replay.js';
import { gameStats, gameStatsRows, legStats } from './stats.js';

export const x01 = {
  id: 'x01',
  label: 'X01',
  description: 'Count down to zero',
  inputMode: 'numpad',
  preGameSchema,
  validateConfig,
  normalizeConfig,
  describeConfig,
  replay,
  evaluateInput,
  applyTurn,
  legStats,
  gameStats,
  gameStatsRows,
};
