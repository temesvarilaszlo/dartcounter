const DASH = '–';

export const formatInteger = (value) => (value == null ? DASH : String(value));

export const formatDecimal = (value) => (value == null ? DASH : value.toFixed(2));

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Stat values by the `format` key of a game type's row definitions.
export function formatStat(value, format) {
  if (format === 'decimal') return formatDecimal(value);
  if (format === 'darts') return value == null ? DASH : plural(value, 'dart');
  return formatInteger(value);
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso) => dateTime.format(new Date(iso));

export const formatDate = (iso) => dateOnly.format(new Date(iso));
