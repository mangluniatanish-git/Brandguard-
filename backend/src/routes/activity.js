import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAuditLogs } from '../repo/dbRepo.js';

export const activityRouter = Router();

/**
 * GET /api/activity
 * Retrieve audit log entries (who, what, when)
 */
activityRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.contentId) {
      filter.contentId = req.query.contentId;
    }
    const logs = await getAuditLogs(filter);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});
