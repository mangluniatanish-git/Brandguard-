import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { runSeed } from '../src/scripts/seed.js';
import { getUserById, getUserByRole, getDb } from '../src/repo/dbRepo.js';

beforeAll(async () => {
  await runSeed();
});

describe('Database and Seed Verification', () => {
  it('loads seeded brand, users, and content from the repository', async () => {
    const db = await getDb();
    expect(db.users).toHaveLength(4);
    expect(db.brand.guidelines).toHaveLength(10);
    expect(db.brand.approvedFacts).toHaveLength(8);
    expect(db.contents).toHaveLength(3);
  });

  it('retrieves user by role and user by ID', async () => {
    const creator = await getUserByRole('creator');
    expect(creator).toBeDefined();
    expect(creator.name).toBe('Chloe Rivera');

    const byId = await getUserById(creator.id);
    expect(byId.email).toBe('chloe.rivera@verdantskin.com');
  });
});

describe('Authentication: POST /api/auth/login', () => {
  it('logs in successfully with valid email and password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'chloe.rivera@verdantskin.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('creator');
    expect(res.body.user.passwordHash).toBeUndefined(); // Never leak passwordHash
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'chloe.rivera@verdantskin.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@verdantskin.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});

describe('Authentication: POST /api/auth/demo-login', () => {
  const roles = ['creator', 'reviewer', 'manager', 'admin'];

  for (const role of roles) {
    it(`logs in demo user for role: ${role}`, async () => {
      const res = await request(app)
        .post('/api/auth/demo-login')
        .send({ role });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe(role);
    });
  }

  it('returns 404 for non-existent demo role', async () => {
    const res = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'supervillain' });

    expect(res.status).toBe(404);
  });
});

describe('Authentication: GET /api/auth/me', () => {
  it('returns profile when provided a valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'admin' });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.name).toBe('Aria Thorne');
    expect(meRes.body.role).toBe('admin');
  });

  it('rejects request without token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.signature');
    expect(res.status).toBe(401);
  });
});
