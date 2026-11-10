import { el } from '../dom.js';

const VARIANTS = { primary: 'btn--primary', danger: 'btn--danger', quiet: 'btn--quiet' };
let nextId = 0;

// Native <dialog>: focus is trapped and Escape/back fire "cancel". Every
// action closes the modal before its handler runs.
export function openModal({ title, body = [], actions = [], dismissible = true, onDismiss, className = '' }) {
  const titleId = `modal-title-${++nextId}`;
  const dialog = el('dialog', { class: `modal ${className}`, 'aria-labelledby': titleId },
    el('h2', { class: 'modal__title', id: titleId }, title),
    body.length ? el('div', { class: 'modal__body' }, body.map((part) => (typeof part === 'string' ? el('p', {}, part) : part))) : null,
    el('div', { class: 'modal__actions' },
      actions.map((action) => el('button', {
        class: `btn ${VARIANTS[action.variant] ?? ''}`,
        type: 'button',
        onClick: () => { close(); action.onClick?.(); },
      }, action.label))));

  function close() {
    if (dialog.open) dialog.close();
    dialog.remove();
  }

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!dismissible) return;
    close();
    onDismiss?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close };
}

export function closeAllModals() {
  document.querySelectorAll('dialog.modal').forEach((dialog) => {
    if (dialog.open) dialog.close();
    dialog.remove();
  });
}
