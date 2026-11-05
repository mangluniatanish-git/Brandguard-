import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  getBrand,
  updateBrandGuidelines,
  updateApprovedFacts,
  updateTerminology,
  addAuditLog,
} from '../repo/dbRepo.js';

export const brandRouter = Router();

const guidelineItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().optional().default('General'),
  text: z.string().min(1),
});

const factItemSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  source: z.string().min(1),
  category: z.string().optional().default('General'),
});

const terminologySchema = z.object({
  preferred: z
    .array(
      z.object({
        term: z.string().min(1),
        note: z.string().optional().default(''),
      })
    )
    .optional(),
  banned: z
    .array(
      z.object({
        term: z.string().min(1),
        reason: z.string().optional().default(''),
      })
    )
    .optional(),
  // Also support single item add/delete payloads from frontend
  type: z.enum(['preferred', 'banned']).optional(),
  item: z
    .object({
      term: z.string().min(1),
      note: z.string().optional(),
      reason: z.string().optional(),
    })
    .optional(),
  action: z.enum(['add', 'delete']).optional(),
});

/**
 * GET /api/brand
 * Retrieve brand guidelines, approved facts, terminology, settings, and rule packs
 */
brandRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const brand = await getBrand();
    res.json(brand);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/brand/guidelines
 * Admin updates guideline clause(s)
 */
brandRouter.put(
  '/guidelines',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const brand = await getBrand();
      let currentGuidelines = brand.guidelines || [];

      if (Array.isArray(req.body)) {
        // Replace or batch update
        currentGuidelines = req.body;
      } else {
        // Single clause upsert
        const parsed = guidelineItemSchema.parse(req.body);
        const idx = currentGuidelines.findIndex((g) => g.id === parsed.id);
        if (idx >= 0) {
          currentGuidelines[idx] = { ...currentGuidelines[idx], ...parsed };
        } else {
          currentGuidelines.push(parsed);
        }
      }

      const updated = await updateBrandGuidelines(currentGuidelines);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'UPDATE_GUIDELINE',
        details: Array.isArray(req.body)
          ? `Updated batch of ${req.body.length} guidelines`
          : `Updated guideline ${req.body.id}`,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/brand/facts
 * Admin updates approved fact(s)
 */
brandRouter.put(
  '/facts',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const brand = await getBrand();
      let currentFacts = brand.approvedFacts || [];

      if (Array.isArray(req.body)) {
        currentFacts = req.body;
      } else {
        const parsed = factItemSchema.parse(req.body);
        const idx = currentFacts.findIndex((f) => f.id === parsed.id);
        if (idx >= 0) {
          currentFacts[idx] = { ...currentFacts[idx], ...parsed };
        } else {
          currentFacts.push(parsed);
        }
      }

      const updated = await updateApprovedFacts(currentFacts);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'UPDATE_APPROVED_FACT',
        details: Array.isArray(req.body)
          ? `Updated batch of ${req.body.length} facts`
          : `Updated fact ${req.body.id}`,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/brand/terminology
 * Admin updates terminology
 */
brandRouter.put(
  '/terminology',
  requireAuth,
  requireRole('admin'),
  validateBody(terminologySchema),
  async (req, res, next) => {
    try {
      const brand = await getBrand();
      let currentTerm = brand.terminology || { preferred: [], banned: [] };

      // Case 1: single action { type, item, action: 'add'|'delete' }
      if (req.body.type && req.body.item) {
        const { type, item, action = 'add' } = req.body;
        if (type === 'preferred') {
          if (action === 'delete') {
            currentTerm.preferred = currentTerm.preferred.filter((t) => t.term !== item.term);
          } else {
            const exists = currentTerm.preferred.some((t) => t.term === item.term);
            if (!exists) currentTerm.preferred.push(item);
          }
        } else if (type === 'banned') {
          if (action === 'delete') {
            currentTerm.banned = currentTerm.banned.filter((t) => t.term !== item.term);
          } else {
            const exists = currentTerm.banned.some((t) => t.term === item.term);
            if (!exists) currentTerm.banned.push(item);
          }
        }
      } else {
        // Case 2: full arrays
        if (req.body.preferred) currentTerm.preferred = req.body.preferred;
        if (req.body.banned) currentTerm.banned = req.body.banned;
      }

      const updated = await updateTerminology(currentTerm);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'UPDATE_TERMINOLOGY',
        details: 'Updated brand preferred/banned terminology',
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
