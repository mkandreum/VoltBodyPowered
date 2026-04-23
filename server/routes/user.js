import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { logError } from '../utils/logger.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        profile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logError('user.me.error', { requestId: req.requestId, message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
