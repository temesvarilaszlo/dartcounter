import { el } from '../dom.js';
import { entryDisplay, keypad } from '../components/keypad.js';
import { formatDecimal, formatInteger, plural } from '../format.js';

const UNDO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';

export const glyph = '501';

export const title = (type, config) => type.describeConfig(config);

export const scoreText = (row) => String(row.remaining);

export const legSummary = (row) => `${plural(row.darts, 'dart')}, 3-dart avg ${formatDecimal(row.average)}`;

const stats = (row) => [
  { label: 'Darts', value: formatInteger(row.darts) },
  { label: 'Leg avg', value: formatDecimal(row.average) },
  { label: 'Match avg', value: formatDecimal(row.matchAverage) },
  { label: 'Last', value: formatInteger(row.lastScore) },
];

// seats: [{ name, active, row, won }] in throw order; `row` comes from type.scoreboard.
export function scoreboard(seats) {
  return el('ol', { class: 'scoreboard', 'data-seats': String(seats.length) },
    seats.map((seat) => el('li', { class: 'seat', 'data-active': seat.active ? '' : null, 'aria-current': seat.active ? 'true' : null },
      el('div', { class: 'seat__head' },
        el('span', { class: 'seat__name' }, seat.name),
        seat.active ? el('span', { class: 'seat__marker' }, 'To throw') : null,
        el('span', { class: 'seat__won' }, seat.won)),
      el('div', { class: 'seat__score', 'aria-label': `${seat.name}: ${seat.row.remaining} left` }, String(seat.row.remaining)),
      !seat.row.isIn ? el('p', { class: 'seat__note' }, 'Needs a double to start') : null,
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

// Score history of one leg: per player Scored and Left, one row per round.
export function legHistoryTable(history, names) {
  return el('table', { class: 'history' },
    el('thead', {},
      el('tr', {},
        el('th', { scope: 'col', rowspan: '2', class: 'history__round' }, el('span', { class: 'visually-hidden' }, 'Round')),
        names.map((name) => el('th', { scope: 'colgroup', colspan: '2', class: 'history__player' }, name))),
      el('tr', {}, names.map(() => [el('th', { scope: 'col' }, 'Scored'), el('th', { scope: 'col' }, 'Left')]))),
    el('tbody', {}, history.map((round, r) => el('tr', {},
      el('th', { scope: 'row', class: 'history__round' }, String(r + 1)),
      round.map((cell) => {
        if (!cell) return [el('td', { class: 'history__group' }), el('td', {})];
        const checkout = cell.remaining === 0;
        return [
          el('td', { class: 'history__group' }, String(cell.score),
            checkout && cell.darts < 3 ? el('span', { class: 'history__note' }, plural(cell.darts, 'dart')) : null),
          el('td', { 'data-checkout': checkout ? '' : null }, checkout ? 'Out' : String(cell.remaining)),
        ];
      })))));
}
