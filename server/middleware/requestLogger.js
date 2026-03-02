import { randomUUID } from 'crypto';
import { logInfo } from '../utils/logger.js';
import { recordRequest } from '../utils/metrics.js';

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const start = Date.now();

  req.requestId = String(requestId);
  res.setHeader('x-request-id', String(requestId));

  logInfo('http.request.started', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    recordRequest({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });

    logInfo('http.request.finished', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.userId || null,
    });
  });

  next();
}
