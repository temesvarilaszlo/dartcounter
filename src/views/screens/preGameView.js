import { renderPlaceholder } from './placeholder.js';

export function renderPreGame(root, { typeId }) {
  renderPlaceholder(root, { title: 'Game setup', note: `Setup for ${typeId} will be shown here.` });
}
