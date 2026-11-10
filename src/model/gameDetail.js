import { matchProgress } from './common/matchFormat.js';

// Everything the game detail screen shows, derived from a finished game record.
export function buildGameDetail(game, type) {
  const { config, legs } = game;
  const progress = matchProgress(config, legs.map((leg) => leg.winnerIndex)).legs;
  return {
    stats: type.gameStats(config, legs),
    legs: legs.map((leg, i) => ({
      index: i,
      setIndex: progress[i].setIndex,
      legIndexInSet: progress[i].legIndexInSet,
      winnerIndex: leg.winnerIndex,
      setWinnerIndex: progress[i].setWinnerIndex,
      stats: type.legStats(config, leg),
      history: type.legHistory(config, leg),
    })),
  };
}

// The match score in seat order: sets when sets were played, otherwise legs.
export function scoreLine(game) {
  const { config, result } = game;
  const unit = config.sets.enabled ? 'sets' : 'legs';
  const counts = config.sets.enabled ? result.setsWon : result.legsWon;
  return {
    unit,
    players: config.playerIds.map((id) => ({ id, count: counts[id] ?? 0, winner: id === result.winnerId })),
  };
}
