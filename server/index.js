import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import profileRoutes from './routes/profile.js';
import workoutRoutes from './routes/workout.js';
import aiRoutes from './routes/ai.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requestLogger } from './middleware/requestLogger.js';
import { sanitizeRequestBody } from './middleware/sanitize.js';
import { logError, logInfo } from './utils/logger.js';
import { getMetricsSnapshot } from './utils/metrics.js';
import prisma from './utils/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { setTimeout as delay } from 'timers/promises';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Startup delay to allow infrastructure to stabilize
const STARTUP_DELAY = parseInt(process.env.STARTUP_DELAY_MS || '3000');
if (STARTUP_DELAY > 0) {
  console.log(`Startup delay: ${STARTUP_DELAY}ms to allow infrastructure to stabilize`);
  await delay(STARTUP_DELAY);
}

// Verify static files exist
const staticPath = path.join(__dirname, '../public');
console.log(`Static files path: ${staticPath}`);
console.log(`Static path exists: ${fs.existsSync(staticPath)}`);
if (fs.existsSync(staticPath)) {
  const files = fs.readdirSync(staticPath);
  console.log(`Files in static directory: ${files.join(', ')}`);
}

// Middleware
app.use(cors());
app.use(requestLogger);
app.use(express.json({ limit: '12mb' }));
app.use(sanitizeRequestBody);
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/ai', aiRoutes);

// Health check — verifies DB connectivity
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString(), requestId: req.requestId });
  } catch (err) {
    logError('health.check.failed', { message: err.message });
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Lightweight health check that doesn't query DB
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), requestId: req.requestId });
});

app.get('/api/metrics', (req, res) => {
  const metricsKey = process.env.METRICS_KEY;
  const providedKey = req.headers['x-metrics-key'];

  if (metricsKey && providedKey !== metricsKey) {
    return res.status(401).json({ error: 'Unauthorized metrics access' });
  }

  return res.json({
    requestId: req.requestId,
    metrics: getMetricsSnapshot(),
  });
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve index.html for API calls or missing assets
  if (req.path.startsWith('/api') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf)$/)) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  const indexPath = path.join(__dirname, '../public/index.html');
  console.log(`Serving SPA fallback for ${req.path} -> ${indexPath}`);
  res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  logError('http.request.unhandled_error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({ error: 'Something went wrong!', requestId: req.requestId });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logInfo('server.started', { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('server.stopping', { signal: 'SIGTERM' });
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
