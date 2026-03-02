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

export function validateWorkoutLogPayload(req, res, next) {
  const { date, exerciseId, weight, reps } = req.body || {};

  if (!isValidDate(date)) {
    return badRequest(res, 'Invalid date');
  }

  if (!isNonEmptyString(exerciseId)) {
    return badRequest(res, 'exerciseId is required');
  }

  const parsedWeight = asNumber(weight);
  const parsedReps = asNumber(reps);

  if (parsedWeight === null || parsedWeight <= 0 || parsedWeight > 1000) {
    return badRequest(res, 'Weight must be greater than 0 and less than 1000');
  }

  if (parsedReps === null || parsedReps <= 0 || parsedReps > 200) {
    return badRequest(res, 'Reps must be greater than 0 and less than 200');
  }

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

export function validateProfileUpdatePayload(req, res, next) {
  const { age, weight, height, workHours, goal, currentState, schedule, theme, motivationPhrase } = req.body || {};

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

  next();
}
