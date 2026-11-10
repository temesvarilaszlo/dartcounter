import { el } from '../dom.js';

// Form controls of the pre-game screen. Selection is marked with aria-pressed
// plus a visible outline and weight, never colour alone.

export function field(label, control, error) {
  return el('div', { class: 'field' },
    el('span', { class: 'field__label' }, label),
    control,
    error ? el('p', { class: 'field__error', role: 'alert' }, error) : null);
}

// options: [{ value, label }]; extra: further buttons appended (e.g. "Custom").
export function segmented({ label, options, value, onChange, extra = [] }) {
  return el('div', { class: 'segmented', role: 'group', 'aria-label': label },
    options.map((option) => el('button', {
      class: 'segmented__option',
      type: 'button',
      'aria-pressed': String(option.value === value),
      onClick: () => onChange(option.value),
    }, option.label)),
    extra);
}

export function stepper({ label, display, onDecrease, onIncrease, canDecrease, canIncrease }) {
  return el('div', { class: 'stepper', role: 'group', 'aria-label': label },
    el('button', {
      class: 'stepper__btn', type: 'button', 'aria-label': `Fewer: ${label}`, disabled: !canDecrease, onClick: onDecrease,
    }, '−'),
    el('output', { class: 'stepper__value', 'aria-live': 'polite' }, display),
    el('button', {
      class: 'stepper__btn', type: 'button', 'aria-label': `More: ${label}`, disabled: !canIncrease, onClick: onIncrease,
    }, '+'));
}

export function toggle({ label, checked, onChange }) {
  return el('button', {
    class: 'toggle', type: 'button', role: 'switch', 'aria-checked': String(checked), onClick: () => onChange(!checked),
  }, el('span', { class: 'toggle__track', 'aria-hidden': 'true' }), el('span', { class: 'toggle__label' }, label));
}
