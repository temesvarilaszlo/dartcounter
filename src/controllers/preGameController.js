import { MAX_PLAYERS } from '../config.js';
import { FORMAT_MODES, FORMAT_MODE_LABELS, stepFormat, switchFormatMode } from '../model/common/matchFormat.js';
import { randomId } from '../model/common/ids.js';
import { movePlayer, prepareGame, rematchForm, restoreForm, suggestPlayers, validateForm } from '../model/preGame.js';
import { renderPreGame } from '../views/screens/preGameView.js';
import { openKeypadModal } from '../views/components/keypad.js';
import { openModal } from '../views/components/modal.js';
import { plural } from '../views/format.js';

const MODE_OPTIONS = FORMAT_MODES.map((value) => ({ value, label: FORMAT_MODE_LABELS[value] }));

// legsToWinSet is a plain first-to count; the stepper treats it like one.
const FORMAT_PATHS = {
  legs: { get: (f) => f.legs.format, set: (f, format) => { f.legs.format = format; } },
  sets: { get: (f) => f.sets.format, set: (f, format) => { f.sets.format = format; } },
  legsToWinSet: {
    get: (f) => ({ mode: 'firstTo', value: f.sets.legsToWinSet }),
    set: (f, format) => { f.sets.legsToWinSet = format.value; },
  },
};

function stepperModel(format, unit, error) {
  return {
    mode: format.mode,
    display: plural(format.value, unit),
    canDecrease: stepFormat(format, -1) !== format,
    canIncrease: stepFormat(format, 1) !== format,
    error,
  };
}

export class PreGameController {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async show({ params, query }) {
    const { registry, viewParts, lastConfig, repos } = this.ctx;
    if (!registry.has(params.typeId) || !viewParts[params.typeId]) {
      this.ctx.navigate('#/');
      return;
    }
    const token = (this.token = {});
    this.type = registry.get(params.typeId);
    let rematch = null;
    if (query.rematch) {
      const [game, players] = await Promise.all([repos.games.get(query.rematch), repos.players.list()]);
      if (this.token !== token) return;
      if (game?.type === this.type.id) rematch = rematchForm(this.type, game, players);
    }
    this.form = rematch ?? restoreForm(this.type, lastConfig.get(this.type.id));
    this.touched = new Set();
    this.existing = [];
    this.render();
    const existing = await repos.players.list();
    if (this.token !== token) return;
    this.existing = existing;
    this.view.refresh(this.model());
  }

  leave() {
    this.token = null;
  }

  model() {
    const { form, type } = this;
    const { ok, playerErrors, errors } = validateForm(type, form);
    const count = form.players.length;
    const players = form.players.map((p, i) => ({
      name: p.name,
      // An empty row only complains once it has been left empty.
      error: p.name.trim() || this.touched.has(i) ? playerErrors[i] : null,
      first: i === 0,
      movable: count > 1,
      canUp: i > 0,
      canDown: i < count - 1,
      canRemove: count > 1,
    }));
    const emptyNames = form.players.some((p) => !p.name.trim());
    return {
      title: `${type.label} setup`,
      typeHeading: type.label,
      players,
      playersError: errors.players,
      canAddPlayer: count < MAX_PLAYERS,
      suggestions: count < MAX_PLAYERS || emptyNames ? suggestPlayers(this.existing, form) : [],
      match: {
        setsEnabled: form.sets.enabled,
        legs: { key: 'legs', label: 'Legs', unit: 'leg', modeOptions: MODE_OPTIONS, format: stepperModel(form.legs.format, 'leg'), error: errors['legs.format'] },
        sets: { key: 'sets', label: 'Sets', unit: 'set', modeOptions: MODE_OPTIONS, format: stepperModel(form.sets.format, 'set'), error: errors['sets.format'] },
        legsToWinSet: stepperModel(FORMAT_PATHS.legsToWinSet.get(form), 'leg', errors['sets.legsToWinSet']),
      },
      typeFields: type.preGameSchema.map((field) => {
        const value = form.typeConfig[field.key];
        const isPreset = field.options.some((o) => o.value === value);
        return {
          key: field.key,
          label: field.label,
          options: field.options,
          value,
          custom: field.custom ? { label: field.custom.label, active: !isPreset, display: String(value) } : null,
          error: errors[field.key],
        };
      }),
      canStart: ok,
      startHint: emptyNames ? 'Enter a name for each player' : null,
    };
  }

  render() {
    this.view = renderPreGame(this.ctx.root, this.model(), {
      onName: (i, name) => {
        this.form.players[i].name = name;
        this.view.refresh(this.model());
      },
      onNameBlur: (i) => {
        this.touched.add(i);
        this.view.refresh(this.model());
      },
      onMove: (i, delta) => this.update(() => { this.form.players = movePlayer(this.form.players, i, delta); }),
      onRemove: (i) => this.update(() => { this.form.players.splice(i, 1); }),
      onAdd: () => this.update(() => { this.form.players.push({ name: '' }); }),
      onSuggest: (player) => this.update(() => {
        const empty = this.form.players.find((p) => !p.name.trim());
        if (empty) empty.name = player.name;
        else this.form.players.push({ name: player.name });
      }),
      onSetsToggle: (enabled) => this.update(() => { this.form.sets.enabled = enabled; }),
      onMode: (key, mode) => this.update(() => {
        const path = FORMAT_PATHS[key];
        path.set(this.form, switchFormatMode(path.get(this.form), mode));
      }),
      onStep: (key, direction) => this.update(() => {
        const path = FORMAT_PATHS[key];
        path.set(this.form, stepFormat(path.get(this.form), direction));
      }),
      onField: (key, value) => this.update(() => { this.form.typeConfig[key] = value; }),
      onCustom: (key) => this.editCustom(key),
      onStart: () => this.start(),
    });
  }

  update(change) {
    change();
    this.render();
  }

  editCustom(key) {
    const field = this.type.preGameSchema.find((f) => f.key === key);
    const { min, max, label } = field.custom;
    openKeypadModal({
      title: `${label} ${field.label.toLowerCase()}`,
      maxDigits: String(max).length,
      validate: (text) => (text ? field.validate(field.parse(text)) : `Enter ${min} to ${max}`),
      onConfirm: (text) => this.update(() => { this.form.typeConfig[key] = field.parse(text); }),
    });
  }

  start() {
    if (!validateForm(this.type, this.form).ok) return;
    const begin = () => {
      const { activeGame, lastConfig } = this.ctx;
      const { config, players } = prepareGame(this.type, this.form, this.existing, {
        newId: randomId, now: () => new Date().toISOString(),
      });
      lastConfig.set(this.type.id, { ...this.form, players: players.map(({ id, name }) => ({ id, name })) });
      activeGame.start(this.type.id, config, players);
      this.ctx.navigate('#/game');
    };
    this.ctx.activeGame.load();
    if (!this.ctx.activeGame.session) {
      begin();
      return;
    }
    openModal({
      title: 'Discard the game in progress?',
      body: ['Starting a new game deletes the unfinished one.'],
      actions: [
        { label: 'Keep it', variant: 'quiet' },
        { label: 'Discard and start', variant: 'danger', onClick: begin },
      ],
    });
  }
}
