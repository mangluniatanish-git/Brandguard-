import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getContent, saveContent, addAuditLog } from '../repo/dbRepo.js';

export const statusRouter = Router({ mergeParams: true });

const ALLOWED_STATUSES = [
  'Draft',
  'AI Reviewed',
  'In Human Review',
  'Changes Requested',
  'Approved',
];

const VALID_TRANSITIONS = {
  Draft: ['AI Reviewed', 'In Human Review'],
  'AI Reviewed': ['In Human Review', 'Draft', 'Changes Requested'],
  'In Human Review': ['Approved', 'Changes Requested', 'Draft'],
  'Changes Requested': ['Draft', 'AI Reviewed', 'In Human Review'],
  Approved: ['In Human Review', 'Draft'], // allow re-opening if edits required
};

const updateStatusSchema = z.object({
  status: z.enum(ALLOWED_STATUSES),
  comment: z.string().optional(),
  reason: z.string().optional(), // alias supported
});

/**
 * PATCH /api/content/:id/status
 * State machine transition with approval guards and comment enforcement
 */
statusRouter.patch(
  '/',
  requireAuth,
  validateBody(updateStatusSchema),
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

      const nextStatus = req.body.status;
      const currentStatus = content.status || 'Draft';
      const commentText = req.body.comment || req.body.reason || '';

      // 1. Role checks: Creator cannot approve their own content
      const isCreator = req.user.role === 'creator' || req.user.id === content.creatorId || req.user.name === content.creator;
      if (nextStatus === 'Approved') {
        if (isCreator && req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Creators cannot approve their own content. A separate reviewer or admin is required.',
          });
        }
      }

      // Reviewer and Admin can move to Changes Requested or Approved
      if ((nextStatus === 'Approved' || nextStatus === 'Changes Requested') && req.user.role === 'creator') {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Role "${req.user.role}" is not authorized to set status to "${nextStatus}". Reviewer or Admin required.`,
        });
      }

      // 2. Validate state machine transitions (admin can bypass)
      if (req.user.role !== 'admin' && currentStatus !== nextStatus) {
        const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(nextStatus)) {
          return res.status(400).json({
            error: 'Invalid State Transition',
            message: `Cannot transition content from "${currentStatus}" to "${nextStatus}". Allowed next states: ${allowedNext.join(', ')}`,
          });
        }
      }

      // 3. "Request changes requires a comment."
      if (nextStatus === 'Changes Requested' && !commentText.trim()) {
        return res.status(400).json({
          error: 'Comment Required',
          message: 'A comment explaining the required changes is mandatory when requesting changes.',
        });
      }

      // 4. "Approve is blocked while any high-severity finding is still open."
      if (nextStatus === 'Approved') {
        const openHighFindings = (content.findings || []).filter(
          (f) => f.severity === 'high' && (f.status === 'open' || !f.status)
        );
        if (openHighFindings.length > 0) {
          return res.status(400).json({
            error: 'Approval Blocked',
            message: `Approval blocked: ${openHighFindings.length} high-severity finding(s) remain open. Address, edit, or dismiss them with justification before approving.`,
            openHighFindings: openHighFindings.map((f) => ({
              id: f.id,
              ruleId: f.ruleId,
              quote: f.quote,
            })),
          });
        }
      }

      // 5. Apply status change
      content.status = nextStatus;
      content.updatedAt = new Date().toISOString();

      // If a comment was provided, push to comments thread
      if (commentText.trim()) {
        content.comments = content.comments || [];
        content.comments.push({
          id: `comm-${Date.now()}`,
          author: req.user.name,
          role: req.user.role,
          avatar: req.user.avatar || req.user.name.slice(0, 2).toUpperCase(),
          createdAt: content.updatedAt,
          text: `[Status Change to ${nextStatus}]: ${commentText}`,
        });
      }

      // Log in content activityLog
      content.activityLog = content.activityLog || [];
      content.activityLog.push({
        id: `act-${Date.now()}`,
        date: content.updatedAt,
        user: req.user.name,
        action: `Changed status to "${nextStatus}"${commentText ? `: ${commentText}` : ''}`,
      });

      await saveContent(content);

      // Audit log entry
      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'CHANGE_STATUS',
        contentId: content.id,
        details: `Status changed from "${currentStatus}" to "${nextStatus}"`,
      });

      res.json(content);
    } catch (err) {
      next(err);
    }
  }
);
