import { el } from '../dom.js';

const VISIBLE_MS = 4000;
let region;
let timer;

export function showToast(message) {
  if (!region) {
    region = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  region.textContent = message;
  region.dataset.visible = '';
  clearTimeout(timer);
  timer = setTimeout(() => { delete region.dataset.visible; }, VISIBLE_MS);
}
