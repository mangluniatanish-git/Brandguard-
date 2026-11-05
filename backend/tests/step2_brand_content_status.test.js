import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { runSeed } from '../src/scripts/seed.js';

let creatorToken = '';
let reviewerToken = '';
let adminToken = '';
let managerToken = '';

beforeAll(async () => {
  await runSeed();

  const cRes = await request(app).post('/api/auth/demo-login').send({ role: 'creator' });
  creatorToken = cRes.body.token;

  const rRes = await request(app).post('/api/auth/demo-login').send({ role: 'reviewer' });
  reviewerToken = rRes.body.token;

  const aRes = await request(app).post('/api/auth/demo-login').send({ role: 'admin' });
  adminToken = aRes.body.token;

  const mRes = await request(app).post('/api/auth/demo-login').send({ role: 'manager' });
  managerToken = mRes.body.token;
});

describe('Step 2: Brand Library Management', () => {
  it('GET /api/brand returns complete brand dataset', async () => {
    const res = await request(app)
      .get('/api/brand')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.info.name).toBe('Verdant Skin');
    expect(res.body.guidelines.length).toBeGreaterThanOrEqual(10);
    expect(res.body.approvedFacts.length).toBeGreaterThanOrEqual(8);
    expect(res.body.terminology.preferred.length).toBeGreaterThanOrEqual(5);
  });

  it('PUT /api/brand/guidelines allows admin to add/update clause', async () => {
    const newClause = {
      id: 'TONE-TEST-01',
      title: 'Test Clause',
      category: 'Tone & Voice',
      text: 'Always be kind and truthful.',
    };

    const res = await request(app)
      .put('/api/brand/guidelines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newClause);

    expect(res.status).toBe(200);
    const added = res.body.find((g) => g.id === 'TONE-TEST-01');
    expect(added).toBeDefined();
    expect(added.title).toBe('Test Clause');
  });

  it('blocks non-admin from modifying brand guidelines', async () => {
    const res = await request(app)
      .put('/api/brand/guidelines')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ id: 'X', title: 'X', text: 'X' });

    expect(res.status).toBe(403);
  });

  it('PUT /api/brand/terminology allows admin to add preferred term', async () => {
    const res = await request(app)
      .put('/api/brand/terminology')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'preferred',
        item: { term: 'Bio-Identical Squalane', note: '100% plant sourced' },
        action: 'add',
      });

    expect(res.status).toBe(200);
    expect(res.body.preferred.some((t) => t.term === 'Bio-Identical Squalane')).toBe(true);
  });
});

