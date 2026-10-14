import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  validateMetricsPayload,
  validateMealTogglePayload,
  validateGoalsPayload,
  validateAchievementPayload,
  validateCustomWorkoutPayload,
  validateRecoveryPayload,
} from '../middleware/validators.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { logError } from '../utils/logger.js';
import prisma from '../utils/prisma.js';

const router = express.Router();
const readLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, keyPrefix: 'data-read' });
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 240, keyPrefix: 'data-write' });

const DAYS_BACK = 120;
const WEEKS_BACK = 8;

function dateKeyDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function fail(res, req, event, message, error) {
  logError(event, { requestId: req.requestId, message: error.message, stack: error.stack });
  res.status(500).json({ error: message });
}

const METRIC_FIELDS = [
  'steps', 'distanceKm', 'activeKcal', 'totalKcal', 'sleepHours', 'hrv', 'restingHr', 'avgHr', 'waterMl',
];

function serializeMetric(m) {
  const out = { date: m.date };
  for (const f of METRIC_FIELDS) out[f] = m[f];
  return out;
}

// Everything the client needs after login / hydration
router.get('/all', authMiddleware, readLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const since = dateKeyDaysAgo(DAYS_BACK);
    const sinceWeek = dateKeyDaysAgo(WEEKS_BACK * 7);

    const [metrics, mealLogs, goals, achievements, custom, recovery] = await Promise.all([
      prisma.dailyMetric.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } }),
      prisma.mealLog.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } }),
      prisma.weeklyGoalState.findMany({ where: { userId, weekStart: { gte: sinceWeek } }, orderBy: [{ weekStart: 'asc' }, { createdAt: 'asc' }] }),
      prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: 'asc' } }),
      prisma.customExercise.findMany({ where: { userId }, orderBy: { position: 'asc' } }),
      prisma.recoveryLog.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } }),
    ]);

    res.json({
      metrics: metrics.map(serializeMetric),
      mealLogs: mealLogs.map((m) => ({ date: m.date, mealId: m.mealId })),
      goals: goals.map((g) => ({ weekStart: g.weekStart, goalId: g.goalId, label: g.label, done: g.done })),
      achievements: achievements.map((a) => ({ id: a.achievementId, unlockedAt: a.unlockedAt.toISOString() })),
      customWorkout: custom.map((c) => c.data),
      recovery: recovery.map((r) => ({ date: r.date, sleepHours: r.sleepHours, hrv: r.hrv, score: r.score })),
    });
  } catch (error) {
    fail(res, req, 'data.all.error', 'Failed to load data', error);
  }
});

router.put('/metrics/:date', authMiddleware, writeLimiter, validateMetricsPayload, async (req, res) => {
  try {
    const data = {};
    for (const f of METRIC_FIELDS) {
      if (req.body[f] !== undefined && req.body[f] !== null) data[f] = Number(req.body[f]);
    }
    const row = await prisma.dailyMetric.upsert({
      where: { userId_date: { userId: req.userId, date: req.params.date } },
      create: { userId: req.userId, date: req.params.date, ...data },
      update: data,
    });
    res.json(serializeMetric(row));
  } catch (error) {
    fail(res, req, 'data.metrics.error', 'Failed to save metrics', error);
  }
});

router.put('/meals', authMiddleware, writeLimiter, validateMealTogglePayload, async (req, res) => {
  try {
    const { date, mealId, eaten } = req.body;
    if (eaten) {
      await prisma.mealLog.upsert({
        where: { userId_date_mealId: { userId: req.userId, date, mealId } },
        create: { userId: req.userId, date, mealId },
        update: {},
      });
    } else {
      await prisma.mealLog.deleteMany({ where: { userId: req.userId, date, mealId } });
    }
    res.json({ ok: true });
  } catch (error) {
    fail(res, req, 'data.meals.error', 'Failed to save meal', error);
  }
});

router.put('/goals', authMiddleware, writeLimiter, validateGoalsPayload, async (req, res) => {
  try {
    const { weekStart, goals } = req.body;
    const userId = req.userId;
    await prisma.$transaction([
      prisma.weeklyGoalState.deleteMany({
        where: { userId, weekStart, goalId: { notIn: goals.map((g) => g.id) } },
      }),
      ...goals.map((g) =>
        prisma.weeklyGoalState.upsert({
          where: { userId_weekStart_goalId: { userId, weekStart, goalId: g.id } },
          create: { userId, weekStart, goalId: g.id, label: g.label, done: g.done },
          update: { label: g.label, done: g.done },
        })
      ),
    ]);
    res.json({ ok: true });
  } catch (error) {
    fail(res, req, 'data.goals.error', 'Failed to save goals', error);
  }
});

router.post('/achievements', authMiddleware, writeLimiter, validateAchievementPayload, async (req, res) => {
  try {
    const { id, unlockedAt } = req.body;
    const row = await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: req.userId, achievementId: id } },
      create: { userId: req.userId, achievementId: id, unlockedAt: unlockedAt ? new Date(unlockedAt) : new Date() },
      update: {},
    });
    res.json({ id: row.achievementId, unlockedAt: row.unlockedAt.toISOString() });
  } catch (error) {
    fail(res, req, 'data.achievements.error', 'Failed to save achievement', error);
  }
});

router.put('/custom-workout', authMiddleware, writeLimiter, validateCustomWorkoutPayload, async (req, res) => {
  try {
    const { exercises } = req.body;
    const userId = req.userId;
    await prisma.$transaction([
      prisma.customExercise.deleteMany({ where: { userId } }),
      prisma.customExercise.createMany({
        data: exercises.map((e, position) => ({ userId, exerciseId: e.id, data: e, position })),
      }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    fail(res, req, 'data.custom_workout.error', 'Failed to save custom workout', error);
  }
});

router.put('/recovery/:date', authMiddleware, writeLimiter, validateRecoveryPayload, async (req, res) => {
  try {
    const { sleepHours, hrv, score } = req.body;
    const values = {
      sleepHours: Number(sleepHours),
      hrv: hrv === undefined || hrv === null ? null : Number(hrv),
      score: Math.round(Number(score)),
    };
    const row = await prisma.recoveryLog.upsert({
      where: { userId_date: { userId: req.userId, date: req.params.date } },
      create: { userId: req.userId, date: req.params.date, ...values },
      update: values,
    });
    res.json({ date: row.date, sleepHours: row.sleepHours, hrv: row.hrv, score: row.score });
  } catch (error) {
    fail(res, req, 'data.recovery.error', 'Failed to save recovery', error);
  }
});

export default router;
