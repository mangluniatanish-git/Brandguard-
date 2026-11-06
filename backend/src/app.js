import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.js';
import { brandRouter } from './routes/brand.js';
import { contentRouter } from './routes/content.js';
import { commentsRouter } from './routes/comments.js';
import { statusRouter } from './routes/status.js';
import { reviewRouter } from './routes/review.js';
import { findingsRouter, getContentFindings } from './routes/findings.js';
import { uploadRouter } from './routes/upload.js';
import { insightsRouter } from './routes/insights.js';
import { settingsRouter } from './routes/settings.js';
import { activityRouter } from './routes/activity.js';
import { adminRouter } from './routes/admin.js';
import { requireAuth } from './middleware/auth.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration: strictly allow FRONTEND_URL
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser agents (health checks, server curl, mobile)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();
      const allowedOrigin = (config.FRONTEND_URL || '').replace(/\/+$/, '').toLowerCase();

      if (
        normalizedOrigin === allowedOrigin ||
        normalizedOrigin.endsWith('.vercel.app') || (config.NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Global Rate Limiting
app.use(globalLimiter);

// JSON body limit (1 MB default for text payloads)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint (Render health check & monitoring)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'BrandGuard API',
  });
});

// Route registration (support both /api/* and root /* paths for serverless flexibility)
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/brand', '/brand'], brandRouter);

// Nested content sub-routes
app.use(['/api/content/:id/comments', '/content/:id/comments'], commentsRouter);
app.use(['/api/content/:id/status', '/content/:id/status'], statusRouter);
app.use(['/api/content/:id/review', '/content/:id/review'], reviewRouter);
app.get(['/api/content/:id/findings', '/content/:id/findings'], requireAuth, getContentFindings);
app.use(['/api/content/:contentId/findings', '/content/:contentId/findings'], findingsRouter);

app.use(['/api/content', '/content'], contentRouter);
app.use(['/api/findings', '/findings'], findingsRouter);
app.use(['/api/upload', '/upload'], uploadRouter);
app.use(['/api/insights', '/insights'], insightsRouter);
app.use(['/api/settings', '/settings'], settingsRouter);
app.use(['/api/activity', '/activity'], activityRouter);
app.use(['/api/admin', '/admin'], adminRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized safe error handler
app.use(errorHandler);
