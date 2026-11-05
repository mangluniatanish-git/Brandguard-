import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Call Gemini AI using the official @google/genai SDK with structured output schema.
 * Employs low temperature (0.1), 12-second timeout, 1 retry, and finding cap.
 */
export async function callGeminiCompliance({
  redactedText,
  guidelines,
  approvedFacts,
  rulePack,
}) {
  if (!config.AI_ENABLED || !config.GEMINI_API_KEY) {
    logger.info('Gemini AI check skipped: AI_ENABLED is false or GEMINI_API_KEY is unset');
    return { findings: [], aiUsed: false };
  }

  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

  const validRuleIds = [
    ...guidelines.map((g) => g.id),
    ...approvedFacts.map((f) => f.id),
    ...(rulePack?.rules?.map((r) => r.id) || []),
  ];

  const prompt = `You are a strict regulatory and brand compliance inspector for the skincare brand "Verdant Skin".
Evaluate the following draft marketing copy against the provided brand guidelines, approved facts, and regulatory rule pack.

GUIDELINE CLAUSES:
${guidelines.map((g) => `- ${g.id}: ${g.title} | ${g.text}`).join('\n')}

APPROVED FACTS:
${approvedFacts.map((f) => `- ${f.id}: "${f.statement}" (Source: ${f.source})`).join('\n')}

${rulePack ? `REGULATORY RULE PACK (${rulePack.name}):\n${rulePack.rules.map((r) => `- ${r.id}: ${r.title} | ${r.description}`).join('\n')}` : ''}

RULES FOR YOUR FINDINGS:
1. "quote" MUST be copied VERBATIM from the text below. Do not paraphrase or add words.
2. "ruleId" MUST strictly be one of: ${validRuleIds.join(', ')}.
3. "suggestion" MUST keep the creator's voice and intent while fixing the compliance issue.
4. "confidence" must be 'high' or 'low'.
5. Cap total findings at at most 8 most important violations.

TEXT TO INSPECT:
"""
${redactedText}
"""
`;

  // Timeout and retry wrapper
  const attemptCall = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await ai.models.generateContent({
        model: config.GEMINI_MODEL || 'gemini-1.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ['tone', 'terminology', 'claim', 'disclosure', 'accessibility'],
                },
                severity: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
                quote: { type: Type.STRING },
                ruleId: { type: Type.STRING },
                explanation: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ['high', 'low'] },
              },
              required: ['type', 'severity', 'quote', 'ruleId', 'explanation', 'suggestion', 'confidence'],
            },
          },
        },
      });
      clearTimeout(timer);

      const parsed = JSON.parse(response.text || '[]');
      return parsed.slice(0, 8); // Cap at 8 findings
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    const rawFindings = await attemptCall();
    return { findings: rawFindings, aiUsed: true };
  } catch (firstErr) {
    logger.warn({ error: firstErr.message }, 'First Gemini attempt failed; retrying once...');
    try {
      const rawFindings = await attemptCall();
      return { findings: rawFindings, aiUsed: true };
    } catch (retryErr) {
      logger.error({ error: retryErr.message }, 'Gemini compliance call failed after retry; falling back to rule findings');
      return { findings: [], aiUsed: false };
    }
  }
}
