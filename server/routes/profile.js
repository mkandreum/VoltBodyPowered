import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { validateProfileUpdatePayload } from '../middleware/validators.js';
import { logError } from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logError('profile.get.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/', authMiddleware, validateProfileUpdatePayload, async (req, res) => {
  try {
    const { 
      age, weight, height, gender, goal, currentState, 
      schedule, workHours, mealTimes, avatarConfig, 
      routine, diet, insights, profilePhoto, motivationPhoto,
      theme, motivationPhrase, goalDirection, goalTargetKg,
      goalTimelineMonths, trainingDaysPerWeek, sessionMinutes,
      weeklySpecialSession, foodPreferences, specialDish
    } = req.body;

    const mergedInsights = {
      ...(insights || {}),
      appPreferences: {
        ...(insights?.appPreferences || {}),
        theme,
        motivationPhrase,
        goalDirection,
        goalTargetKg,
        goalTimelineMonths,
        trainingDaysPerWeek,
        sessionMinutes,
        weeklySpecialSession,
        foodPreferences,
        specialDish,
      }
    };

    const profile = await prisma.userProfile.update({
      where: { userId: req.userId },
      data: {
        age,
        weight,
        height,
        gender,
        goal,
        goalDirection,
        goalTargetKg,
        goalTimelineMonths,
        currentState,
        schedule,
        trainingDaysPerWeek,
        sessionMinutes,
        workHours,
        theme,
        motivationPhrase,
        motivationPhoto,
        mealTimes,
        foodPreferences,
        weeklySpecialSession,
        specialDish,
        avatarConfig,
        routine,
        diet,
        insights: mergedInsights,
        profilePhoto
      }
    });

    res.json(profile);
  } catch (error) {
    logError('profile.update.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