describe('Step 2: Content Creation & Versioning', () => {
  let createdContentId = '';

  it('POST /api/content creates new content with Version 1 and Draft status', async () => {
    const res = await request(app)
      .post('/api/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: 'New Winter Barrier Cream Copy',
        channel: 'Instagram',
        rulePack: 'India ASCI/CCPA',
        text: 'Introducing our soothing botanical barrier cream with cold pressed oils.',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('Draft');
    expect(res.body.creator).toBe('Chloe Rivera');
    expect(res.body.versions).toHaveLength(1);
    expect(res.body.versions[0].versionNumber).toBe(1);

    createdContentId = res.body.id;
  });

  it('PUT /api/content/:id creates Version 2 snapshot upon editing', async () => {
    const res = await request(app)
      .put(`/api/content/${createdContentId}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        text: 'Introducing our soothing botanical barrier cream with 100% cold pressed rosehip oil.',
        summary: 'Added rosehip oil ingredient reference',
      });

    expect(res.status).toBe(200);
    expect(res.body.versions).toHaveLength(2);
    expect(res.body.versions[1].versionNumber).toBe(2);
    expect(res.body.versions[1].summary).toBe('Added rosehip oil ingredient reference');
    expect(res.body.text).toContain('rosehip oil');
  });

  it('GET /api/content/:id returns content with versions and findings', async () => {
    const res = await request(app)
      .get(`/api/content/${createdContentId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Winter Barrier Cream Copy');
    expect(res.body.versions).toHaveLength(2);
  });
});

describe('Step 2: Comments & Activity Log', () => {
  it('POST /api/content/:id/comments adds reviewer comment', async () => {
    const res = await request(app)
      .post('/api/content/cnt-01/comments')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        text: 'Please review the claims regarding acne before final sign-off.',
      });

    expect(res.status).toBe(201);
    expect(res.body.author).toBe('Reese Walker');
    expect(res.body.role).toBe('reviewer');

    // Verify comment appears in content item
    const contentRes = await request(app)
      .get('/api/content/cnt-01')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(contentRes.body.comments.some((c) => c.text.includes('claims regarding acne'))).toBe(true);
  });

  it('GET /api/activity returns audit logs', async () => {
    const res = await request(app)
      .get('/api/activity?contentId=cnt-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('Step 2: Findings Decisions (Accept, Edit, Dismiss)', () => {
  it('rejects dismissing finding without reason', async () => {
    const res = await request(app)
      .patch('/api/findings/fnd-101')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        action: 'dismissed',
        dismissalReason: '   ',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('dismisses finding when provided a valid reason', async () => {
    const res = await request(app)
      .patch('/api/findings/fnd-101')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        action: 'dismissed',
        dismissalReason: 'Approved as deliberate colloquial contrast by legal.',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
    expect(res.body.dismissalReason).toBe('Approved as deliberate colloquial contrast by legal.');
  });

  it('edits finding, stores final text, and creates a new content version', async () => {
    const beforeContent = await request(app)
      .get('/api/content/cnt-01')
      .set('Authorization', `Bearer ${creatorToken}`);
    const originalText = beforeContent.body.text;

    const res = await request(app)
      .patch('/api/findings/fnd-102')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        action: 'edited',
        editedText: 'Bio-Fermented Botanical Complex',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('edited');
    expect(res.body.finalText).toBe('Bio-Fermented Botanical Complex');

    // Confirm new version is created and original version 1 text is preserved
    const afterContent = await request(app)
      .get('/api/content/cnt-01')
      .set('Authorization', `Bearer ${creatorToken}`);
    expect(afterContent.body.versions.length).toBeGreaterThan(1);
    expect(afterContent.body.versions[0].text).toBe(originalText);
    expect(afterContent.body.text).toContain('Bio-Fermented Botanical Complex');
  });
});

describe('Step 2: Status Machine & Approval Guardrails', () => {
  it('creator can NEVER approve their own content', async () => {
    const res = await request(app)
      .patch('/api/content/cnt-01/status')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        status: 'Approved',
        comment: 'I approve my own post!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('requires comment when requesting changes', async () => {
    const res = await request(app)
      .patch('/api/content/cnt-01/status')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        status: 'Changes Requested',
        comment: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Comment Required');
  });

  it('blocks approval while high-severity findings are still open', async () => {
    // cnt-01 currently has open high-severity finding fnd-103 ("cure cystic acne")
    const res = await request(app)
      .patch('/api/content/cnt-01/status')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        status: 'Approved',
        comment: 'Looks fine',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Approval Blocked');
    expect(res.body.openHighFindings).toBeDefined();
    expect(res.body.openHighFindings.length).toBeGreaterThan(0);
  });

  it('approves content once all high-severity findings are resolved', async () => {
    // Dismiss or accept remaining open high-severity findings on cnt-01 (fnd-103)
    await request(app)
      .patch('/api/findings/fnd-103')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        action: 'dismissed',
        dismissalReason: 'Substantiated by derma trial study #8891.',
      });

    // Now reviewer approves
    const res = await request(app)
      .patch('/api/content/cnt-01/status')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        status: 'Approved',
        comment: 'All high-severity claims resolved. Cleared for publication.',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });
});
