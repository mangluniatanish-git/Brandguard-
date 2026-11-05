import { verifyToken } from '../utils/jwt.js';
import { getUserById } from '../repo/dbRepo.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token missing or invalid',
      });
    }

    const token = authHeader.split(' ')[1];

    if (config.demoMode && (token === 'demo-token' || token === 'undefined' || token === 'null')) {
      const user = await getUserById('user-creator');
      if (user) {
        const { passwordHash, ...safeUser } = user;
        req.user = safeUser;
        return next();
      }
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
    }

    const user = await getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User no longer exists',
      });
    }

    // Attach user without passwordHash
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'Authentication failure');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Admin has access to all routes unless explicitly restricted
    const effectiveRoles = allowedRoles.includes('admin')
      ? allowedRoles
      : [...allowedRoles, 'admin'];

    if (!effectiveRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role "${req.user.role}" does not have permission to access this resource`,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}
