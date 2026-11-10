import { el } from '../dom.js';
import { field, segmented, stepper, toggle } from '../components/controls.js';

const ARROW_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const iconButton = (label, icon, onClick, disabled = false) => el('button', {
  class: 'icon-btn', type: 'button', 'aria-label': label, html: icon, disabled, onClick,
});

function playerRow(player, index, handlers, refs) {
  const input = el('input', {
    class: 'player-row__input',
    type: 'text',
    value: player.name,
    maxlength: '20',
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'aria-label': `Player ${index + 1} name`,
    onInput: (event) => handlers.onName(index, event.target.value),
    onBlur: () => handlers.onNameBlur(index),
  });
  const error = el('p', { class: 'player-row__error', role: 'alert' }, player.error ?? '');
  refs.rowErrors.push(error);
  const name = player.name || `player ${index + 1}`;
  return el('li', { class: 'player-row', 'data-first': player.first ? '' : null },
    el('span', { class: 'player-row__order', 'aria-hidden': 'true' }, String(index + 1)),
    input,
    el('div', { class: 'player-row__meta' },
      el('div', { class: 'player-row__notes' },
        player.first ? el('span', { class: 'player-row__first' }, 'Throws first') : null,
        error),
      player.movable ? iconButton(`Move ${name} up`, ARROW_UP, () => handlers.onMove(index, -1), !player.canUp) : null,
      player.movable ? iconButton(`Move ${name} down`, ARROW_DOWN, () => handlers.onMove(index, 1), !player.canDown) : null,
      player.canRemove ? iconButton(`Remove ${name}`, CROSS, () => handlers.onRemove(index)) : null));
}

function suggestionChips(suggestions, handlers) {
  return suggestions.map((player) => el('button', {
    class: 'chip', type: 'button', onClick: () => handlers.onSuggest(player),
  }, `+ ${player.name}`));
}

function formatControl({ key, label, unit, format, modeOptions, error }, handlers) {
  return field(label, el('div', { class: 'format' },
    segmented({ label: `${label} mode`, options: modeOptions, value: format.mode, onChange: (mode) => handlers.onMode(key, mode) }),
    stepper({
      label: `${label} (${unit})`,
      display: format.display,
      canDecrease: format.canDecrease,
      canIncrease: format.canIncrease,
      onDecrease: () => handlers.onStep(key, -1),
      onIncrease: () => handlers.onStep(key, 1),
    })), error);
}

function typeField(f, handlers) {
  const extra = f.custom
    ? [el('button', {
      class: 'segmented__option segmented__option--custom',
      type: 'button',
      'aria-pressed': String(f.custom.active),
      onClick: () => handlers.onCustom(f.key),
    }, f.custom.active ? `${f.custom.label}: ${f.custom.display}` : f.custom.label)]
    : [];
  return field(f.label, segmented({
    label: f.label, options: f.options, value: f.custom?.active ? null : f.value, onChange: (value) => handlers.onField(f.key, value), extra,
  }), f.error);
}

export function renderPreGame(root, vm, handlers) {
  const refs = { rowErrors: [] };
  refs.suggestions = el('div', { class: 'chips', 'aria-label': 'Known players' }, suggestionChips(vm.suggestions, handlers));
  refs.start = el('button', { class: 'btn btn--primary btn--wide', type: 'button', disabled: !vm.canStart, onClick: handlers.onStart }, 'Start game');
  refs.hint = el('p', { class: 'pregame__hint' }, vm.startHint ?? '');

  const { match } = vm;
  root.replaceChildren(
    el('section', { class: 'screen pregame' },
      el('header', { class: 'pregame__header' },
        el('a', { class: 'back-link', href: '#/' }, '‹ Menu'),
        el('h1', { class: 'screen__title' }, vm.title)),
      el('div', { class: 'pregame__body' },
        el('section', { class: 'pregame__section', 'aria-labelledby': 'pg-players' },
          el('h2', { class: 'pregame__heading', id: 'pg-players' }, 'Players'),
          el('ol', { class: 'player-list' }, vm.players.map((p, i) => playerRow(p, i, handlers, refs))),
          vm.playersError ? el('p', { class: 'field__error', role: 'alert' }, vm.playersError) : null,
          vm.canAddPlayer ? el('button', { class: 'btn btn--quiet', type: 'button', onClick: handlers.onAdd }, 'Add player') : null,
          refs.suggestions),
        el('section', { class: 'pregame__section', 'aria-labelledby': 'pg-match' },
          el('h2', { class: 'pregame__heading', id: 'pg-match' }, 'Match'),
          toggle({ label: 'Play sets', checked: match.setsEnabled, onChange: handlers.onSetsToggle }),
          match.setsEnabled
            ? [
              formatControl(match.sets, handlers),
              field('Legs to win a set', stepper({
                label: 'Legs to win a set',
                display: match.legsToWinSet.display,
                canDecrease: match.legsToWinSet.canDecrease,
                canIncrease: match.legsToWinSet.canIncrease,
                onDecrease: () => handlers.onStep('legsToWinSet', -1),
                onIncrease: () => handlers.onStep('legsToWinSet', 1),
              }), match.legsToWinSet.error),
            ]
            : formatControl(match.legs, handlers)),
        el('section', { class: 'pregame__section', 'aria-labelledby': 'pg-type' },
          el('h2', { class: 'pregame__heading', id: 'pg-type' }, vm.typeHeading),
          vm.typeFields.map((f) => typeField(f, handlers)))),
      el('footer', { class: 'pregame__footer' }, refs.hint, refs.start)),
  );

  // While a name is typed only these parts change, so the input keeps focus.
  return {
    refresh(next) {
      next.players.forEach((p, i) => { if (refs.rowErrors[i]) refs.rowErrors[i].textContent = p.error ?? ''; });
      refs.suggestions.replaceChildren(...suggestionChips(next.suggestions, handlers));
      refs.start.disabled = !next.canStart;
      refs.hint.textContent = next.startHint ?? '';
    },
  };
}
