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

    const mergedInsights = insights !== undefined ? {
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
    } : undefined;

    const profile = await prisma.userProfile.update({
      where: { userId: req.userId },
      data: {
        ...(age !== undefined && { age }),
        ...(weight !== undefined && { weight }),
        ...(height !== undefined && { height }),
        ...(gender !== undefined && { gender }),
        ...(goal !== undefined && { goal }),
        ...(goalDirection !== undefined && { goalDirection }),
        ...(goalTargetKg !== undefined && { goalTargetKg }),
        ...(goalTimelineMonths !== undefined && { goalTimelineMonths }),
        ...(currentState !== undefined && { currentState }),
        ...(schedule !== undefined && { schedule }),
        ...(trainingDaysPerWeek !== undefined && { trainingDaysPerWeek }),
        ...(sessionMinutes !== undefined && { sessionMinutes }),
        ...(workHours !== undefined && { workHours }),
        ...(theme !== undefined && { theme }),
        ...(motivationPhrase !== undefined && { motivationPhrase }),
        ...(motivationPhoto !== undefined && { motivationPhoto }),
        ...(mealTimes !== undefined && { mealTimes }),
        ...(foodPreferences !== undefined && { foodPreferences }),
        ...(weeklySpecialSession !== undefined && { weeklySpecialSession }),
        ...(specialDish !== undefined && { specialDish }),
        ...(avatarConfig !== undefined && { avatarConfig }),
        ...(routine !== undefined && { routine }),
        ...(diet !== undefined && { diet }),
        ...(mergedInsights !== undefined && { insights: mergedInsights }),
        ...(profilePhoto !== undefined && { profilePhoto }),
      }
    });

    res.json(profile);
  } catch (error) {
    logError('profile.update.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
