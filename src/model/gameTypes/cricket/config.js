import { normalizeFields, validateGameConfig } from '../../common/gameConfig.js';
import { VARIANTS } from './rules.js';

export const preGameSchema = [
  {
    key: 'variant',
    label: 'Variant',
    kind: 'segmented',
    options: Object.entries(VARIANTS).map(([value, variant]) => ({ value, label: variant.label })),
    default: 'regular',
    validate: (value) => (Object.hasOwn(VARIANTS, value) ? null : 'Choose a variant'),
  },
];

export const validateConfig = (config) => validateGameConfig(config, preGameSchema);

export const normalizeConfig = (raw) => normalizeFields(preGameSchema, raw);

export const describeConfig = ({ typeConfig }) => VARIANTS[typeConfig.variant].label;
