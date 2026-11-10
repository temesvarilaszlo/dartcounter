import { describeConfig, filterFields, normalizeConfig, preGameSchema, validateConfig } from './config.js';
import { applyDart, applyTurn, endTurn, evaluateInput, reopenTurn, replay } from './replay.js';
import {
  allTime, board, gameStats, gameStatsRows, legHistory, legStats, legStatsRows, scoreboard,
} from './stats.js';

export const cricket = {
  id: 'cricket',
  label: 'Cricket',
  description: 'Close 15 to 20 and Bull',
  inputMode: 'dartPad',
  preGameSchema,
  validateConfig,
  normalizeConfig,
  describeConfig,
  replay,
  evaluateInput,
  applyTurn,
  applyDart,
  endTurn,
  reopenTurn,
  legStats,
  legStatsRows,
  legHistory,
  gameStats,
  gameStatsRows,
  allTime,
  filterFields,
  scoreboard,
  board,
};
