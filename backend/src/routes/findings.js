import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  getContent,
  getFinding,
  updateFinding,
  addAuditLog,
} from '../repo/dbRepo.js';

export const findingsRouter = Router({ mergeParams: true });

const patchFindingSchema = z
  .object({
    action: z.enum(['accepted', 'edited', 'dismissed']).optional(),
    status: z.enum(['open', 'accepted', 'edited', 'dismissed']).optional(),
    dismissalReason: z.string().optional(),
    editedText: z.string().optional(),
    suggestion: z.string().optional(),
  })
  .refine(
    (data) => {
      const effectiveAction = data.action || data.status;
      if (effectiveAction === 'dismissed' && (!data.dismissalReason || !data.dismissalReason.trim())) {
        return false;
      }
      return true;
    },
    {
      message: 'Dismissal requires a non-empty dismissalReason',
      path: ['dismissalReason'],
    }
  );

/**
 * GET /api/content/:id/findings
 * Retrieve findings for a content item
 */
export async function getContentFindings(req, res, next) {
  try {
    const content = await getContent(req.params.id);
    if (!content) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Content with ID "${req.params.id}" not found`,
      });
    }
    res.json(content.findings || []);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/findings/:id (or /api/content/:contentId/findings/:id)
 * Human decision on finding: accept | edit | dismiss
 */
export async function handlePatchFinding(req, res, next) {
  try {
    const findingId = req.params.findingId || req.params.id;
    const found = await getFinding(findingId);

    if (!found) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Finding with ID "${findingId}" not found`,
      });
    }

    const { finding, content } = found;

    // Check permissions: creator can respond to their own findings; reviewers and admins can respond to any
    const isOwner = content.creatorId === req.user.id || content.creator === req.user.name;
    const isReviewerOrAdmin = req.user.role === 'reviewer' || req.user.role === 'admin';

    if (!isOwner && !isReviewerOrAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify findings for this content',
      });
    }

    const action = req.body.action || req.body.status || 'open';
    const updates = {
      status: action,
      updatedAt: new Date().toISOString(),
      actor: req.user.name,
      actorRole: req.user.role,
    };

    if (action === 'dismissed') {
      updates.dismissalReason = req.body.dismissalReason.trim();
    } else if (action === 'edited') {
      const finalVal = req.body.editedText || req.body.suggestion || finding.suggestion;
      updates.suggestion = finalVal;
      updates.finalText = finalVal; // store final text
    }

    // "Nothing is ever applied automatically."
    const result = await updateFinding(findingId, updates);

    await addAuditLog({
      userId: req.user.id,
      user: req.user.name,
      action: 'UPDATE_FINDING',
      contentId: content.id,
      details: `Finding "${finding.quote}" marked as ${action}${
        updates.dismissalReason ? ` (Reason: ${updates.dismissalReason})` : ''
      }`,
    });

    res.json(result.finding);
  } catch (err) {
    next(err);
  }
}

findingsRouter.patch('/:id', requireAuth, validateBody(patchFindingSchema), handlePatchFinding);
findingsRouter.patch('/:findingId', requireAuth, validateBody(patchFindingSchema), handlePatchFinding);
