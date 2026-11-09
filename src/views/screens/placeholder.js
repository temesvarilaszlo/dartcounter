import { el } from '../dom.js';

// Shared shell for screens that are not built yet.
export function renderPlaceholder(root, { title, note, actions = [] }) {
  root.replaceChildren(
    el('section', { class: 'screen' },
      el('header', { class: 'screen__header' }, el('h1', { class: 'screen__title' }, title)),
      el('div', { class: 'screen__body' },
        el('p', { class: 'empty-state' }, note),
        actions.length ? el('div', { class: 'screen__actions' }, actions) : null)),
  );
}
