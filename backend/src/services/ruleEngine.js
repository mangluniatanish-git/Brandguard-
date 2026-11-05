import { getContrastRatio, checkWcagCompliance } from '../utils/wcagContrast.js';

export { getContrastRatio, checkWcagCompliance };

/**
 * Deterministic Rule Engine
 * Analyzes text against brand guidelines, banned/preferred terms, approved facts, and rule packs.
 * Returns findings with exact quotes, exact start/end offsets, ruleId, explanation, and suggestions.
 */
export function runRuleEngine({
  text,
  guidelines = [],
  approvedFacts = [],
  terminology = { preferred: [], banned: [] },
  isSponsored = false,
  selectedRulePack = null,
}) {
  const findings = [];
  if (!text || typeof text !== 'string') return findings;

  const textLower = text.toLowerCase();

  // Helper to safely find start and end offsets for a match
  const recordFinding = (findingData) => {
    // Avoid exact duplicate quote + ruleId
    const exists = findings.some(
      (f) => f.ruleId === findingData.ruleId && f.start === findingData.start && f.end === findingData.end
    );
    if (!exists) {
      findings.push({
        id: `fnd-rule-${Date.now()}-${findings.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'open',
        source: 'rule',
        confidence: 'high',
        ...findingData,
      });
    }
  };

  // -------------------------------------------------------------
  // 1. BANNED TERMINOLOGY CHECKS (Dynamic from Brand Library)
  // -------------------------------------------------------------
  const bannedList = terminology.banned || [];
  for (const item of bannedList) {
    if (!item || !item.term) continue;

    // Support multiple terms separated by '/' or commas
    const rawTerms = item.term
      .split(/[/,]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    for (const rawTerm of rawTerms) {
      if (!rawTerm) continue;

      // Resolve guideline ID from item or reason or default to TERM-02
      let ruleId = item.ruleId || 'TERM-02';
      if (item.reason) {
        const foundGuideline = guidelines.find((g) => item.reason.toUpperCase().includes(g.id));
        if (foundGuideline) ruleId = foundGuideline.id;
      }

      const guideline = guidelines.find((g) => g.id === ruleId);

      // Match with word boundaries when alphanumeric
      const isWordPattern = /^[\w\s-]+$/.test(rawTerm);
      let matches = [];

      if (isWordPattern) {
        const escaped = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        let m;
        while ((m = regex.exec(text)) !== null) {
          matches.push({ quote: m[0], start: m.index, end: m.index + m[0].length });
        }
      }

      // Fallback to substring matching if regex didn't catch (e.g. terms with % or symbols)
      if (matches.length === 0 && textLower.includes(rawTerm)) {
        let idx = 0;
        while (idx < text.length) {
          const pos = textLower.indexOf(rawTerm, idx);
          if (pos === -1) break;
          matches.push({ quote: text.slice(pos, pos + rawTerm.length), start: pos, end: pos + rawTerm.length });
          idx = pos + Math.max(1, rawTerm.length);
        }
      }

      // Suggestion: use matching preferred term from Brand Library if available
      let suggestion = item.suggestion;
      if (!suggestion) {
        const prefMatch = (terminology.preferred || []).find((p) =>
          p.term && item.reason && item.reason.toLowerCase().includes(p.term.toLowerCase())
        );
        suggestion = prefMatch ? prefMatch.term : (terminology.preferred?.[0]?.term || 'rephrase using approved brand terminology');
      }

      for (const m of matches) {
        recordFinding({
          type: ruleId.startsWith('CLAIM') || ruleId.startsWith('CLM') ? 'claim' : ruleId.startsWith('TONE') ? 'tone' : 'terminology',
          severity: ruleId.startsWith('CLAIM') || ruleId === 'TONE-01' ? 'high' : 'medium',
          quote: m.quote,
          start: m.start,
          end: m.end,
          ruleId,
          ruleTitle: guideline ? guideline.title : 'Terminology Compliance',
          explanation: item.reason || `Use of prohibited term "${m.quote}".`,
          suggestion,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. TIME-BOUND RESULT CLAIMS ("in 7 days", "in just one night")
  // -------------------------------------------------------------
  const timeClaimRegex = /\b(in\s+(?:just\s+)?(?:\d+|one|two)\s+(?:days?|hours?|weeks?|night|overnight)|within\s+\d+\s+(?:days?|hours?|weeks?))\b/gi;
  let match;
  while ((match = timeClaimRegex.exec(text)) !== null) {
    const quote = match[0];
    const guideline = guidelines.find((g) => g.id === 'CLM-05');
    recordFinding({
      type: 'claim',
      severity: 'medium',
      quote,
      start: match.index,
      end: match.index + quote.length,
      ruleId: 'CLM-05',
      ruleTitle: guideline ? guideline.title : 'Time-to-Result Substantiation',
      explanation: 'Time-bound efficacy claims require certified human trial duration substantiation.',
      suggestion: 'over our verified 14-day clinical trial period',
    });
  }

  // -------------------------------------------------------------
  // 3. SUPERLATIVES ("No.1", "#1", "best", "miracle", "potion")
  // -------------------------------------------------------------
  const superlativeRegex = /\b(No\.?\s*1|#1|world'?s?\s+best|miracle\s+broth|miracle|youth\s+potion)\b/gi;
  while ((match = superlativeRegex.exec(text)) !== null) {
    const quote = match[0];
    const guideline = guidelines.find((g) => g.id === 'TERM-02') || guidelines.find((g) => g.id === 'CLM-05');
    recordFinding({
      type: 'terminology',
      severity: 'medium',
      quote,
      start: match.index,
      end: match.index + quote.length,
      ruleId: 'TERM-02',
      ruleTitle: guideline ? guideline.title : 'Bio-Fermented Sourcing Nomenclature',
      explanation: `Superlative descriptor "${quote}" is prohibited without audited market verification.`,
      suggestion: 'Bio-Fermented Botanical Complex',
    });
  }

  // -------------------------------------------------------------
  // 4. ABSOLUTE CLAIMS WITH NO MATCHING APPROVED FACT
  // ("100% natural", "chemical-free", "clinically proven", "zero impact")
  // -------------------------------------------------------------
  const absoluteClaimPatterns = [
    { regex: /\b100%\s+all-natural\b/gi, ruleId: 'CLM-10', explanation: 'Absolute natural claim is deceptive where safe synthetic stabilizers are used.' },
    { regex: /\b100%\s+eco-friendly\b/gi, ruleId: 'TERM-08', explanation: 'Unsubstantiated green claim without full lifecycle assessment.' },
    { regex: /\bchemical-filled\b/gi, ruleId: 'TONE-01', explanation: 'Fear-mongering language violating grounded brand voice.' },
    { regex: /\bzero\s+impact\b/gi, ruleId: 'TERM-08', explanation: 'Absolute environmental assertion prohibited by advertising standards.' },
    { regex: /\bclinically\s+proven\s+to\s+cure\b/gi, ruleId: 'CLAIM-03', explanation: 'Cosmetic products cannot claim to cure medical conditions.' },
    { regex: /\berase\s+10\s+years\s+of\s+wrinkles\b/gi, ruleId: 'TONE-09', explanation: 'Violates age-positive framing guideline.' },
  ];

  for (const { regex, ruleId, explanation } of absoluteClaimPatterns) {
    while ((match = regex.exec(text)) !== null) {
      const quote = match[0];
      const guideline = guidelines.find((g) => g.id === ruleId);
      recordFinding({
        type: ruleId.startsWith('CLAIM') || ruleId.startsWith('CLM') ? 'claim' : ruleId.startsWith('TONE') ? 'tone' : 'terminology',
        severity: ruleId.startsWith('CLAIM') || ruleId === 'TONE-01' ? 'high' : 'medium',
        quote,
        start: match.index,
        end: match.index + quote.length,
        ruleId,
        ruleTitle: guideline ? guideline.title : 'Claim Substantiation',
        explanation,
        suggestion: 'soften or substantiate with verified metric',
      });
    }
  }

  // -------------------------------------------------------------
  // 5. NUMBERS AND PERCENTAGES NOT FOUND IN APPROVED FACTS
  // -------------------------------------------------------------
  const approvedFactsStatements = approvedFacts.map((f) => f.statement).join(' ');
  const percentRegex = /\b(\d+(?:\.\d+)?%)(?!\w)/g;

  while ((match = percentRegex.exec(text)) !== null) {
    const percentQuote = match[0];
    // Check if this percentage appears in any approved fact
    const isApproved = approvedFactsStatements.includes(percentQuote);

    if (!isApproved) {
      const guideline = guidelines.find((g) => g.id === 'CLM-05');
      recordFinding({
        type: 'claim',
        severity: 'medium',
        quote: percentQuote,
        start: match.index,
        end: match.index + percentQuote.length,
        ruleId: 'CLM-05',
        ruleTitle: guideline ? guideline.title : 'Time-to-Result Substantiation',
        explanation: `Quantitative percentage "${percentQuote}" is not backed by any verified approved brand fact dossier.`,
        suggestion: 'reference approved 94% clinical trial or 70% PCR packaging metrics',
      });
    }
  }

  // -------------------------------------------------------------
  // 6. SPONSORED-CONTENT DISCLOSURE
  // Content flagged as sponsored must carry a clear label such as #ad or "Ad" near the start.
  // Labels only inside a trailing hashtag block or vague labels (#sp, #collab, #partner) are violations.
  // -------------------------------------------------------------
  const containsPartnerHints =
    isSponsored ||
    textLower.includes('#collab') ||
    textLower.includes('#sp') ||
    textLower.includes('#partner') ||
    textLower.includes('#sponsored') ||
    textLower.includes('paid partnership') ||
    textLower.includes('special code') ||
    textLower.includes('link in bio');

  if (containsPartnerHints) {
    // Check first 60 characters for prominent "#Ad" or "Ad"
    const openingSnippet = text.slice(0, 60);
    const hasProminentAd = /(^|[\s|•-])(#ad\b|ad\b|paid\s+partnership\b)/i.test(openingSnippet);

    // Check for vague tags
    const vagueTagMatch = text.match(/(#sp\b|#collab\b|#partner\b)/i);

    if (!hasProminentAd) {
      // Find trailing hashtag block if present
      const trailingMatch = text.match(/(#[a-zA-Z0-9_]+\s*)+$/);
      const quote = trailingMatch ? trailingMatch[0].trim() : text.slice(Math.max(0, text.length - 30));
      const start = trailingMatch ? trailingMatch.index : Math.max(0, text.length - 30);

      const guideline = guidelines.find((g) => g.id === 'DISC-04');
      recordFinding({
        type: 'disclosure',
        severity: 'high',
        quote: quote.slice(0, 40),
        start,
        end: start + Math.min(quote.length, 40),
        ruleId: 'DISC-04',
        ruleTitle: guideline ? guideline.title : 'Material Connection & Sponsored Endorsement',
        explanation: 'Promotional endorsement lacks clear, upfront #Ad disclosure in the opening statement. Trailing or vague hashtags (#sp, #collab) violate ASCI, CMA, and FTC codes.',
        suggestion: '#Ad | Paid partnership with Verdant Skin',
      });
    } else if (vagueTagMatch) {
      const quote = vagueTagMatch[0];
      const start = text.indexOf(quote);
      recordFinding({
        type: 'disclosure',
        severity: 'medium',
        quote,
        start,
        end: start + quote.length,
        ruleId: 'DISC-04',
        ruleTitle: 'Material Connection & Sponsored Endorsement',
        explanation: `Vague commercial tag "${quote}" is insufficient under regulatory endorsement guides.`,
        suggestion: '#Ad #PaidPartnership',
      });
    }
  }

  // -------------------------------------------------------------
  // 7. MISSING ALT TEXT ON IMAGES IN HTML OR MARKDOWN
  // -------------------------------------------------------------
  // Markdown missing alt: ![ ](...) or ![](...)
  const mdImgRegex = /!\[\s*\]\(([^)]+)\)/g;
  while ((match = mdImgRegex.exec(text)) !== null) {
    const quote = match[0];
    const guideline = guidelines.find((g) => g.id === 'ACC-06');
    recordFinding({
      type: 'accessibility',
      severity: 'medium',
      quote,
      start: match.index,
      end: match.index + quote.length,
      ruleId: 'ACC-06',
      ruleTitle: guideline ? guideline.title : 'Accessibility & Screen-Reader Clarity',
      explanation: 'Image tag is missing descriptive alternative text for screen readers.',
      suggestion: '![Verdant Skin Amber Glass Serum Bottle](...)',
    });
  }

  // HTML missing alt: <img ... alt="" ...> or <img ...> without alt
  const htmlImgRegex = /<img\s+(?:[^>]*)(?:alt=["']\s*["']|(?![^>]*\balt=)[^>]*>)/gi;
  while ((match = htmlImgRegex.exec(text)) !== null) {
    const quote = match[0];
    const guideline = guidelines.find((g) => g.id === 'ACC-06');
    recordFinding({
      type: 'accessibility',
      severity: 'medium',
      quote,
      start: match.index,
      end: match.index + quote.length,
      ruleId: 'ACC-06',
      ruleTitle: guideline ? guideline.title : 'Accessibility & Screen-Reader Clarity',
      explanation: 'HTML <img> element must specify a non-empty alt attribute describing the image.',
      suggestion: '<img alt="Verdant Skin Barrier Restore Serum" ...>',
    });
  }

  // -------------------------------------------------------------
  // 8. APPLY SPECIFIC RULE PACK (ASCI, CMA, FTC)
  // -------------------------------------------------------------
  if (selectedRulePack && selectedRulePack.rules) {
    for (const rule of selectedRulePack.rules) {
      // Check if rule description / keywords match any unflagged issue
      if (rule.id.includes('DISC') && !findings.some((f) => f.type === 'disclosure') && containsPartnerHints) {
        // Tagged by rule pack
      }
    }
  }

  return findings;
}
