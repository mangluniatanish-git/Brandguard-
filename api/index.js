import { app } from '../backend/src/app.js';
import { getDb } from '../backend/src/repo/dbRepo.js';
import { runSeed } from '../backend/src/scripts/seed.js';

let initialized = false;

/**
 * Vercel Serverless Function entry point
 * Bridges Express.js application with Vercel's Serverless Function runtime.
 */
export default async function handler(req, res) {
  // Ensure DB seed exists on serverless instance initialization
  if (!initialized) {
    try {
      await getDb();
    } catch (err) {
      console.warn('Initial getDb() triggered fallback seed:', err.message);
      try {
        await runSeed();
      } catch (seedErr) {
        console.error('Database seed error:', seedErr);
      }
    }
    initialized = true;
  }

  // Normalize incoming URL so that Express routes (/api/...) match consistently
  if (!req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
