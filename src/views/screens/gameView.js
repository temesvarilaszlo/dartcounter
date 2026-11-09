import { el } from '../dom.js';
import { renderPlaceholder } from './placeholder.js';

export function renderGame(root, { onExit }) {
  renderPlaceholder(root, {
    title: 'Game',
    note: 'The scoreboard and keypad will be shown here.',
    actions: [el('button', { class: 'btn btn--danger', type: 'button', onClick: onExit }, 'Exit game')],
  });
}
