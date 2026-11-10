import { el } from '../dom.js';
import { formatDecimal, plural } from '../format.js';

const UNDO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';

// Tally marks: one stroke, a cross, a circled cross once closed.
const TALLY = [
  '',
  '<path d="M6 18L18 6"/>',
  '<path d="M6 18L18 6M6 6l12 12"/>',
  '<path d="M7 17L17 7M7 7l10 10"/><circle cx="12" cy="12" r="9.5"/>',
];
const MARK_WORDS = ['no marks', '1 mark', '2 marks', 'closed'];

const tally = (marks) => el('span', {
  class: 'tally', 'data-marks': String(marks), role: 'img', 'aria-label': MARK_WORDS[marks],
  html: `<svg viewBox="0 0 24 24" aria-hidden="true">${TALLY[marks]}</svg>`,
});

export const glyphHtml = `<svg class="type-card__tally" viewBox="0 0 24 24">${TALLY[3]}</svg>`;

export const title = (type, config) => `${type.label} · ${type.describeConfig(config)}`;

export const scoreText = (row) => `${row.points} pts`;

export const legSummary = (row) => `${plural(row.darts, 'dart')}, MPR ${formatDecimal(row.mpr)}`;

const numberLabel = (n) => (n === 25 ? 'Bull' : String(n));

export function dartLabel(dart) {
  if (dart.miss) return 'Miss';
  if (dart.n === 25) return dart.m === 2 ? 'D-Bull' : 'Bull';
  return `${['', '', 'D', 'T'][dart.m]}${dart.n}`;
}

function playerHead(seat) {
  return el('div', { class: 'cricket__head', 'data-active': seat.active ? '' : null, 'aria-current': seat.active ? 'true' : null },
    el('span', { class: 'cricket__name' }, seat.name),
    el('span', { class: 'seat__marker', 'aria-hidden': seat.active ? null : 'true', 'data-hidden': seat.active ? null : '' }, 'To throw'),
    el('span', { class: 'cricket__points', 'aria-label': `${seat.row.points} points` }, String(seat.row.points)),
    el('span', { class: 'cricket__meta' }, `${seat.won}, MPR ${formatDecimal(seat.row.mpr)}`));
}

// Classic layout for two: marks | number | marks. Otherwise the number comes first.
export function scoreboard(seats, board) {
  const columns = seats.length === 2 ? [0, 'number', 1] : ['number', ...seats.keys()];
  const cell = (column, number) => {
    if (column !== 'number') {
      const seat = seats[column];
      return el('div', { class: 'cricket__marks', 'data-active': seat.active ? '' : null, role: 'cell' }, tally(seat.row.marks[number.n]));
    }
    return el('div', { class: 'cricket__number', 'data-dead': number.dead ? '' : null, role: 'rowheader' },
      numberLabel(number.n),
      number.dead ? el('span', { class: 'visually-hidden' }, ' closed by everyone') : null);
  };
  return el('div', {
    class: 'cricket', role: 'table', 'aria-label': 'Scoreboard', style: `--columns: ${columns.map((c) => (c === 'number' ? '3.5rem' : '1fr')).join(' ')}`,
  },
  el('div', { class: 'cricket__row cricket__row--head', role: 'row' },
    columns.map((column) => (column === 'number' ? el('div', { role: 'columnheader' }) : el('div', { role: 'columnheader' }, playerHead(seats[column]))))),
  board.numbers.map((number) => el('div', { class: 'cricket__row', 'data-dead': number.dead ? '' : null, role: 'row' },
    columns.map((column) => cell(column, number)))));
}

const MULTIPLIERS = [{ m: 1, label: 'Single' }, { m: 2, label: 'Double' }, { m: 3, label: 'Triple' }];
const PREFIX = { 1: '', 2: 'D', 3: 'T' };

// Dart pad: multiplier row, the six numbers, then Bull, Miss and Next player.
export function inputPanel({ canUndo, multiplier, board }, handlers) {
  const slots = [0, 1, 2].map((i) => {
    const dart = board.pendingDarts[i];
    return el('li', { class: 'turn__dart', 'data-empty': dart ? null : '' }, dart ? dartLabel(dart) : `Dart ${i + 1}`);
  });
  const numberKey = (n) => {
    const bull = n === 25;
    const label = bull ? (multiplier === 2 ? 'D-Bull' : 'Bull') : `${PREFIX[multiplier]}${n}`;
    return el('button', {
      class: 'pad__key pad__key--number', type: 'button', disabled: bull && multiplier === 3, onClick: () => handlers.onDart(n),
    }, label);
  };
  const element = el('div', { class: 'input-panel input-panel--darts' },
    el('div', { class: 'turn' },
      el('button', { class: 'btn btn--undo', type: 'button', disabled: !canUndo, onClick: handlers.onUndo },
        el('span', { class: 'btn__icon', html: UNDO_ICON }), 'Undo'),
      el('ol', { class: 'turn__darts', 'aria-label': 'This turn' }, slots)),
    el('div', { class: 'pad' },
      MULTIPLIERS.map(({ m, label }) => el('button', {
        class: 'pad__key pad__key--multiplier', type: 'button', 'aria-pressed': String(multiplier === m), onClick: () => handlers.onMultiplier(m),
      }, label)),
      [20, 19, 18, 17, 16, 15, 25].map(numberKey),
      el('button', { class: 'pad__key pad__key--miss', type: 'button', onClick: handlers.onMiss }, 'Miss'),
      el('button', { class: 'pad__key pad__key--next', type: 'button', onClick: handlers.onNextPlayer }, 'Next player')));
  return { element };
}
