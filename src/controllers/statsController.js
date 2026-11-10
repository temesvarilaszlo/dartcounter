import {
  activeFilterCount, allTimeStats, datePresets, emptyFilters, filterGames, filterOptions, rankPlayers,
} from '../model/statsService.js';
import { scoreLine } from '../model/gameDetail.js';
import { buildExport, exportFileName, parseBackup, planImport } from '../model/persistence/backup.js';
import { renderFilterSheet, renderStats } from '../views/screens/statsView.js';
import { openModal } from '../views/components/modal.js';
import { showToast } from '../views/components/toast.js';
import { downloadText, pickTextFile } from '../views/components/files.js';
import { el } from '../views/dom.js';
import { formatDate, formatStat, plural } from '../views/format.js';

const toggled = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

// A chip group is only worth showing when there is a choice to make.
const worthShowing = (group) => group.options.length > 1 || group.selected.length > 0;

function sectionModel(section, stats) {
  if (section.kind === 'rows') {
    return { ...section, rows: section.rows.map((row) => ({ label: row.label, value: formatStat(stats[row.key], row.format) })) };
  }
  if (section.kind === 'buckets') {
    const counts = stats[section.key];
    const max = Math.max(1, ...Object.values(counts));
    return {
      ...section,
      bars: section.buckets.map((bucket, i) => ({ label: bucket.label, count: counts[bucket.key], share: counts[bucket.key] / max, top: i === 0 })),
    };
  }
  // legsByStartScore
  return {
    kind: 'table',
    label: section.label,
    columns: ['Start score', 'Best', 'Worst'],
    rows: stats[section.key].map((r) => [String(r.startScore), formatStat(r.bestLeg, 'darts'), formatStat(r.worstLeg, 'darts')]),
  };
}

// The tab, game type, player and filters survive leaving the screen, so coming
// back from a game's detail lands where the user left off.
export class StatsController {
  constructor(ctx) {
    this.ctx = ctx;
    this.filters = emptyFilters();
    this.typeId = null;
    this.playerId = null;
    this.games = [];
    this.players = [];
  }

  async show({ query }) {
    this.tab = query.tab === 'history' ? 'history' : 'allTime';
    const token = (this.token = {});
    await this.load();
    if (this.token !== token) return;
    this.render();
  }

  leave() {
    this.token = null;
    this.sheet = null;
  }

  async load() {
    const { registry, viewParts, repos } = this.ctx;
    const [games, players] = await Promise.all([repos.games.list(), repos.players.list()]);
    this.games = games.filter((game) => registry.has(game.type) && viewParts[game.type]);
    this.players = players;
  }

  playerName(id) {
    return this.players.find((p) => p.id === id)?.name ?? 'Unknown player';
  }

  allTimeModel() {
    const { registry, viewParts } = this.ctx;
    const types = registry.list().filter((type) => viewParts[type.id]);
    if (!types.some((t) => t.id === this.typeId)) this.typeId = types[0].id;
    const type = registry.get(this.typeId);
    const ranked = rankPlayers(this.games, this.players, this.typeId);
    if (!ranked.some((p) => p.id === this.playerId)) this.playerId = ranked[0]?.id ?? null;
    const stats = this.playerId ? allTimeStats(this.games, registry, this.typeId, this.playerId) : null;
    return {
      types: types.map((t) => ({ value: t.id, label: t.label })),
      typeId: this.typeId,
      typeLabel: type.label,
      players: ranked.map((p) => ({ value: p.id, label: p.name })),
      playerId: this.playerId,
      empty: stats ? null : `No finished ${type.label} games yet.`,
      highlights: stats ? type.allTime.highlights.map((h) => ({ label: h.label, value: formatStat(stats[h.key], h.format) })) : [],
      sections: stats ? type.allTime.sections.map((s) => sectionModel(s, stats)) : [],
    };
  }

