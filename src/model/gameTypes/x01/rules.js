import { anyDart, isDouble, minDarts } from './checkout.js';

// Data-driven rule tables: a new rule (e.g. master out) is one more entry.
// `opens`: which dart may be the first scoring dart while the player is not in.
// `finishes`: which dart may be the last dart of a checkout.
// `minFinish`: the smallest remaining that can still be checked out.
export const IN_RULES = {
  straight: { label: 'Straight in', short: 'SI', opens: anyDart, opensOn: 'any dart' },
  double: { label: 'Double in', short: 'DI', opens: isDouble, opensOn: 'a double' },
};

export const OUT_RULES = {
  straight: { label: 'Straight out', short: 'SO', finishes: anyDart, minFinish: 1 },
  double: { label: 'Double out', short: 'DO', finishes: isDouble, minFinish: 2 },
};

export const MAX_TURN_SCORE = 180;

function parseScore(raw) {
  if (typeof raw === 'number') return raw;
  const text = String(raw ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

// Validates a 3-dart total for the player with `remaining` points left.
// Busts do not exist: anything that would bust is simply invalid.
export function evaluateScore(raw, { remaining, isIn, inRule, outRule }) {
  const score = parseScore(raw);
  if (!Number.isInteger(score) || score < 0) return { valid: false, error: 'Enter a score' };
  if (score > MAX_TURN_SCORE) return { valid: false, error: `Max score is ${MAX_TURN_SCORE}` };
  if (score === 0) return { valid: true };

  const inTable = IN_RULES[inRule];
  const outTable = OUT_RULES[outRule];
  const first = isIn ? anyDart : inTable.opens;
  if (minDarts(score) === null) return { valid: false, error: `${score} can't be scored with 3 darts` };
  if (minDarts(score, { first }) === null) {
    return { valid: false, error: `${score} can't be scored starting on ${inTable.opensOn}` };
  }
  if (score > remaining) return { valid: false, error: `Too high, only ${remaining} left` };

  if (score === remaining) {
    const darts = minDarts(score, { first, last: outTable.finishes });
    if (darts !== null) return { valid: true, checkout: { minDarts: darts } };
    const blockingRule = minDarts(score, { last: outTable.finishes }) === null ? outTable : inTable;
    return { valid: false, error: `Can't check out ${score} with ${blockingRule.label.toLowerCase()}` };
  }

  const left = remaining - score;
  if (left < outTable.minFinish) {
    return { valid: false, error: `That leaves ${left}, impossible with ${outTable.label.toLowerCase()}` };
  }
  return { valid: true };
}
