import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { runSeed } from '../src/scripts/seed.js';
import { redactText } from '../src/services/redactionService.js';
import { runRuleEngine } from '../src/services/ruleEngine.js';
import { validateAndMergeFindings } from '../src/services/validator.js';
import { getContrastRatio, checkWcagCompliance } from '../src/utils/wcagContrast.js';

let adminToken = '';
let creatorToken = '';
let managerToken = '';

beforeAll(async () => {
  await runSeed();

  const aRes = await request(app).post('/api/auth/demo-login').send({ role: 'admin' });
  adminToken = aRes.body.token;

  const cRes = await request(app).post('/api/auth/demo-login').send({ role: 'creator' });
  creatorToken = cRes.body.token;

  const mRes = await request(app).post('/api/auth/demo-login').send({ role: 'manager' });
  managerToken = mRes.body.token;
});

describe('Step 3: Redaction & Offset Preservation', () => {
  it('masks email addresses with same length X characters preserving offsets', () => {
    const input = 'Contact support@verdantskin.com for assistance.';
    const output = redactText(input);

    expect(output).toBe('Contact XXXXXXXXXXXXXXXXXXXXXXX for assistance.');
    expect(output.length).toBe(input.length);
    expect(output.indexOf('for assistance.')).toBe(input.indexOf('for assistance.'));
  });

  it('masks phone numbers and ID-like numbers with same length X characters', () => {
    const input = 'Call +1-800-555-0199 or employee ID 9876543210 today.';
    const output = redactText(input);

    expect(output.length).toBe(input.length);
    expect(output.includes('+1-800-555-0199')).toBe(false);
    expect(output.includes('9876543210')).toBe(false);
    expect(output.indexOf('today.')).toBe(input.indexOf('today.'));
  });
});

describe('Step 3: WCAG Contrast Ratio Utility', () => {
  it('correctly calculates contrast ratio and verifies WCAG AA compliance', () => {
    // Pure Black on Pure White -> 21:1
    const maxRatio = getContrastRatio('#000000', '#ffffff');
    expect(maxRatio).toBe(21);

    // Verdant Dark Forest #064e3b on White #FFFFFF passes normal text AAA and AA
    const forestOnWhite = checkWcagCompliance('#064e3b', '#ffffff');
    expect(forestOnWhite.ratio).toBeGreaterThan(4.5);
    expect(forestOnWhite.passesNormalTextAA).toBe(true);

    // Verdant Accent #059669 on White #FFFFFF passes Large Text AA
    const emeraldOnWhite = checkWcagCompliance('#059669', '#ffffff');
    expect(emeraldOnWhite.passesLargeTextAA).toBe(true);

    // Light grey on White fails AA
    const lowContrast = checkWcagCompliance('#cccccc', '#ffffff');
    expect(lowContrast.passesNormalTextAA).toBe(false);
  });
});

describe('Step 3: Deterministic Rule Engine', () => {
  const guidelines = [
    { id: 'TONE-01', title: 'Empathetic Voice', text: 'No fear-mongering terms like chemical-filled or toxic-free.' },
    { id: 'CLAIM-03', title: 'Cure Claims', text: 'Cannot claim to cure medical conditions.' },
    { id: 'CLM-05', title: 'Time Claims', text: 'Time claims require clinical trials.' },
    { id: 'TERM-08', title: 'Green Claims', text: 'No vague greenwashing like 100% eco-friendly.' },
    { id: 'DISC-04', title: 'Disclosures', text: 'Prominent #Ad required.' },
    { id: 'ACC-06', title: 'Accessibility', text: 'Images must have alt text.' },
  ];

  const approvedFacts = [
    { id: 'F-01', statement: '94% of clinical trial participants reported improved barrier hydration.' },
  ];

  const terminology = {
    preferred: [{ term: 'Bio-Fermented Botanical Complex' }],
    banned: [{ term: 'chemical-filled', reason: 'Fear-mongering (TONE-01)' }],
  };

  it('flags banned terms with exact offsets and quote', () => {
    const text = 'Say no to chemical-filled copy.';
    const findings = runRuleEngine({ text, guidelines, approvedFacts, terminology });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    const bannedFnd = findings.find((f) => f.quote === 'chemical-filled');
    expect(bannedFnd).toBeDefined();
    expect(bannedFnd.start).toBe(10);
    expect(bannedFnd.end).toBe(25);
    expect(bannedFnd.ruleId).toBe('TONE-01');
  });

  it('flags time-bound result claims', () => {
    const text = 'See radiant results in 7 days guaranteed.';
    const findings = runRuleEngine({ text, guidelines, approvedFacts, terminology });

    const timeFnd = findings.find((f) => f.ruleId === 'CLM-05');
    expect(timeFnd).toBeDefined();
    expect(timeFnd.quote).toBe('in 7 days');
  });

  it('exempts approved percentages but flags unapproved percentages', () => {
    // 94% is in approvedFacts; 85% is not
    const text = '94% reported barrier improvement while 85% felt softness.';
    const findings = runRuleEngine({ text, guidelines, approvedFacts, terminology });

    const unapproved85 = findings.find((f) => f.quote === '85%');
    expect(unapproved85).toBeDefined();

    const approved94 = findings.find((f) => f.quote === '94%');
    expect(approved94).toBeUndefined(); // correctly exempted
  });

  it('flags missing alt text in markdown image syntax', () => {
    const text = 'Check this formula: ![](amber_jar.jpg)';
    const findings = runRuleEngine({ text, guidelines, approvedFacts, terminology });

    const accFnd = findings.find((f) => f.ruleId === 'ACC-06');
    expect(accFnd).toBeDefined();
    expect(accFnd.quote).toBe('![](amber_jar.jpg)');
  });
});

