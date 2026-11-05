import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { reviewLimiter } from '../middleware/rateLimiter.js';
import { getContent } from '../repo/dbRepo.js';
import { runReviewPipeline } from '../services/reviewPipeline.js';

export const reviewRouter = Router({ mergeParams: true });

/**
 * POST /api/content/:id/review
 * Runs the compliance pipeline (Redaction -> Rule Engine -> Gemini -> Validator -> Save)
 */
reviewRouter.post('/', requireAuth, reviewLimiter, async (req, res, next) => {
  try {
    const content = await getContent(req.params.id);
    if (!content) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Content with ID "${req.params.id}" not found`,
      });
    }

    const result = await runReviewPipeline(content, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
