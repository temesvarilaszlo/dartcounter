import { buildGameDetail, scoreLine } from '../model/gameDetail.js';
import { renderGameDetail } from '../views/screens/gameDetailView.js';
import { showToast } from '../views/components/toast.js';
import { formatDateTime, formatStat } from '../views/format.js';

const statRows = (definitions, perSeat) => definitions.map((row) => ({
  label: row.label,
  values: perSeat.map((stats) => formatStat(stats[row.key], row.format)),
}));

export class GameDetailController {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async show({ params }) {
    const token = (this.token = {});
    const { repos, registry, viewParts } = this.ctx;
    const [game, players] = await Promise.all([repos.games.get(params.id), repos.players.list()]);
    if (this.token !== token) return;
    if (!game || !registry.has(game.type) || !viewParts[game.type]) {
      showToast("That game doesn't exist any more.");
      this.ctx.navigate('#/stats?tab=history');
      return;
    }
    this.game = game;
    this.names = game.config.playerIds.map((id) => players.find((p) => p.id === id)?.name ?? 'Unknown player');
    this.tab = 'details';
    this.render();
  }

  leave() {
    this.token = null;
  }

  model() {
    const { game, names } = this;
    const type = this.ctx.registry.get(game.type);
    const detail = buildGameDetail(game, type);
    const score = scoreLine(game);
    const setsOn = game.config.sets.enabled;
    return {
      title: `${type.label} ${type.describeConfig(game.config)}`,
      date: formatDateTime(game.finishedAt),
      unit: setsOn ? 'Sets' : 'Legs',
      players: score.players.map((p, seat) => ({ name: names[seat], count: p.count, winner: p.winner && names.length > 1 })),
      names,
      stats: statRows(type.gameStatsRows, detail.stats),
      legs: detail.legs.map((leg) => ({
        title: setsOn ? `Set ${leg.setIndex + 1}, leg ${leg.legIndexInSet + 1}` : `Leg ${leg.index + 1}`,
        winner: `${names[leg.winnerIndex]} won${leg.setWinnerIndex !== null ? ' the set' : ''}`,
        stats: statRows(type.legStatsRows, leg.stats),
        history: leg.history,
      })),
      tab: this.tab,
    };
  }

  render() {
    renderGameDetail(this.ctx.root, this.model(), this.ctx.viewParts[this.game.type], {
      onTab: (tab) => {
        this.tab = tab;
        this.render();
      },
      onRematch: () => this.ctx.navigate(`#/new/${this.game.type}?rematch=${encodeURIComponent(this.game.id)}`),
    });
  }
}
