import { el } from '../dom.js';
import { openModal } from './modal.js';

const BACKSPACE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>';

// 3x4 numeric keypad. Never a native input, so the phone keyboard never opens.
export function keypad({ onDigit, onBackspace, onOk, okLabel = 'OK' }) {
  const key = (label, onClick, attrs = {}) => el('button', { class: 'keypad__key', type: 'button', onClick, ...attrs }, label);
  return el('div', { class: 'keypad' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, () => onDigit(d))),
    el('button', {
      class: 'keypad__key keypad__key--back', type: 'button', 'aria-label': 'Delete last digit', onClick: onBackspace, html: BACKSPACE_ICON,
    }),
    key('0', () => onDigit('0')),
    key(okLabel, onOk, { class: 'keypad__key keypad__key--ok' }));
}

// The value shown above a keypad: a div, never an input.
export function entryDisplay({ placeholder }) {
  const value = el('div', { class: 'entry__value', 'data-empty': '' }, placeholder);
  const error = el('p', { class: 'entry__error', role: 'alert' });
  return {
    value,
    error,
    set({ text, error: message }) {
      value.textContent = text || placeholder;
      value.toggleAttribute('data-empty', !text);
      error.textContent = message ?? '';
    },
  };
}

// Keypad in a modal, for the occasional number outside the game screen.
// validate(text) returns an error message or null.
export function openKeypadModal({ title, initial = '', maxDigits, validate, onConfirm }) {
  let text = initial;
  const display = entryDisplay({ placeholder: 'Enter a number' });
  display.set({ text });
  const update = (next) => {
    text = next.slice(0, maxDigits);
    display.set({ text });
  };
  let modal;
  const pad = keypad({
    onDigit: (d) => update(text === '0' ? d : text + d),
    onBackspace: () => update(text.slice(0, -1)),
    onOk: () => {
      const error = validate(text);
      if (error) {
        display.set({ text, error });
        return;
      }
      modal.close();
      onConfirm(text);
    },
  });
  modal = openModal({
    title,
    className: 'modal--keypad',
    body: [el('div', { class: 'entry entry--modal' }, display.value, display.error), pad],
    actions: [{ label: 'Cancel', variant: 'quiet' }],
  });
}
