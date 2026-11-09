import { el } from '../dom.js';

const ICONS = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  stats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/></svg>',
};

const ITEMS = [
  { id: 'menu', label: 'Menu', href: '#/' },
  { id: 'stats', label: 'Stats', href: '#/stats' },
];

export function renderNavbar(root, { active, hidden }) {
  root.hidden = hidden;
  root.replaceChildren(
    ...ITEMS.map((item) =>
      el('a', {
        class: 'navbar__item',
        href: item.href,
        'aria-current': item.id === active ? 'page' : null,
      },
      el('span', { class: 'navbar__icon', html: ICONS[item.id] }),
      el('span', { class: 'navbar__label' }, item.label)),
    ),
  );
}
