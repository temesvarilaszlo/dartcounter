import { normalizeFields, validateGameConfig } from '../../common/gameConfig.js';
import { IN_RULES, OUT_RULES } from './rules.js';

export const START_SCORE_OPTIONS = [101, 201, 301, 401, 501, 601, 701, 801, 901];
export const CUSTOM_START_SCORE = { min: 2, max: 1001 };

const ruleOptions = (table) => Object.entries(table).map(([value, rule]) => ({ value, label: rule.label }));
const ruleError = (table, message) => (value) => (Object.hasOwn(table, value) ? null : message);

export const preGameSchema = [
  {
    key: 'startScore',
    label: 'Start score',
    kind: 'chips',
    options: START_SCORE_OPTIONS.map((value) => ({ value, label: String(value) })),
    custom: { label: 'Custom', ...CUSTOM_START_SCORE },
    default: 501,
    parse: Number,
    validate: (value) => (Number.isInteger(value) && value >= CUSTOM_START_SCORE.min && value <= CUSTOM_START_SCORE.max
      ? null
      : `Start score must be ${CUSTOM_START_SCORE.min} to ${CUSTOM_START_SCORE.max}`),
  },
  {
    key: 'inRule',
    label: 'In',
    kind: 'segmented',
    options: ruleOptions(IN_RULES),
    default: 'straight',
    validate: ruleError(IN_RULES, 'Choose an in rule'),
  },
  {
    key: 'outRule',
    label: 'Out',
    kind: 'segmented',
    options: ruleOptions(OUT_RULES),
    default: 'double',
    validate: ruleError(OUT_RULES, 'Choose an out rule'),
  },
];

export const validateConfig = (config) => validateGameConfig(config, preGameSchema);

export const normalizeConfig = (raw) => normalizeFields(preGameSchema, raw);

// "501 · Double out", or "501 · Double in · Double out"
export function describeConfig({ typeConfig }) {
  const parts = [String(typeConfig.startScore)];
  if (typeConfig.inRule !== 'straight') parts.push(IN_RULES[typeConfig.inRule].label);
  parts.push(OUT_RULES[typeConfig.outRule].label);
  return parts.join(' · ');
}

// Type specific history filters; options come from the values actually played.
export const filterFields = [
  { key: 'startScore', label: 'Start score', optionLabel: String },
  { key: 'inRule', label: 'In', optionLabel: (value) => IN_RULES[value].label },
  { key: 'outRule', label: 'Out', optionLabel: (value) => OUT_RULES[value].label },
];
