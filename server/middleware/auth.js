import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logError('auth.middleware.invalid_token', {
      requestId: req.requestId,
      message: error.message,
    });
    return res.status(401).json({ error: 'Invalid token' });
  }
};
