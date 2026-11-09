import { MAX_PLAYERS } from '../../config.js';
import { formatError } from './matchFormat.js';

// Validates the fields every game type shares (players and match format).
export function validateCommonConfig(config, maxPlayers = MAX_PLAYERS) {
  const errors = {};
  const ids = config.playerIds ?? [];
  if (ids.length < 1 || ids.length > maxPlayers) errors.players = `Choose 1 to ${maxPlayers} players`;
  else if (new Set(ids).size !== ids.length) errors.players = 'Each player can only play once';

  if (config.startingPlayerIndex !== 0) errors.startingPlayerIndex = 'The first player in the list throws first';

  if (config.sets?.enabled) {
    const setsError = formatError(config.sets.format);
    if (setsError) errors['sets.format'] = setsError;
    const legsToWinSet = config.sets.legsToWinSet;
    if (!Number.isInteger(legsToWinSet) || legsToWinSet < 1) errors['sets.legsToWinSet'] = 'Must be at least 1';
  } else {
    const legsError = formatError(config.legs?.format);
    if (legsError) errors['legs.format'] = legsError;
  }
  return errors;
}

// Runs each schema field's validate() against typeConfig.
export function validateFields(schema, typeConfig = {}) {
  const errors = {};
  for (const field of schema) {
    const error = field.validate(typeConfig[field.key]);
    if (error) errors[field.key] = error;
  }
  return errors;
}

export function validateGameConfig(config, schema) {
  const errors = { ...validateCommonConfig(config), ...validateFields(schema, config.typeConfig) };
  return { ok: Object.keys(errors).length === 0, errors };
}

// Raw pre-game form values -> typeConfig, filling defaults and parsing values.
export function normalizeFields(schema, raw = {}) {
  return Object.fromEntries(schema.map((field) => {
    const value = raw[field.key] ?? field.default;
    return [field.key, field.parse ? field.parse(value) : value];
  }));
}
