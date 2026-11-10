import { el } from '../dom.js';
import { field, segmented } from '../components/controls.js';
import { tabs } from '../components/tabs.js';

const TABS = [{ id: 'allTime', label: 'All-time stats' }, { id: 'history', label: 'Game history' }];

const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const FILTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
const WINNER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 20h8"/></svg>';

// Multi-select chips: each one toggles on its own (aria-pressed).
function chipGroup({ label, options, selected, onToggle }) {
  return el('div', { class: 'segmented', role: 'group', 'aria-label': label },
    options.map((option) => el('button', {
      class: 'segmented__option',
      type: 'button',
      'aria-pressed': String(selected.includes(option.value)),
      onClick: () => onToggle(option.value),
    }, option.label)));
}

function bucketBars(section) {
  return el('ol', { class: 'bars' },
    section.bars.map((bar) => el('li', { class: 'bars__row', 'data-top': bar.top ? '' : null },
      el('span', { class: 'bars__label' }, bar.label),
      el('span', { class: 'bars__track', 'aria-hidden': 'true' },
        el('span', { class: 'bars__fill', style: `--share: ${bar.share}` })),
      el('span', { class: 'bars__count' }, String(bar.count)))));
}

function sectionContent(section) {
  if (section.kind === 'buckets') return bucketBars(section);
  if (section.kind === 'rows') {
    return el('dl', { class: 'stat-list' },
      section.rows.map((row) => el('div', {}, el('dt', {}, row.label), el('dd', {}, row.value))));
  }
  return el('table', { class: 'stat-table' },
    el('thead', {}, el('tr', {}, section.columns.map((c) => el('th', { scope: 'col' }, c)))),
    el('tbody', {}, section.rows.map((row) => el('tr', {},
      el('th', { scope: 'row' }, row[0]),
      row.slice(1).map((value) => el('td', {}, value))))));
}

function allTimePanel(vm, handlers) {
  return el('div', { class: 'alltime' },
    el('div', { class: 'alltime__controls' },
      field('Game', segmented({ label: 'Game', options: vm.types, value: vm.typeId, onChange: handlers.onType })),
      vm.players.length
        ? field('Player', segmented({ label: 'Player', options: vm.players, value: vm.playerId, onChange: handlers.onPlayer }))
        : null),
    vm.empty
      ? el('div', { class: 'empty-state' },
        el('p', {}, vm.empty),
        el('a', { class: 'btn btn--primary', href: `#/new/${vm.typeId}` }, `Start a ${vm.typeLabel} game`))
      : [
        el('dl', { class: 'highlights' },
          vm.highlights.map((h) => el('div', { class: 'highlights__item' },
            el('dt', {}, h.label),
            el('dd', {}, h.value)))),
        vm.sections.map((section) => el('section', { class: 'stat-section' },
          el('h2', { class: 'stat-section__title' }, section.label),
          sectionContent(section))),
      ]);
}

function historyRow(row, handlers) {
  return el('li', { class: 'game-row' },
    el('a', { class: 'game-row__link', href: `#/games/${encodeURIComponent(row.id)}` },
      el('span', { class: 'game-row__meta' }, el('span', {}, row.date), el('span', {}, row.description)),
      el('span', { class: 'game-row__score' },
        row.players.map((p, i) => [
          i > 0 ? el('span', { class: 'game-row__dash', 'aria-hidden': 'true' }, '–') : null,
          el('span', { class: 'game-row__player', 'data-winner': p.winner ? '' : null },
            p.winner ? el('span', { class: 'game-row__trophy', html: WINNER, role: 'img', 'aria-label': 'Winner' }) : null,
            el('span', { class: 'game-row__name' }, p.name),
            el('span', { class: 'game-row__count' }, String(p.count))),
        ]),
        el('span', { class: 'visually-hidden' }, ` ${row.unit}`))),
    el('button', {
      class: 'icon-btn game-row__delete', type: 'button', 'aria-label': `Delete game from ${row.date}`, html: TRASH,
      onClick: () => handlers.onDelete(row.id),
    }));
}

