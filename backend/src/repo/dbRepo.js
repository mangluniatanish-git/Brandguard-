import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DB_PATH = path.resolve(__dirname, '../../data/db.json');
const DB_PATH = isServerless
  ? path.join(os.tmpdir(), 'brandguard_db.json')
  : BUNDLED_DB_PATH;

// Serialized write promise queue
let writeQueue = Promise.resolve();

// In-memory cache for fast read access
let cache = null;

async function ensureDir() {
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Atomic and serialized write to db.json with Windows lock retry
 */
async function atomicWrite(data) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        await ensureDir();
        const tmpPath = `${DB_PATH}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(tmpPath, jsonString, 'utf-8');

        // Robust Windows rename with retry loop for EPERM/EBUSY
        let renamed = false;
        let attempts = 0;
        while (!renamed && attempts < 5) {
          try {
            await fs.rename(tmpPath, DB_PATH);
            renamed = true;
          } catch (renameErr) {
            if ((renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') && attempts < 4) {
              attempts++;
              await new Promise((r) => setTimeout(r, 40 * attempts));
            } else {
              // Fallback to copy + unlink
              try {
                await fs.copyFile(tmpPath, DB_PATH);
                await fs.unlink(tmpPath).catch(() => {});
                renamed = true;
              } catch (fallbackErr) {
                throw renameErr;
              }
            }
          }
        }

        cache = JSON.parse(jsonString); // update cache
        resolve(cache);
      } catch (err) {
        logger.error({ err }, 'Failed atomic db write');
        reject(err);
      }
    }).catch(reject);
  });
}

/**
 * Read data from db.json (with in-memory cache)
 */
async function readDb() {
  if (cache) return JSON.parse(JSON.stringify(cache));

  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    cache = JSON.parse(raw);
    return JSON.parse(JSON.stringify(cache));
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.info('Database db.json not found during read. Initializing with seed data...');
      if (isServerless) {
        try {
          const bundledRaw = await fs.readFile(BUNDLED_DB_PATH, 'utf-8');
          cache = JSON.parse(bundledRaw);
          await atomicWrite(cache);
          return JSON.parse(JSON.stringify(cache));
        } catch (_) {
          // Bundled file not accessible, continue to runSeed
        }
      }
      const { runSeed } = await import('../scripts/seed.js');
      await runSeed();
      const raw = await fs.readFile(DB_PATH, 'utf-8');
      cache = JSON.parse(raw);
      return JSON.parse(JSON.stringify(cache));
    }
    throw err;
  }
}

// -------------------------------------------------------------
// REPOSITORY INTERFACE (clean and async, ready for Supabase later)
// -------------------------------------------------------------

export async function initDb(data) {
  return await atomicWrite(data);
}

export async function getDb() {
  return await readDb();
}

// User repository
export async function listUsers() {
  const db = await readDb();
  return db.users || [];
}

export async function getUserById(id) {
  const db = await readDb();
  return (db.users || []).find((u) => u.id === id) || null;
}

export async function getUserByEmail(email) {
  const db = await readDb();
  return (db.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function getUserByRole(role) {
  const db = await readDb();
  return (db.users || []).find((u) => u.role.toLowerCase() === role.toLowerCase()) || null;
}

// Brand repository
export async function getBrand() {
  const db = await readDb();
  return {
    ...db.brand,
    settings: db.settings,
  };
}

export async function updateBrandGuidelines(guidelines) {
  const db = await readDb();
  db.brand.guidelines = guidelines;
  await atomicWrite(db);
  return db.brand.guidelines;
}

export async function updateApprovedFacts(facts) {
  const db = await readDb();
  db.brand.approvedFacts = facts;
  await atomicWrite(db);
  return db.brand.approvedFacts;
}

export async function updateTerminology(terminology) {
  const db = await readDb();
  db.brand.terminology = terminology;
  await atomicWrite(db);
  return db.brand.terminology;
}

// Content repository
export async function listContent(filter = {}) {
  const db = await readDb();
  let list = db.contents || [];

  if (filter.creator) {
    list = list.filter((c) => c.creator === filter.creator || c.creatorRole === filter.creator);
  }
  if (filter.status && filter.status !== 'All') {
    list = list.filter((c) => c.status === filter.status);
  }
  if (filter.rulePack) {
    list = list.filter((c) => c.rulePack === filter.rulePack);
  }

  return list;
}

export async function getContent(id) {
  const db = await readDb();
  return (db.contents || []).find((c) => c.id === id) || null;
}

export async function saveContent(content) {
  const db = await readDb();
  const idx = (db.contents || []).findIndex((c) => c.id === content.id);
  if (idx >= 0) {
    db.contents[idx] = content;
  } else {
    db.contents = db.contents || [];
    db.contents.unshift(content);
  }
  await atomicWrite(db);
  return content;
}

// Findings repository
export async function listFindings(contentId) {
  const content = await getContent(contentId);
  return content ? content.findings || [] : [];
}

export async function getFinding(findingId) {
  const db = await readDb();
  for (const content of db.contents || []) {
    const finding = (content.findings || []).find((f) => f.id === findingId);
    if (finding) return { finding, content };
  }
  return null;
}

export async function updateFinding(findingId, updates) {
  const db = await readDb();
  for (const content of db.contents || []) {
    const idx = (content.findings || []).findIndex((f) => f.id === findingId);
    if (idx >= 0) {
      const originalFinding = content.findings[idx];
      content.findings[idx] = { ...originalFinding, ...updates };

      const action = updates.status || updates.action;
      if (action === 'accepted' || action === 'edited') {
        const replacement = updates.finalText || updates.suggestion || originalFinding.suggestion;
        if (replacement && originalFinding.quote && content.text && content.text.includes(originalFinding.quote)) {
          // Compute revised copy text
          const newText = content.text.replace(originalFinding.quote, replacement);
          content.text = newText;

          // Create new version in version history
          content.versions = content.versions || [];
          const newVerNum = content.versions.length + 1;
          content.versions.push({
            versionNumber: newVerNum,
            createdAt: new Date().toISOString(),
            author: updates.actor || 'Reviewer',
            summary: action === 'accepted'
              ? `Accepted suggestion for "${originalFinding.quote}" → "${replacement}"`
              : `Edited suggestion for "${originalFinding.quote}" → "${replacement}"`,
            text: newText,
          });

          // Add to activity log
          content.activityLog = content.activityLog || [];
          content.activityLog.push({
            id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date().toISOString(),
            user: updates.actor || 'Reviewer',
            action: `${action === 'accepted' ? 'Accepted' : 'Edited'} finding "${originalFinding.quote}" and created Version ${newVerNum}`,
          });
        }
      }

      content.updatedAt = new Date().toISOString();
      await atomicWrite(db);
      return { finding: content.findings[idx], content };
    }
  }
  return null;
}

export async function saveFindings(contentId, findings) {
  const db = await readDb();
  const content = (db.contents || []).find((c) => c.id === contentId);
  if (!content) return null;
  content.findings = findings;
  content.updatedAt = new Date().toISOString();
  await atomicWrite(db);
  return findings;
}

// Comments repository
export async function addComment(contentId, comment) {
  const db = await readDb();
  const content = (db.contents || []).find((c) => c.id === contentId);
  if (!content) return null;
  content.comments = content.comments || [];
  content.comments.push(comment);
  content.updatedAt = new Date().toISOString();
  await atomicWrite(db);
  return comment;
}

// Audit log repository
export async function addAuditLog(entry) {
  const db = await readDb();
  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.unshift(auditEntry);

  // If associated with a content item, also push to content.activityLog
  if (entry.contentId) {
    const content = (db.contents || []).find((c) => c.id === entry.contentId);
    if (content) {
      content.activityLog = content.activityLog || [];
      content.activityLog.push({
        id: `act-${Date.now()}`,
        date: auditEntry.timestamp,
        user: entry.user || 'System',
        action: entry.action || entry.details || 'Activity logged',
      });
    }
  }

  await atomicWrite(db);
  return auditEntry;
}

export async function getAuditLogs(filter = {}) {
  const db = await readDb();
  let logs = db.auditLogs || [];
  if (filter.contentId) {
    logs = logs.filter((l) => l.contentId === filter.contentId);
  }
  return logs;
}

// Settings repository
export async function getSettings() {
  const db = await readDb();
  return db.settings || {};
}

export async function updateSettings(newSettings) {
  const db = await readDb();
  db.settings = { ...db.settings, ...newSettings };
  await atomicWrite(db);
  return db.settings;
}

// Dropped AI findings tracking
export async function recordDroppedAiFindings(count = 1) {
  const db = await readDb();
  db.droppedAiFindingsCount = (db.droppedAiFindingsCount || 0) + count;
  await atomicWrite(db);
  return db.droppedAiFindingsCount;
}

export async function getDroppedAiFindingsCount() {
  const db = await readDb();
  return db.droppedAiFindingsCount || 0;
}

// AI Caching
export async function getAIFindingsCache(key) {
  const db = await readDb();
  return (db.aiCache && db.aiCache[key]) || null;
}

export async function setAIFindingsCache(key, findings) {
  const db = await readDb();
  db.aiCache = db.aiCache || {};
  db.aiCache[key] = {
    cachedAt: new Date().toISOString(),
    findings,
  };
  await atomicWrite(db);
}
