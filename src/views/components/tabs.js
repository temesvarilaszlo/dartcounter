import { el } from '../dom.js';

// items: [{ id, label }]. The selected tab is marked by aria-selected, an
// underline and weight. Arrow keys move between tabs; `id` must be unique on
// the page and stable across renders so focus can follow the selection.
export function tabs({ id, label, items, selected, onSelect, panel }) {
  const tabId = (item) => `${id}-${item}`;
  const select = (item) => {
    onSelect(item);
    document.getElementById(tabId(item))?.focus();
  };
  return [
    el('div', {
      class: 'tabs', role: 'tablist', 'aria-label': label,
      onKeydown: (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        const index = (items.findIndex((i) => i.id === selected) + step + items.length) % items.length;
        select(items[index].id);
      },
    }, items.map((item) => el('button', {
      class: 'tabs__tab',
      type: 'button',
      role: 'tab',
      id: tabId(item.id),
      'aria-selected': String(item.id === selected),
      'aria-controls': `${id}-panel`,
      tabindex: item.id === selected ? '0' : '-1',
      onClick: () => onSelect(item.id),
    }, item.label))),
    el('div', { class: 'tabs__panel', role: 'tabpanel', id: `${id}-panel`, 'aria-labelledby': tabId(selected) }, panel),
  ];
}
