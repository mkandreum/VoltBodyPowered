import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { validateWorkoutLogPayload, validateProgressPhotoPayload, validateWeightLogPayload } from '../middleware/validators.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { logError } from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();
const weightLogLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20, keyPrefix: 'weight-log' });

// Get workout logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    logError('workout.get_logs.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Add workout log
router.post('/logs', authMiddleware, validateWorkoutLogPayload, async (req, res) => {
  try {
    const { date, exerciseId, weight, reps } = req.body;

    const log = await prisma.workoutLog.create({
      data: {
        userId: req.userId,
        date: new Date(date),
        exerciseId,
        weight,
        reps
      }
    });

    res.json(log);
  } catch (error) {
    logError('workout.add_log.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to add log' });
  }
});

// Get progress photos
router.get('/photos', authMiddleware, async (req, res) => {
  try {
    const photos = await prisma.progressPhoto.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });

    res.json(photos);
  } catch (error) {
    logError('workout.get_photos.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Add progress photo
router.post('/photos', authMiddleware, validateProgressPhotoPayload, async (req, res) => {
  try {
    const { date, url } = req.body;

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: req.userId,
        date: new Date(date),
        url
      }
    });

    res.json(photo);
  } catch (error) {
    logError('workout.add_photo.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to add photo' });
  }
});

// Get weight logs
router.get('/weight-logs', authMiddleware, weightLogLimiter, async (req, res) => {
  try {
    const logs = await prisma.weightLog.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'asc' }
    });
    res.json(logs);
  } catch (error) {
    logError('workout.get_weight_logs.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get weight logs' });
  }
});

// Upsert weight log (one per day per user)
router.post('/weight-logs', authMiddleware, weightLogLimiter, validateWeightLogPayload, async (req, res) => {
  try {
    const { date, weight } = req.body;
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);

    const log = await prisma.weightLog.upsert({
      where: { userId_date: { userId: req.userId, date: dayStart } },
      create: { userId: req.userId, date: dayStart, weight },
      update: { weight },
    });
    res.json(log);
  } catch (error) {
    logError('workout.add_weight_log.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to save weight log' });
  }
});

export default router;