  historyModel() {
    const { registry } = this.ctx;
    const shown = filterGames(this.games, this.filters);
    const filterCount = activeFilterCount(this.filters);
    return {
      total: this.games.length,
      filterCount,
      countText: filterCount ? `${shown.length} of ${plural(this.games.length, 'game')}` : plural(shown.length, 'game'),
      empty: this.games.length ? 'No games match these filters.' : 'No finished games yet. Games appear here once they are finished.',
      rows: shown.map((game) => {
        const type = registry.get(game.type);
        const score = scoreLine(game);
        const solo = score.players.length === 1;
        return {
          id: game.id,
          date: formatDate(game.finishedAt),
          description: `${type.label} ${type.describeConfig(game.config)}`,
          unit: score.unit,
          players: score.players.map((p) => ({ name: this.playerName(p.id), count: p.count, winner: p.winner && !solo })),
        };
      }),
    };
  }

  render() {
    renderStats(this.ctx.root, {
      tab: this.tab,
      allTime: this.tab === 'allTime' ? this.allTimeModel() : null,
      history: this.tab === 'history' ? this.historyModel() : null,
    }, {
      onTab: (tab) => {
        this.tab = tab;
        window.history.replaceState(null, '', tab === 'history' ? '#/stats?tab=history' : '#/stats');
        this.render();
      },
      onType: (typeId) => {
        this.typeId = typeId;
        this.render();
      },
      onPlayer: (playerId) => {
        this.playerId = playerId;
        this.render();
      },
      onDelete: (id) => this.confirmDelete(id),
      onOpenFilters: () => this.openFilters(),
      onClearFilters: () => this.updateFilters(emptyFilters()),
      onExport: () => this.exportBackup(),
      onImport: () => pickTextFile('application/json,.json', (text) => this.importBackup(text)),
    });
  }

  // --- Filters (bottom sheet) ---

  filterModel() {
    const f = this.filters;
    const opts = filterOptions(this.games, this.players, this.ctx.registry, f.type);
    const shown = filterGames(this.games, f).length;
    const groups = [
      { key: 'type', label: 'Game', options: opts.types, selected: f.type ? [f.type] : [] },
      { key: 'playerIds', label: 'Players', options: opts.players, selected: f.playerIds },
      { key: 'playerCounts', label: 'Number of players', options: opts.playerCounts, selected: f.playerCounts },
      { key: 'sets', label: 'Sets', options: opts.sets, selected: f.sets === null ? [] : [f.sets] },
      { key: 'modes', label: 'Format', options: opts.modes, selected: f.modes },
      { key: 'values', label: 'Length (legs or sets)', options: opts.values, selected: f.values },
      ...opts.typeFields.map((tf) => ({ key: `typeFields.${tf.key}`, label: tf.label, options: tf.options, selected: f.typeFields[tf.key] ?? [] })),
    ];
    return {
      groups: groups.filter(worthShowing),
      date: {
        presets: datePresets(new Date()).map((p) => ({
          value: p.key, label: p.label, selected: f.dateFrom === p.dateFrom && f.dateTo === p.dateTo,
        })),
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
      },
      resultText: `Show ${plural(shown, 'game')}`,
      canClear: activeFilterCount(f) > 0,
    };
  }

  openFilters() {
    const body = el('div', { class: 'sheet' });
    const modal = openModal({ title: 'Filter games', className: 'modal--sheet', body: [body], onDismiss: () => { this.sheet = null; } });
    this.sheet = { body, close: modal.close };
    this.renderSheet();
  }

  renderSheet() {
    if (!this.sheet) return;
    renderFilterSheet(this.sheet.body, this.filterModel(), {
      onToggle: (key, value) => this.toggleFilter(key, value),
      onPreset: (key) => {
        const preset = datePresets(new Date()).find((p) => p.key === key);
        const active = this.filters.dateFrom === preset.dateFrom && this.filters.dateTo === preset.dateTo;
        this.updateFilters({ ...this.filters, dateFrom: active ? null : preset.dateFrom, dateTo: active ? null : preset.dateTo });
      },
      onDate: (key, value) => this.updateFilters({ ...this.filters, [key]: value }),
      onClearFilters: () => this.updateFilters(emptyFilters()),
      onCloseFilters: () => {
        this.sheet.close();
        this.sheet = null;
      },
    });
  }

