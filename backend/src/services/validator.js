import { logger } from '../utils/logger.js';

/**
 * Validates raw AI findings against the original text, guidelines, and rule packs.
 * Drops fabricated quotes, non-existent rule IDs, and merges overlaps with deterministic rule findings.
 */
export function validateAndMergeFindings({
  originalText,
  ruleFindings = [],
  aiFindings = [],
  guidelines = [],
  approvedFacts = [],
  rulePack = null,
}) {
  let droppedCount = 0;
  const validRuleIds = new Set([
    ...guidelines.map((g) => g.id),
    ...approvedFacts.map((f) => f.id),
    ...(rulePack?.rules?.map((r) => r.id) || []),
  ]);

  const validatedAiFindings = [];

  for (const raw of aiFindings) {
    if (!raw.quote || typeof raw.quote !== 'string') {
      droppedCount++;
      continue;
    }

    // 1. Verbatim quote verification in the original content text
    const quoteIndex = originalText.indexOf(raw.quote);
    if (quoteIndex === -1) {
      logger.warn({ quote: raw.quote }, 'Dropped AI finding: quote not found verbatim in original text');
      droppedCount++;
      continue;
    }

    // 2. Rule ID verification
    if (!raw.ruleId || !validRuleIds.has(raw.ruleId)) {
      logger.warn({ ruleId: raw.ruleId }, 'Dropped AI finding: ruleId does not exist in active guidelines or rule packs');
      droppedCount++;
      continue;
    }

    // Lookup rule title
    const guideline =
      guidelines.find((g) => g.id === raw.ruleId) ||
      rulePack?.rules?.find((r) => r.id === raw.ruleId) ||
      approvedFacts.find((f) => f.id === raw.ruleId);

    const ruleTitle = guideline?.title || guideline?.statement || raw.ruleTitle || 'Brand Guideline Rule';

    const validated = {
      id: `fnd-ai-${Date.now()}-${validatedAiFindings.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      type: raw.type || 'claim',
      severity: raw.severity || 'medium',
      quote: raw.quote,
      start: quoteIndex,
      end: quoteIndex + raw.quote.length,
      ruleId: raw.ruleId,
      ruleTitle,
      explanation: raw.explanation || 'Flagged by compliance model.',
      suggestion: raw.suggestion || 'Review phrasing with brand compliance team.',
      confidence: raw.confidence || 'high',
      needsHumanCheck: raw.confidence === 'low',
      source: 'ai',
      status: 'open',
    };

    validatedAiFindings.push(validated);
  }

  // 3. Merge and deduplicate with deterministic rule findings
  const merged = [...ruleFindings];

  for (const aiFinding of validatedAiFindings) {
    // Check if an existing rule finding overlaps or has the exact same quote & rule
    const isOverlapping = merged.some(
      (rf) =>
        (rf.ruleId === aiFinding.ruleId && rf.quote.toLowerCase() === aiFinding.quote.toLowerCase()) ||
        (aiFinding.start < rf.end && aiFinding.end > rf.start)
    );

    if (!isOverlapping) {
      merged.push(aiFinding);
    }
  }

  // Sort findings by character offset start position
  merged.sort((a, b) => a.start - b.start);

  return {
    mergedFindings: merged,
    droppedCount,
  };
}
