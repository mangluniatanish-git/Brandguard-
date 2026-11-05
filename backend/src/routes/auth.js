import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { getUserByEmail, getUserByRole, getUserById, listUsers, addAuditLog } from '../repo/dbRepo.js';
import { signToken } from '../utils/jwt.js';
import { config } from '../utils/config.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const demoLoginSchema = z.object({
  role: z.string().optional(),
  roleOrId: z.string().optional(),
}).refine((data) => data.role || data.roleOrId, {
  message: 'Either role or roleOrId must be provided',
});

/**
 * Standard Email/Password Login
 * POST /api/auth/login
 */
authRouter.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const { passwordHash, ...safeUser } = user;

    await addAuditLog({
      userId: user.id,
      user: user.name,
      action: 'USER_LOGIN',
      details: `User logged in with email: ${user.email}`,
    });

    return res.json({
      token,
      user: safeUser,
      ...safeUser, // ensures direct compatibility with any frontend expectations
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Demo Login (Available when DEMO_MODE=true)
 * POST /api/auth/demo-login
 */
authRouter.post('/demo-login', authLimiter, validateBody(demoLoginSchema), async (req, res, next) => {
  try {
    if (!config.DEMO_MODE) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Demo login is disabled in this environment',
      });
    }

    const target = req.body.role || req.body.roleOrId;
    let user = await getUserByRole(target);
    if (!user) {
      user = await getUserById(target);
    }

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Demo user for role or id "${target}" not found`,
      });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const { passwordHash, ...safeUser } = user;

    await addAuditLog({
      userId: user.id,
      user: user.name,
      action: 'DEMO_LOGIN',
      details: `Demo session initiated for role: ${user.role}`,
    });

    return res.json({
      token,
      user: safeUser,
      ...safeUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Current Authenticated User Profile
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: req.user,
    ...req.user,
  });
});

/**
 * List Demo Users (Helper for frontend role picker)
 * GET /api/auth/demo-users
 */
authRouter.get('/demo-users', async (req, res, next) => {
  try {
    const users = await listUsers();
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);
    return res.json(safeUsers);
  } catch (err) {
    next(err);
  }
});
