import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getSettings, updateSettings, addAuditLog } from '../repo/dbRepo.js';

export const settingsRouter = Router();

const updateSettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  externalAiEnabled: z.boolean().optional(), // alias
  redactionEnabled: z.boolean().optional(),
  disclosureText: z.string().optional(),
  aiDisclosureText: z.string().optional(), // alias
  activeRulePack: z.string().optional(),
});

/**
 * GET /api/settings
 * Retrieve system settings (AI toggles, redaction, disclosure text)
 */
settingsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Admin updates system settings
 */
settingsRouter.put(
  '/',
  requireAuth,
  requireRole('admin'),
  validateBody(updateSettingsSchema),
  async (req, res, next) => {
    try {
      const payload = {
        aiEnabled: req.body.aiEnabled ?? req.body.externalAiEnabled,
        redactionEnabled: req.body.redactionEnabled,
        disclosureText: req.body.disclosureText ?? req.body.aiDisclosureText,
        activeRulePack: req.body.activeRulePack,
      };

      // Clean out undefined
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const updated = await updateSettings(payload);

      await addAuditLog({
        userId: req.user.id,
        user: req.user.name,
        action: 'UPDATE_SETTINGS',
        details: 'Admin updated AI scan and redaction configuration',
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
