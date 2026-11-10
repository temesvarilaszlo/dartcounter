import { el } from '../dom.js';
import { entryDisplay, keypad } from '../components/keypad.js';
import { formatDecimal, formatInteger } from '../format.js';

const UNDO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';

export const glyph = '501';

export const scoreText = (row) => String(row.remaining);

const stats = (row) => [
  { label: 'Darts', value: formatInteger(row.darts) },
  { label: 'Avg', value: formatDecimal(row.average) },
  { label: 'Last', value: formatInteger(row.lastScore) },
];

// seats: [{ name, active, row, won, notIn }] in throw order; `row` comes from type.scoreboard.
export function scoreboard(seats) {
  return el('ol', { class: 'scoreboard', 'data-seats': String(seats.length) },
    seats.map((seat) => el('li', { class: 'seat', 'data-active': seat.active ? '' : null, 'aria-current': seat.active ? 'true' : null },
      el('div', { class: 'seat__head' },
        el('span', { class: 'seat__name' }, seat.name),
        seat.active ? el('span', { class: 'seat__marker' }, 'To throw') : null,
        el('span', { class: 'seat__won' }, seat.won)),
      el('div', { class: 'seat__score', 'aria-label': `${seat.name}: ${seat.row.remaining} left` }, String(seat.row.remaining)),
      seat.notIn ? el('p', { class: 'seat__note' }, 'Needs a double to start') : null,
      el('dl', { class: 'seat__stats' },
        stats(seat.row).map((s) => el('div', {}, el('dt', {}, s.label), el('dd', {}, s.value)))))));
}

// Keypad panel. Returns the element plus setEntry() so typing never rebuilds the screen.
export function inputPanel({ canUndo }, handlers) {
  const display = entryDisplay({ placeholder: 'Score' });
  const element = el('div', { class: 'input-panel' },
    el('div', { class: 'entry' },
      el('button', {
        class: 'btn btn--undo', type: 'button', disabled: !canUndo, onClick: handlers.onUndo,
      }, el('span', { class: 'btn__icon', html: UNDO_ICON }), 'Undo'),
      display.value),
    display.error,
    keypad({ onDigit: handlers.onDigit, onBackspace: handlers.onBackspace, onOk: handlers.onOk }));
  return { element, setEntry: display.set };
}
