import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { redactText } from './redactionService.js';
import { runRuleEngine } from './ruleEngine.js';
import { callGeminiCompliance } from './geminiService.js';
import { validateAndMergeFindings } from './validator.js';
import { config } from '../utils/config.js';
import {
  getBrand,
  getSettings,
  saveFindings,
  saveContent,
  recordDroppedAiFindings,
  getAIFindingsCache,
  setAIFindingsCache,
  addAuditLog,
} from '../repo/dbRepo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for loaded rule pack files
const rulePacksCache = {};

export async function loadRulePack(rulePackId) {
  let normalized = 'india';
  if (rulePackId && typeof rulePackId === 'string') {
    const lower = rulePackId.toLowerCase();
    if (lower.includes('uk') || lower.includes('cma')) normalized = 'uk';
    else if (lower.includes('us') || lower.includes('ftc')) normalized = 'us';
    else normalized = 'india';
  }

  if (rulePacksCache[normalized]) return rulePacksCache[normalized];

  const filePath = path.resolve(__dirname, `../rulepacks/${normalized}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    rulePacksCache[normalized] = parsed;
    return parsed;
  } catch (err) {
    return null;
  }
}

function computeContentHash(text, guidelines, rulePackId) {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  hash.update(JSON.stringify(guidelines.map((g) => ({ id: g.id, text: g.text }))));
  hash.update(rulePackId || 'default');
  return hash.digest('hex');
}

/**
 * Execute the 6-stage compliance review pipeline
 */
export async function runReviewPipeline(content, actor = 'System') {
  const originalText = content.text;
  const brandData = await getBrand();
  const settings = await getSettings();

  const guidelines = brandData.guidelines || [];
  const approvedFacts = brandData.approvedFacts || [];
  const terminology = brandData.terminology || { preferred: [], banned: [] };

  const isRedactionEnabled =
    settings.redactionEnabled !== undefined
      ? settings.redactionEnabled
      : config.REDACTION_ENABLED;

  const isAiEnabled =
    settings.aiEnabled !== undefined ? settings.aiEnabled : config.AI_ENABLED;

  // 1. Redaction Stage
  const textForAi = isRedactionEnabled ? redactText(originalText) : originalText;

  // 2. Deterministic Rule Engine Stage (always runs on original text)
  const isSponsored =
    content.channel === 'Influencer / Talent' ||
    content.title.toLowerCase().includes('influencer') ||
    content.title.toLowerCase().includes('sponsored');

  const selectedRulePack = await loadRulePack(content.rulePack);

  const ruleFindings = runRuleEngine({
    text: originalText,
    guidelines,
    approvedFacts,
    terminology,
    isSponsored,
    selectedRulePack,
  });

  // 3. AI Gemini Call with Content Hash Caching
  let aiFindings = [];
  let aiUsed = false;

  if (isAiEnabled) {
    const cacheKey = computeContentHash(originalText, guidelines, content.rulePack);
    const cached = await getAIFindingsCache(cacheKey);

    if (cached) {
      aiFindings = cached.findings;
      aiUsed = true;
    } else {
      const geminiResult = await callGeminiCompliance({
        redactedText: textForAi,
        guidelines,
        approvedFacts,
        rulePack: selectedRulePack,
      });

      aiFindings = geminiResult.findings;
      aiUsed = geminiResult.aiUsed;

      if (aiUsed && aiFindings.length > 0) {
        await setAIFindingsCache(cacheKey, aiFindings);
      }
    }
  }

  // 4. Validator Stage
  const { mergedFindings, droppedCount } = validateAndMergeFindings({
    originalText,
    ruleFindings,
    aiFindings,
    guidelines,
    approvedFacts,
    rulePack: selectedRulePack,
  });

  if (droppedCount > 0) {
    await recordDroppedAiFindings(droppedCount);
  }

  // 5. Save findings and update content status to 'AI Reviewed'
  content.findings = mergedFindings;
  content.status = 'AI Reviewed';
  content.updatedAt = new Date().toISOString();

  content.activityLog = content.activityLog || [];
  content.activityLog.push({
    id: `act-${Date.now()}`,
    date: content.updatedAt,
    user: 'AI Engine (Gemini)',
    action: `Compliance scan complete: generated ${mergedFindings.length} findings (${aiUsed ? 'Rules + AI' : 'Rules Only'})`,
  });

  await saveContent(content);

  await addAuditLog({
    userId: actor.id || 'system',
    user: actor.name || 'System',
    action: 'RUN_REVIEW',
    contentId: content.id,
    details: `Executed review pipeline (${mergedFindings.length} findings, aiUsed=${aiUsed}, dropped=${droppedCount})`,
  });

  return {
    content,
    findings: mergedFindings,
    aiUsed,
    droppedCount,
    ruleCount: ruleFindings.length,
    aiCount: mergedFindings.filter((f) => f.source === 'ai').length,
  };
}
