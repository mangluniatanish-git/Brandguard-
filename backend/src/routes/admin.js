import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { runSeed } from '../scripts/seed.js';
import { logger } from '../utils/logger.js';

export const adminRouter = Router();

/**
 * POST /api/admin/reset-demo
 * Restores initial demo database seed (Admin only)
 */
adminRouter.post('/reset-demo', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    logger.info({ admin: req.user.name }, 'Admin triggered demo database reset');
    await runSeed();
    res.json({
      success: true,
      message: 'Demo database has been successfully reset to initial seed data.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
