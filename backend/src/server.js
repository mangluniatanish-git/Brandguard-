import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from './app.js';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { getDb } from './repo/dbRepo.js';
import { runSeed } from './scripts/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/db.json');

async function startServer() {
  try {
    // 2. On startup, if data/db.json is missing, run the seed automatically
    try {
      await fs.access(DB_PATH);
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.info('data/db.json not found on startup. Auto-seeding database...');
        await runSeed();
      }
    }

    // Ensure DB is initialized in memory repository
    await getDb();

    const server = app.listen(config.PORT, () => {
      logger.info(`BrandGuard API server listening on port ${config.PORT}`);
      logger.info(`Frontend URL: ${config.FRONTEND_URL}`);
      logger.info(`Demo mode: ${config.DEMO_MODE ? 'ENABLED' : 'DISABLED'}`);
    });

    return server;
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
