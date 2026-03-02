import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

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
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { 
      age, weight, height, gender, goal, currentState, 
      schedule, workHours, mealTimes, avatarConfig, 
      routine, diet, insights, profilePhoto 
    } = req.body;

    const profile = await prisma.userProfile.update({
      where: { userId: req.userId },
      data: {
        age,
        weight,
        height,
        gender,
        goal,
        currentState,
        schedule,
        workHours,
        mealTimes,
        avatarConfig,
        routine,
        diet,
        insights,
        profilePhoto
      }
    });

    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
