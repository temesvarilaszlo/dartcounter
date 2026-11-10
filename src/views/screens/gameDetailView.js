import { el } from '../dom.js';
import { tabs } from '../components/tabs.js';

const TABS = [{ id: 'details', label: 'Details' }, { id: 'legs', label: 'Legs' }];

// Rows = stats, columns = players.
function statsTable(names, rows) {
  return el('table', { class: 'stat-table' },
    el('thead', {}, el('tr', {},
      el('td', {}),
      names.map((name) => el('th', { scope: 'col' }, name)))),
    el('tbody', {}, rows.map((row) => el('tr', {},
      el('th', { scope: 'row' }, row.label),
      row.values.map((value) => el('td', {}, value))))));
}

function legItem(leg, vm, parts) {
  return el('details', { class: 'leg' },
    el('summary', { class: 'leg__summary' },
      el('span', { class: 'leg__title' }, leg.title),
      el('span', { class: 'leg__winner' }, leg.winner),
      statsTable(vm.names, leg.stats)),
    el('div', { class: 'leg__body', 'data-wide': vm.names.length > 2 ? '' : null },
      parts.legHistoryTable(leg.history, vm.names)));
}

// vm: { title, date, unit, players: [{ name, count, winner }], names, stats,
//       legs: [{ title, winner, stats, history }], tab }
export function renderGameDetail(root, vm, parts, handlers) {
  root.replaceChildren(
    el('section', { class: 'screen detail' },
      el('header', { class: 'detail__header' },
        el('a', { class: 'back-link', href: '#/stats?tab=history' }, '‹ History'),
        el('h1', { class: 'screen__title' }, vm.title),
        el('p', { class: 'detail__date' }, vm.date)),
      el('section', { class: 'result', 'aria-label': 'Result', 'data-seats': String(vm.players.length) },
        el('p', { class: 'result__unit' }, vm.unit),
        el('ol', { class: 'result__players' },
          vm.players.map((p) => el('li', { class: 'result__player', 'data-winner': p.winner ? '' : null },
            el('span', { class: 'result__name' }, p.name),
            el('span', { class: 'result__count' }, String(p.count)),
            p.winner ? el('span', { class: 'result__won' }, 'Winner') : null)))),
      el('div', {}, tabs({
        id: 'detail-tabs',
        label: 'Game detail',
        items: TABS,
        selected: vm.tab,
        onSelect: handlers.onTab,
        panel: vm.tab === 'details'
          ? statsTable(vm.names, vm.stats)
          : el('div', { class: 'legs' }, vm.legs.map((leg) => legItem(leg, vm, parts))),
      })),
      el('footer', { class: 'detail__actions' },
        el('a', { class: 'btn btn--quiet', href: '#/stats?tab=history' }, 'Back'),
        el('button', { class: 'btn btn--primary', type: 'button', onClick: handlers.onRematch }, 'Rematch'))),
  );
}
