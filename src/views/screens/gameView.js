import { el } from '../dom.js';

// Generic game screen: header, the type's scoreboard and input panel.
export function renderGame(root, vm, parts, handlers) {
  const panel = parts.inputPanel(vm, handlers);
  root.replaceChildren(
    el('section', { class: 'game' },
      el('header', { class: 'game__header' },
        el('button', { class: 'btn btn--quiet game__exit', type: 'button', onClick: handlers.onExit }, 'Exit'),
        el('div', { class: 'game__titles' },
          el('h1', { class: 'game__title' }, vm.title),
          el('p', { class: 'game__progress' }, vm.progress, el('span', { class: 'game__target' }, vm.target)))),
      parts.scoreboard(vm.seats, vm.board),
      panel.element),
  );
  return panel;
}
