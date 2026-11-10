import { describeFormat } from '../model/common/matchFormat.js';

// View-model pieces shared by the menu's resume card and the game screen.

const dashed = (counts) => counts.join('-');

export function progressText(state) {
  return state.config.sets.enabled
    ? `Sets ${dashed(state.setsWon)} · Legs ${dashed(state.legsWonInCurrentSet)}`
    : `Legs ${dashed(state.legsWonTotal)}`;
}

export function targetText(config) {
  return config.sets.enabled ? describeFormat(config.sets.format, 'set') : describeFormat(config.legs.format, 'leg');
}

export function wonText(state, seat) {
  return state.config.sets.enabled
    ? `Sets ${state.setsWon[seat]} · Legs ${state.legsWonInCurrentSet[seat]}`
    : `Legs ${state.legsWonTotal[seat]}`;
}

export function resumeModel(activeGame, parts) {
  const { session, players } = activeGame;
  const rows = session.type.scoreboard(session.state);
  return {
    typeLabel: session.type.label,
    description: session.type.describeConfig(session.config),
    players: players.map((p, i) => ({ name: p.name, score: parts.scoreText(rows[i]) })),
    progress: `${progressText(session.state)}, ${targetText(session.config).toLowerCase()}`,
  };
}
