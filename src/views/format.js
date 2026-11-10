const DASH = '–';

export const formatInteger = (value) => (value == null ? DASH : String(value));

export const formatDecimal = (value) => (value == null ? DASH : value.toFixed(2));

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
