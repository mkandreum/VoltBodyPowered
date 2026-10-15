import { incrementValidationError } from '../utils/metrics.js';

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function badRequest(res, message) {
  incrementValidationError();
  return res.status(400).json({ error: 'Invalid request', details: message });
}

function hasMaxLength(value, max) {
  return typeof value === 'string' && value.length <= max;
}

export function validateAuthPayload(req, res, next) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return badRequest(res, 'Invalid email format');
  }

  if (!isNonEmptyString(password) || password.length < 6) {
    return badRequest(res, 'Password must have at least 6 characters');
  }

  if (!hasMaxLength(email, 120) || !hasMaxLength(password, 128)) {
    return badRequest(res, 'Email or password length is too long');
  }

  next();
}

export function validateGeneratePlanPayload(req, res, next) {
  const payload = req.body || {};

  if (!isNonEmptyString(payload.name)) {
    return badRequest(res, 'Name is required');
  }

  if (!hasMaxLength(payload.name, 80)) {
    return badRequest(res, 'Name length is too long');
  }

  if (payload.workHours && !hasMaxLength(payload.workHours, 120)) {
    return badRequest(res, 'workHours length is too long');
  }

  const age = asNumber(payload.age);
  const weight = asNumber(payload.weight);
  const height = asNumber(payload.height);

  if (age === null || age < 12 || age > 100) {
    return badRequest(res, 'Age must be between 12 and 100');
  }

  if (weight === null || weight < 30 || weight > 350) {
    return badRequest(res, 'Weight must be between 30 and 350');
  }

  if (height === null || height < 120 || height > 250) {
    return badRequest(res, 'Height must be between 120 and 250');
  }

  next();
}

export function validateAlternativeMealPayload(req, res, next) {
  const { oldMeal, profile } = req.body || {};

  if (!oldMeal || typeof oldMeal !== 'object') {
    return badRequest(res, 'oldMeal is required');
  }

  if (!isNonEmptyString(oldMeal.id) || !isNonEmptyString(oldMeal.name) || !isNonEmptyString(oldMeal.time)) {
    return badRequest(res, 'oldMeal must include id, name and time');
  }

  if (!profile || typeof profile !== 'object' || !isNonEmptyString(profile.goal)) {
    return badRequest(res, 'profile goal is required');
  }

  if (!hasMaxLength(oldMeal.name, 120) || (oldMeal.description && !hasMaxLength(oldMeal.description, 1200))) {
    return badRequest(res, 'oldMeal has invalid length fields');
  }

  next();
}

export function validateDayMealsPayload(req, res, next) {
  const { diet, profile } = req.body || {};

  if (!diet || typeof diet !== 'object' || !Array.isArray(diet.meals) || diet.meals.length === 0 || diet.meals.length > 10) {
    return badRequest(res, 'diet with 1-10 meals is required');
  }

  const invalidMeal = diet.meals.some((m) => !m || typeof m !== 'object'
    || !isNonEmptyString(m.id) || !isNonEmptyString(m.name) || !isNonEmptyString(m.time)
    || !hasMaxLength(m.name, 120) || (m.description && !hasMaxLength(m.description, 1200)));
  if (invalidMeal) {
    return badRequest(res, 'each meal must include id, name and time with valid lengths');
  }

  if (!profile || typeof profile !== 'object' || !isNonEmptyString(profile.goal)) {
    return badRequest(res, 'profile goal is required');
  }

  next();
}

export function validateProgressReportPayload(req, res, next) {
  const { profile, logs } = req.body || {};

  if (!profile || typeof profile !== 'object' || !isNonEmptyString(profile.goal)) {
    return badRequest(res, 'profile with goal is required');
  }

  if (!Array.isArray(logs)) {
    return badRequest(res, 'logs must be an array');
  }

  if (logs.length > 5000) {
    return badRequest(res, 'logs array is too large');
  }

  next();
}

function checkOptionalInt(value, min, max, name) {
  if (value === undefined || value === null) return null;
  const n = asNumber(value);
  if (typeof value === 'boolean' || n === null || !Number.isInteger(n) || n < min || n > max) {
    return `${name} must be an integer between ${min} and ${max}`;
  }
  return null;
}