  toggleFilter(key, value) {
    const f = this.filters;
    if (key === 'type') {
      this.updateFilters({ ...f, type: f.type === value ? null : value, typeFields: {} });
    } else if (key === 'sets') {
      this.updateFilters({ ...f, sets: f.sets === value ? null : value });
    } else if (key.startsWith('typeFields.')) {
      const field = key.slice('typeFields.'.length);
      this.updateFilters({ ...f, typeFields: { ...f.typeFields, [field]: toggled(f.typeFields[field] ?? [], value) } });
    } else {
      this.updateFilters({ ...f, [key]: toggled(f[key], value) });
    }
  }

  updateFilters(filters) {
    this.filters = filters;
    this.render();
    this.renderSheet();
  }

  // --- Delete ---

  confirmDelete(id) {
    const game = this.games.find((g) => g.id === id);
    const type = this.ctx.registry.get(game.type);
    openModal({
      title: 'Delete this game?',
      body: [`${type.label} ${type.describeConfig(game.config)}, ${formatDate(game.finishedAt)}. It will be removed from the history and the stats for good.`],
      actions: [
        { label: 'Keep it', variant: 'quiet' },
        { label: 'Delete', variant: 'danger', onClick: () => this.deleteGame(id) },
      ],
    });
  }

  async deleteGame(id) {
    try {
      await this.ctx.repos.games.delete(id);
      showToast('Game deleted.');
    } catch (error) {
      console.error('Deleting the game failed', error);
      showToast("Couldn't delete the game. Try again.");
    }
    await this.refresh();
  }

  async refresh() {
    const token = this.token;
    await this.load();
    if (this.token === token) this.render();
  }

  // --- Backup ---

  async exportBackup() {
    const [games, players] = await Promise.all([this.ctx.repos.games.list(), this.ctx.repos.players.list()]);
    const data = buildExport({ players, games, now: () => new Date().toISOString() });
    downloadText(exportFileName(new Date()), JSON.stringify(data, null, 2));
    showToast(`Exported ${plural(games.length, 'game')}.`);
  }

  async importBackup(text) {
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      openModal({ title: "Couldn't import", body: [parsed.error], actions: [{ label: 'OK', variant: 'quiet' }] });
      return;
    }
    const { repos } = this.ctx;
    const [games, players] = await Promise.all([repos.games.list(), repos.players.list()]);
    const plan = planImport(parsed.data, { players, games });
    if (plan.games.length === 0) {
      openModal({
        title: 'Nothing to import',
        body: [`All ${plural(parsed.data.games.length, 'game')} in this file are already here.`],
        actions: [{ label: 'OK', variant: 'quiet' }],
      });
      return;
    }
    openModal({
      title: 'Import games?',
      body: [
        `${plural(plan.games.length, 'game')} and ${plural(plan.players.length, 'new player')} will be added.`,
        plan.skippedGames ? `${plural(plan.skippedGames, 'game')} already here will be skipped.` : null,
        plan.mergedPlayers ? `${plural(plan.mergedPlayers, 'player')} will be matched to existing players by name.` : null,
      ].filter(Boolean),
      actions: [
        { label: 'Cancel', variant: 'quiet' },
        { label: 'Import', variant: 'primary', onClick: () => this.saveImport(plan) },
      ],
    });
  }

  async saveImport(plan) {
    try {
      await this.ctx.repos.games.saveAll({ games: plan.games, players: plan.players });
      showToast(`Imported ${plural(plan.games.length, 'game')}.`);
    } catch (error) {
      console.error('Import failed', error);
      showToast("Couldn't import the backup. Nothing was changed.");
    }
    await this.refresh();
  }
}
