import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getContent, addComment, addAuditLog } from '../repo/dbRepo.js';

export const commentsRouter = Router({ mergeParams: true });

const createCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

/**
 * POST /api/content/:id/comments
 * Add review comment to content item
 */
commentsRouter.post(
  '/',
  requireAuth,
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const contentId = req.params.id;
      const content = await getContent(contentId);

      if (!content) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Content with ID "${contentId}" not found`,
        });
      }

      const newComment = {
        id: `comm-${Date.now()}`,
        author: req.user.name,
        role: req.user.role,
        avatar: req.user.avatar || req.user.name.slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
        text: req.body.text,
      };

      await addComment(contentId, newComment);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'ADD_COMMENT',
        contentId,
        details: `Added review comment: "${req.body.text.slice(0, 40)}..."`,
      });

      res.status(201).json(newComment);
    } catch (err) {
      next(err);
    }
  }
);