function historyPanel(vm, handlers) {
  return el('div', { class: 'history-panel' },
    el('div', { class: 'history-panel__bar' },
      el('p', { class: 'history-panel__count' }, vm.countText),
      el('button', {
        class: 'btn btn--quiet filter-btn', type: 'button', onClick: handlers.onOpenFilters, disabled: vm.total === 0,
        'aria-label': vm.filterCount ? `Filters, ${vm.filterCount} active` : 'Filters',
      },
      el('span', { class: 'btn__icon', html: FILTER }),
      'Filter',
      vm.filterCount ? el('span', { class: 'badge', 'aria-hidden': 'true' }, String(vm.filterCount)) : null)),
    vm.rows.length
      ? el('ul', { class: 'game-list' }, vm.rows.map((row) => historyRow(row, handlers)))
      : el('div', { class: 'empty-state' },
        el('p', {}, vm.empty),
        vm.filterCount ? el('button', { class: 'btn btn--quiet', type: 'button', onClick: handlers.onClearFilters }, 'Clear filters') : null),
    el('section', { class: 'backup', 'aria-labelledby': 'backup-title' },
      el('h2', { class: 'stat-section__title', id: 'backup-title' }, 'Backup'),
      el('p', { class: 'backup__note' }, 'Save every game and player to a file, or add games from a backup file.'),
      el('div', { class: 'backup__actions' },
        el('button', { class: 'btn btn--quiet', type: 'button', onClick: handlers.onExport, disabled: vm.total === 0 }, 'Export'),
        el('button', { class: 'btn btn--quiet', type: 'button', onClick: handlers.onImport }, 'Import'))));
}

// vm: { tab, allTime, history }
export function renderStats(root, vm, handlers) {
  root.replaceChildren(
    el('section', { class: 'screen stats' },
      el('header', { class: 'screen__header' }, el('h1', { class: 'screen__title' }, 'Statistics')),
      tabs({
        id: 'stats-tabs',
        label: 'Statistics',
        items: TABS,
        selected: vm.tab,
        onSelect: handlers.onTab,
        panel: vm.tab === 'history' ? historyPanel(vm.history, handlers) : allTimePanel(vm.allTime, handlers),
      })),
  );
}

// Body of the filter bottom sheet; re-rendered in place on every change.
// vm: { groups: [{ key, label, options, selected }], date: { presets, dateFrom, dateTo }, resultText, canClear }
export function renderFilterSheet(container, vm, handlers) {
  const dateInput = (key, label, value) => el('label', { class: 'date-field' },
    el('span', { class: 'field__label' }, label),
    el('input', { class: 'date-field__input', type: 'date', value: value ?? '', onChange: (event) => handlers.onDate(key, event.target.value || null) }));
  container.replaceChildren(
    el('div', { class: 'sheet__groups' },
      field('Date', el('div', { class: 'sheet__date' },
        chipGroup({
          label: 'Date range',
          options: vm.date.presets,
          selected: vm.date.presets.filter((p) => p.selected).map((p) => p.value),
          onToggle: handlers.onPreset,
        }),
        el('div', { class: 'sheet__dates' },
          dateInput('dateFrom', 'From', vm.date.dateFrom),
          dateInput('dateTo', 'To', vm.date.dateTo)))),
      vm.groups.map((group) => field(group.label, chipGroup({
        label: group.label, options: group.options, selected: group.selected, onToggle: (value) => handlers.onToggle(group.key, value),
      })))),
    el('div', { class: 'sheet__footer' },
      el('button', { class: 'btn btn--quiet', type: 'button', disabled: !vm.canClear, onClick: handlers.onClearFilters }, 'Clear all'),
      el('button', { class: 'btn btn--primary', type: 'button', onClick: handlers.onCloseFilters }, vm.resultText)),
  );
}
