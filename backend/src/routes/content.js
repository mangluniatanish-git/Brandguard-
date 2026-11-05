import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  listContent,
  getContent,
  saveContent,
  addAuditLog,
} from '../repo/dbRepo.js';

export const contentRouter = Router();

const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  channel: z.string().default('Instagram'),
  rulePack: z.string().default('India ASCI/CCPA'),
  text: z.string().min(1, 'Content text is required'),
  fileName: z.string().optional().nullable(),
});

const updateContentSchema = z.object({
  title: z.string().optional(),
  channel: z.string().optional(),
  rulePack: z.string().optional(),
  text: z.string().min(1, 'Revised text is required'),
  summary: z.string().optional(),
});

const listFilterSchema = z.object({
  creator: z.string().optional(),
  status: z.string().optional(),
  rulePack: z.string().optional(),
});

/**
 * GET /api/content
 * List all content with optional filters
 */
contentRouter.get('/', requireAuth, validateQuery(listFilterSchema), async (req, res, next) => {
  try {
    const filters = { ...req.query };

    // If role is creator, only show their own content unless filter is explicitly set or admin/reviewer
    if (req.user.role === 'creator' && !filters.creator) {
      filters.creator = req.user.name;
    }

    const items = await listContent(filters);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/content/:id
 * Retrieve a single content item with its versions, comments, findings, activity
 */
contentRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await getContent(req.params.id);
    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Content with ID "${req.params.id}" not found`,
      });
    }

    // Role check: creators can only read their own content (reviewers, managers, admins can view all)
    if (req.user.role === 'creator' && item.creatorId && item.creatorId !== req.user.id && item.creator !== req.user.name) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view content created by another author',
      });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/content
 * Create new content draft (Creator or Admin)
 */
contentRouter.post(
  '/',
  requireAuth,
  requireRole('creator', 'admin'),
  validateBody(createContentSchema),
  async (req, res, next) => {
    try {
      const allItems = await listContent();
      const newId = `cnt-0${allItems.length + 1}`;
      const now = new Date().toISOString();

      const newContent = {
        id: newId,
        title: req.body.title,
        channel: req.body.channel,
        rulePack: req.body.rulePack,
        status: 'Draft',
        creator: req.user.name,
        creatorRole: req.user.role,
        creatorId: req.user.id,
        createdAt: now,
        updatedAt: now,
        text: req.body.text,
        fileName: req.body.fileName || null,
        versions: [
          {
            versionNumber: 1,
            createdAt: now,
            author: req.user.name,
            summary: req.body.fileName
              ? `Extracted from ${req.body.fileName}`
              : 'Initial draft submission',
            text: req.body.text,
          },
        ],
        comments: [],
        activityLog: [
          {
            id: `act-${Date.now()}-1`,
            date: now,
            user: req.user.name,
            action: 'Draft created and submitted',
          },
        ],
        findings: [],
      };

      await saveContent(newContent);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'CREATE_CONTENT',
        contentId: newId,
        details: `Created new content: "${newContent.title}"`,
      });

      res.status(201).json(newContent);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/content/:id
 * Edit content draft — each edit creates a new version!
 */
contentRouter.put(
  '/:id',
  requireAuth,
  validateBody(updateContentSchema),
  async (req, res, next) => {
    try {
      const content = await getContent(req.params.id);
      if (!content) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Content with ID "${req.params.id}" not found`,
        });
      }

      // Permissions: Creator can only edit own content; Admin can edit any
      const isOwner = content.creatorId === req.user.id || content.creator === req.user.name;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the content creator or an administrator can edit this content',
        });
      }

      const now = new Date().toISOString();
      const newVersionNumber = (content.versions?.length || 0) + 1;

      // Create new version snapshot
      const newVersion = {
        versionNumber: newVersionNumber,
        createdAt: now,
        author: req.user.name,
        summary: req.body.summary || `Version ${newVersionNumber} revision`,
        text: req.body.text,
      };

      content.versions = content.versions || [];
      content.versions.push(newVersion);

      // Update active text and metadata
      content.text = req.body.text;
      if (req.body.title) content.title = req.body.title;
      if (req.body.channel) content.channel = req.body.channel;
      if (req.body.rulePack) content.rulePack = req.body.rulePack;
      content.updatedAt = now;

      // Status moves to Draft or AI Reviewed upon editing
      if (content.status === 'Approved' || content.status === 'Changes Requested') {
        content.status = 'Draft';
      }

      content.activityLog = content.activityLog || [];
      content.activityLog.push({
        id: `act-${Date.now()}`,
        date: now,
        user: req.user.name,
        action: `Pushed Version ${newVersionNumber} update`,
      });

      await saveContent(content);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'EDIT_CONTENT',
        contentId: content.id,
        details: `Saved Version ${newVersionNumber} revision`,
      });

      res.json(content);
    } catch (err) {
      next(err);
    }
  }
);