function checkSetFields({ weight, reps, duration, rpe, rir }, requireCore) {
  if (requireCore || weight !== undefined) {
    const w = asNumber(weight);
    if (weight === null || weight === undefined || weight === '' || w === null || w < 0 || w > 1000) {
      return 'Weight must be between 0 and 1000';
    }
  }
  if (requireCore || reps !== undefined) {
    const r = asNumber(reps);
    if (reps === null || reps === undefined || reps === '' || r === null || !Number.isInteger(r) || r < 1 || r > 200) {
      return 'Reps must be an integer between 1 and 200';
    }
  }
  return (
    checkOptionalInt(duration, 0, 86400, 'duration') ||
    checkOptionalInt(rpe, 1, 10, 'rpe') ||
    checkOptionalInt(rir, 0, 10, 'rir')
  );
}

export function validateWorkoutLogPayload(req, res, next) {
  const body = req.body || {};

  if (!isValidDate(body.date)) {
    return badRequest(res, 'Invalid date');
  }

  if (!isNonEmptyString(body.exerciseId)) {
    return badRequest(res, 'exerciseId is required');
  }

  const err = checkSetFields(body, true);
  if (err) return badRequest(res, err);

  next();
}

export function validateWorkoutLogUpdatePayload(req, res, next) {
  const err = checkSetFields(req.body || {}, false);
  if (err) return badRequest(res, err);
  next();
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value) {
  return typeof value === 'string' && DATE_KEY_RE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function optNum(value, min, max, name, int = false) {
  if (value === undefined || value === null) return null;
  const n = asNumber(value);
  if (typeof value === 'boolean' || n === null || n < min || n > max || (int && !Number.isInteger(n))) {
    return `${name} must be ${int ? 'an integer' : 'a number'} between ${min} and ${max}`;
  }
  return null;
}

export function validateMetricsPayload(req, res, next) {
  if (!isDateKey(req.params.date)) return badRequest(res, 'Invalid date (YYYY-MM-DD)');
  const b = req.body || {};
  const err =
    optNum(b.steps, 0, 200000, 'steps', true) ||
    optNum(b.distanceKm, 0, 1000, 'distanceKm') ||
    optNum(b.activeKcal, 0, 20000, 'activeKcal') ||
    optNum(b.totalKcal, 0, 30000, 'totalKcal') ||
    optNum(b.sleepHours, 0, 24, 'sleepHours') ||
    optNum(b.hrv, 0, 500, 'hrv') ||
    optNum(b.restingHr, 20, 250, 'restingHr', true) ||
    optNum(b.avgHr, 20, 250, 'avgHr', true) ||
    optNum(b.waterMl, 0, 20000, 'waterMl', true);
  if (err) return badRequest(res, err);
  next();
}

export function validateMealTogglePayload(req, res, next) {
  const { date, mealId, eaten } = req.body || {};
  if (!isDateKey(date)) return badRequest(res, 'Invalid date (YYYY-MM-DD)');
  if (!isNonEmptyString(mealId) || !hasMaxLength(mealId, 120)) return badRequest(res, 'mealId is required');
  if (typeof eaten !== 'boolean') return badRequest(res, 'eaten must be boolean');
  next();
}

export function validateGoalsPayload(req, res, next) {
  const { weekStart, goals } = req.body || {};
  if (!isDateKey(weekStart)) return badRequest(res, 'Invalid weekStart (YYYY-MM-DD)');
  if (!Array.isArray(goals) || goals.length > 50) return badRequest(res, 'goals must be an array (max 50)');
  const seen = new Set();
  for (const g of goals) {
    if (!g || !isNonEmptyString(g.id) || !hasMaxLength(g.id, 120) || seen.has(g.id)) return badRequest(res, 'Invalid goal id');
    seen.add(g.id);
    if (typeof g.label !== 'string' || !hasMaxLength(g.label, 300)) return badRequest(res, 'Invalid goal label');
    if (typeof g.done !== 'boolean') return badRequest(res, 'goal.done must be boolean');
  }
  next();
}

export function validateAchievementPayload(req, res, next) {
  const { id, unlockedAt } = req.body || {};
  if (!isNonEmptyString(id) || !hasMaxLength(id, 120)) return badRequest(res, 'id is required');
  if (unlockedAt !== undefined && !isValidDate(unlockedAt)) return badRequest(res, 'Invalid unlockedAt');
  next();
}

export function validateCustomWorkoutPayload(req, res, next) {
  const { exercises } = req.body || {};
  if (!Array.isArray(exercises) || exercises.length > 100) return badRequest(res, 'exercises must be an array (max 100)');
  const seen = new Set();
  for (const e of exercises) {
    if (!e || typeof e !== 'object' || !isNonEmptyString(e.id) || !hasMaxLength(e.id, 120) || seen.has(e.id)) {
      return badRequest(res, 'Each exercise needs a unique id');
    }
    seen.add(e.id);
    if (JSON.stringify(e).length > 20000) return badRequest(res, 'Exercise too large');
  }
  next();
}

export function validateRecoveryPayload(req, res, next) {
  if (!isDateKey(req.params.date)) return badRequest(res, 'Invalid date (YYYY-MM-DD)');
  const { sleepHours, hrv, score } = req.body || {};
  if (sleepHours === undefined || sleepHours === null) return badRequest(res, 'sleepHours is required');
  if (score === undefined || score === null) return badRequest(res, 'score is required');
  const err =
    optNum(sleepHours, 0, 24, 'sleepHours') ||
    optNum(hrv, 0, 500, 'hrv') ||
    optNum(score, 0, 100, 'score', true);
  if (err) return badRequest(res, err);
  next();
}

export function validateProgressPhotoPayload(req, res, next) {
  const { date, url } = req.body || {};

  if (!isValidDate(date)) {
    return badRequest(res, 'Invalid date');
  }

  if (!isNonEmptyString(url) || url.length < 16 || url.length > 10_000_000) {
    return badRequest(res, 'Invalid photo url');
  }

  next();
}

export function validateWeightLogPayload(req, res, next) {
  const { date, weight } = req.body || {};

  if (!isValidDate(date)) {
    return badRequest(res, 'Invalid date');
  }

  const parsedWeight = asNumber(weight);
  if (parsedWeight === null || parsedWeight < 20 || parsedWeight > 400) {
    return badRequest(res, 'Weight must be between 20 and 400');
  }

  next();
}

export function validateProfileUpdatePayload(req, res, next) {
  const { age, weight, height, workHours, goal, currentState, schedule, theme, motivationPhrase, notificationsEnabled } = req.body || {};

  if (notificationsEnabled !== undefined && typeof notificationsEnabled !== 'boolean') {
    return badRequest(res, 'notificationsEnabled must be boolean');
  }

  if (age !== undefined) {
    const parsedAge = asNumber(age);
    if (parsedAge === null || parsedAge < 12 || parsedAge > 100) {
      return badRequest(res, 'Age must be between 12 and 100');
    }
  }

  if (weight !== undefined) {
    const parsedWeight = asNumber(weight);
    if (parsedWeight === null || parsedWeight < 30 || parsedWeight > 350) {
      return badRequest(res, 'Weight must be between 30 and 350');
    }
  }

  if (height !== undefined) {
    const parsedHeight = asNumber(height);
    if (parsedHeight === null || parsedHeight < 120 || parsedHeight > 250) {
      return badRequest(res, 'Height must be between 120 and 250');
    }
  }

  if (workHours !== undefined && (!isNonEmptyString(workHours) || !hasMaxLength(workHours, 120))) {
    return badRequest(res, 'workHours has invalid format or length');
  }

  if (goal !== undefined && (!isNonEmptyString(goal) || !hasMaxLength(goal, 140))) {
    return badRequest(res, 'goal has invalid format or length');
  }

  if (currentState !== undefined && (!isNonEmptyString(currentState) || !hasMaxLength(currentState, 140))) {
    return badRequest(res, 'currentState has invalid format or length');
  }

  if (schedule !== undefined && (!isNonEmptyString(schedule) || !hasMaxLength(schedule, 140))) {
    return badRequest(res, 'schedule has invalid format or length');
  }

  if (theme !== undefined && !['verde-negro', 'aguamarina-negro', 'ocaso-negro'].includes(theme)) {
    return badRequest(res, 'theme is invalid');
  }

  if (motivationPhrase !== undefined && (typeof motivationPhrase !== 'string' || !hasMaxLength(motivationPhrase, 240))) {
    return badRequest(res, 'motivationPhrase has invalid format or length');
  }

  const { profilePhoto, motivationPhoto } = req.body || {};
  // ~8 MB encoded as base64 ≈ 10.7 MB string; cap at 10 MB to stay inside the 12 MB JSON body limit
  const PHOTO_MAX_BYTES = 10_000_000;
  if (profilePhoto !== undefined && (typeof profilePhoto !== 'string' || profilePhoto.length > PHOTO_MAX_BYTES)) {
    return badRequest(res, 'profilePhoto is too large or invalid');
  }
  if (motivationPhoto !== undefined && (typeof motivationPhoto !== 'string' || motivationPhoto.length > PHOTO_MAX_BYTES)) {
    return badRequest(res, 'motivationPhoto is too large or invalid');
  }

  next();
}