describe('Step 4: Validator Safeguards', () => {
  const guidelines = [{ id: 'CLAIM-03', title: 'Cure Claims' }];
  const originalText = 'Verdant Skin is designed to calm redness and nourish the skin barrier.';

  it('drops AI findings whose quote is NOT found verbatim in original text', () => {
    const fakeAiFinding = {
      type: 'claim',
      quote: 'this quote was completely made up by the LLM',
      ruleId: 'CLAIM-03',
      explanation: 'Fake finding',
      suggestion: 'Test',
      confidence: 'high',
    };

    const result = validateAndMergeFindings({
      originalText,
      ruleFindings: [],
      aiFindings: [fakeAiFinding],
      guidelines,
    });

    expect(result.droppedCount).toBe(1);
    expect(result.mergedFindings).toHaveLength(0);
  });

  it('drops AI findings with fabricated non-existent ruleId', () => {
    const fakeRuleFinding = {
      type: 'claim',
      quote: 'calm redness',
      ruleId: 'NON-EXISTENT-RULE-999',
      explanation: 'Rule does not exist',
      suggestion: 'Test',
      confidence: 'high',
    };

    const result = validateAndMergeFindings({
      originalText,
      ruleFindings: [],
      aiFindings: [fakeRuleFinding],
      guidelines,
    });

    expect(result.droppedCount).toBe(1);
    expect(result.mergedFindings).toHaveLength(0);
  });

  it('marks low-confidence findings with needsHumanCheck: true', () => {
    const lowConfFinding = {
      type: 'tone',
      quote: 'calm redness',
      ruleId: 'CLAIM-03',
      explanation: 'Uncertain borderline claim',
      suggestion: 'Test',
      confidence: 'low',
    };

    const result = validateAndMergeFindings({
      originalText,
      ruleFindings: [],
      aiFindings: [lowConfFinding],
      guidelines,
    });

    expect(result.droppedCount).toBe(0);
    expect(result.mergedFindings).toHaveLength(1);
    expect(result.mergedFindings[0].needsHumanCheck).toBe(true);
  });
});

describe('Step 5: Document Upload Parsing (PDF, DOCX, TXT)', () => {
  it('parses raw text file upload returning text and chars', async () => {
    const rawContent = 'Extracted draft text from marketing campaign.';
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', Buffer.from(rawContent), 'sample.txt');

    expect(res.status).toBe(200);
    expect(res.body.text).toBe(rawContent);
    expect(res.body.chars).toBe(rawContent.length);
  });

  it('extracts real text from PDF fixture and proves different PDF files return different text', async () => {
    const res1 = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/sample1.pdf');

    expect(res1.status).toBe(200);
    expect(res1.body.text).toBe('Verdant Skin Clinical Study Findings');
    expect(res1.body.chars).toBe(res1.body.text.length);

    const res2 = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/sample2.pdf');

    expect(res2.status).toBe(200);
    expect(res2.body.text).toBe('Botanical Barrier Restore Launch Plan');
    expect(res2.body.chars).toBe(res2.body.text.length);

    // Prove different files give different text
    expect(res1.body.text).not.toBe(res2.body.text);
  });

  it('extracts real text from DOCX fixture and proves different DOCX files return different text', async () => {
    const res1 = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/sample1.docx');

    expect(res1.status).toBe(200);
    expect(res1.body.text).toContain('Walking on imported air');
    expect(res1.body.chars).toBe(res1.body.text.length);

    const res2 = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/sample2.docx');

    expect(res2.status).toBe(200);
    expect(res2.body.text).toContain('Apple');
    expect(res2.body.text).toContain('Banana');
    expect(res2.body.chars).toBe(res2.body.text.length);

    // Prove different files give different text
    expect(res1.body.text).not.toBe(res2.body.text);
  });

  it('returns 422 "No readable text (maybe a scanned PDF)" when PDF has no readable text', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/empty.pdf');

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('No readable text (maybe a scanned PDF)');
  });

  it('returns 422 "No readable text (maybe a scanned PDF)" when DOCX has no readable text', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', 'tests/fixtures/empty.docx');

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('No readable text (maybe a scanned PDF)');
  });

  it('rejects unsupported file extensions with 400 error', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .attach('file', Buffer.from('malicious payload'), 'payload.exe');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid file type');
  });
});

describe('Step 5: Review Execution & Insights', () => {
  it('POST /api/content/:id/review executes review pipeline and sets status AI Reviewed', async () => {
    const res = await request(app)
      .post('/api/content/cnt-03/review')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.findings).toBeDefined();
    expect(res.body.content.status).toBe('AI Reviewed');
    expect(res.body.ruleCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/insights returns Recharts metrics and rule hints for manager', async () => {
    const res = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ruleViolations).toBeDefined();
    expect(res.body.issuesByTypeOverTime).toBeDefined();
    expect(res.body.turnaroundMetrics).toBeDefined();
    expect(res.body.validatorStats).toBeDefined();
  });

  it('GET and PUT /api/settings manages AI and redaction flags', async () => {
    const getRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.redactionEnabled).toBeDefined();

    const putRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        aiEnabled: true,
        redactionEnabled: true,
        disclosureText: 'Custom AI Governance Disclosure Notice.',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.disclosureText).toBe('Custom AI Governance Disclosure Notice.');
  });
});
