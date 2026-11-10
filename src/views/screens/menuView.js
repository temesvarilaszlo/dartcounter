import { el } from '../dom.js';

const RINGS = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="var(--board-black)" stroke="var(--board-wire)" stroke-width="1.5"/><circle cx="20" cy="20" r="15" fill="none" stroke="var(--board-red)" stroke-width="3" stroke-dasharray="4.71 4.71"/><circle cx="20" cy="20" r="15" fill="none" stroke="var(--board-green)" stroke-width="3" stroke-dasharray="4.71 4.71" stroke-dashoffset="4.71"/><circle cx="20" cy="20" r="5" fill="var(--board-green)"/><circle cx="20" cy="20" r="2.2" fill="var(--board-red)"/></svg>';

function resumeCard(resume, { onResume, onDiscard }) {
  return el('section', { class: 'resume', 'aria-labelledby': 'resume-title' },
    el('h2', { class: 'resume__title', id: 'resume-title' }, 'Game in progress'),
    el('p', { class: 'resume__config' }, `${resume.typeLabel} ${resume.description}`),
    el('ul', { class: 'resume__players' },
      resume.players.map((p) => el('li', {},
        el('span', { class: 'resume__name' }, p.name),
        el('span', { class: 'resume__score' }, p.score)))),
    el('p', { class: 'resume__progress' }, resume.progress),
    el('div', { class: 'resume__actions' },
      el('button', { class: 'btn btn--primary', type: 'button', onClick: onResume }, 'Resume game'),
      el('button', { class: 'btn btn--quiet', type: 'button', onClick: onDiscard }, 'Discard')));
}

export function renderMenu(root, { resume, types }, handlers) {
  root.replaceChildren(
    el('section', { class: 'screen menu' },
      el('header', { class: 'menu__header' },
        el('span', { class: 'menu__mark', html: RINGS }),
        el('h1', { class: 'screen__title' }, 'Dart Counter')),
      resume ? resumeCard(resume, handlers) : null,
      el('h2', { class: 'menu__heading' }, 'New game'),
      el('ul', { class: 'menu__types' },
        types.map((type) => el('li', {},
          el('a', { class: 'type-card', href: `#/new/${type.id}` },
            el('span', { class: 'type-card__glyph', 'aria-hidden': 'true', html: type.glyphHtml ?? null }, type.glyphHtml ? null : type.glyph),
            el('span', { class: 'type-card__text' },
              el('span', { class: 'type-card__label' }, type.label),
              el('span', { class: 'type-card__description' }, type.description))))))),
  );
}
