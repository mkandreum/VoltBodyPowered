import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get workout logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Add workout log
router.post('/logs', authMiddleware, async (req, res) => {
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
    console.error('Add log error:', error);
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
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Add progress photo
router.post('/photos', authMiddleware, async (req, res) => {
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
    console.error('Add photo error:', error);
    res.status(500).json({ error: 'Failed to add photo' });
  }
});

export default router;
