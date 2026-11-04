import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import supertest from 'supertest';

config({ path: resolve('../../.env'), quiet: true });
const database = process.env.TEST_DATABASE_URL;
if (
  !database ||
  !new URL(database).pathname.endsWith('_test') ||
  database === process.env.DATABASE_URL
) {
  throw new Error(
    'TEST_DATABASE_URL must name a separate database ending in _test. Tests reset that database.',
  );
}
process.env.DATABASE_URL = database;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET =
  'integration-test-secret-with-at-least-32-characters';
process.env.APP_ORIGIN = 'http://localhost:5173';
const password = 'Integration-password-8333';
let instance, db, agents, people, categories, requestId;

before(async () => {
  const pool = new Pool({ connectionString: database });
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await pool.end();
  const { createApp } = await import('../dist/app.js');
  const { DataSource } = await import('typeorm');
  const { User } = await import('../dist/entities.js');
  const { hashPassword } = await import('../dist/password.js');
  instance = await createApp();
  db = instance.app.get(DataSource);
  agents = {};
  people = {};
  for (const [name, role] of [
    ['student', 'STUDENT'],
    ['other', 'STUDENT'],
    ['staff', 'STAFF'],
    ['officer', 'OFFICER'],
    ['replacement', 'OFFICER'],
    ['admin', 'ADMIN'],
  ]) {
    people[name] = await db.manager.save(User, {
      name: `${name} Test`,
      email: `${name}@example.edu`,
      passwordHash: await hashPassword(password),
      role,
      active: true,
    });
    agents[name] = supertest.agent(instance.app.getHttpServer());
    await agents[name]
      .post('/api/auth/login')
      .send({ email: people[name].email, password })
      .expect(200);
  }
  categories = (await agents.student.get('/api/categories').expect(200)).body;
  await writeFile(
    resolve('../../docs/openapi.json'),
    `${JSON.stringify(instance.swagger, null, 2)}\n`,
  );
});

after(async () => {
  if (instance) await instance.close();
});
const payload = (title = 'Leaking pipe in hostel bathroom') => ({
  title,
  description: 'Water is leaking from the pipe under the sink.',
  location: 'Hostel B, room 102',
  categoryId: categories[0].id,
});

test('health probes the database; private routes require login', async () => {
  const guest = supertest(instance.app.getHttpServer());
  assert.equal(
    (await guest.get('/api/health').expect(200)).body.database,
    'connected',
  );
  await guest.get('/api/requests').expect(401);
  await guest.get('/api/users').expect(401);
});

test('registration validates input, prevents privilege injection, and hides hashes', async () => {
  const guest = supertest.agent(instance.app.getHttpServer());
  const input = {
    name: 'New Student',
    email: 'new@example.edu',
    password,
    role: 'STUDENT',
  };
  await guest
    .post('/api/auth/register')
    .send({ ...input, role: 'ADMIN' })
    .expect(400);
  await guest
    .post('/api/auth/register')
    .send({ ...input, role: 'OFFICER' })
    .expect(400);
  await guest
    .post('/api/auth/register')
    .send({ ...input, password: 'short' })
    .expect(400);
  await guest
    .post('/api/auth/register')
    .send({ ...input, active: true })
    .expect(400);
  const registered = await guest
    .post('/api/auth/register')
    .send(input)
    .expect(201);
  assert.equal(registered.body.passwordHash, undefined);
  assert.equal(
    (await guest.get('/api/auth/me').expect(200)).body.email,
    input.email,
  );
  const cookie = registered.headers['set-cookie'].join(';');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  await guest
    .post('/api/auth/register')
    .send({ ...input, email: 'NEW@example.edu' })
    .expect(409);
  await guest.post('/api/auth/logout').send({}).expect(204);
  await guest.get('/api/auth/me').expect(401);
});

test('incorrect passwords fail and cross-origin writes are rejected', async () => {
  const guest = supertest(instance.app.getHttpServer());
  await guest
    .post('/api/auth/login')
    .send({ email: people.student.email, password: 'Wrong-password-1234' })
    .expect(401);
  await guest
    .post('/api/auth/login')
    .set('Origin', 'https://untrusted.example')
    .send({ email: people.student.email, password })
    .expect(403);
  await guest
    .post('/api/auth/login')
    .type('form')
    .send({ email: people.student.email, password })
    .expect(415);
});

test('request CRUD validates categories, rejects injected ownership, and records changes', async () => {
  const malformed = await agents.student
    .post('/api/requests')
    .type('json')
    .send('{invalid')
    .expect(400);
  assert.match(malformed.body.message, /valid JSON/);
  await agents.student
    .post('/api/requests')
    .send({ ...payload(), requesterId: people.other.id })
    .expect(400);
  await agents.student
    .post('/api/requests')
    .send({ ...payload(), title: 'x' })
    .expect(400);
  await agents.student
    .post('/api/requests')
    .send({ ...payload(), categoryId: '10000000-0000-4000-8000-000000000000' })
    .expect(400);
  const created = await agents.student
    .post('/api/requests')
    .send(payload())
    .expect(201);
  requestId = created.body.id;
  assert.equal(created.body.requesterId, people.student.id);
  assert.equal(created.body.status, 'SUBMITTED');
  await agents.student
    .patch(`/api/requests/${requestId}`)
    .send(payload('Leaking pipe needs attention'))
    .expect(200);
  const detail = (
    await agents.student.get(`/api/requests/${requestId}`).expect(200)
  ).body;
  assert.equal(detail.logs.length, 2);
  assert.equal(detail.requester.passwordHash, undefined);
  assert.equal(detail.title, 'Leaking pipe needs attention');
});

test('students cannot read, edit, delete or assign another student’s request', async () => {
  await agents.other.get(`/api/requests/${requestId}`).expect(404);
  await agents.other
    .patch(`/api/requests/${requestId}`)
    .send(payload())
    .expect(404);
  await agents.other.delete(`/api/requests/${requestId}`).send({}).expect(404);
  await agents.student
    .post(`/api/requests/${requestId}/assign`)
    .send({ officerId: people.officer.id })
    .expect(403);
  await agents.student.get('/api/users').expect(403);
  await agents.student.get('/api/reports').expect(403);
  assert.equal(
    (await agents.other.get('/api/requests').expect(200)).body.total,
    0,
  );
});

test('search, filters and pagination preserve scope and literal wildcard behavior', async () => {
  await agents.staff
    .post('/api/requests')
    .send(payload('Faulty classroom projector'))
    .expect(201);
  assert.equal(
    (
      await agents.student
        .get('/api/requests?search=leaking&status=SUBMITTED&limit=1')
        .expect(200)
    ).body.total,
    1,
  );
  assert.equal(
    (await agents.student.get('/api/requests?search=%25').expect(200)).body
      .total,
    0,
  );
  const result = (
    await agents.admin.get('/api/requests?limit=1&page=2').expect(200)
  ).body;
  assert.equal(result.items.length, 1);
  assert.equal(result.total, 2);
  assert.equal(result.pages, 2);
  await agents.admin.get('/api/requests?limit=101').expect(400);
  await agents.admin.get('/api/requests?page=0').expect(400);
  await agents.admin.get('/api/requests?status=UNKNOWN').expect(400);
  await agents.admin.get('/api/requests?categoryId=bad').expect(400);
});

test('assignment requires an officer and makes the request visible only to that officer', async () => {
  await agents.officer.get(`/api/requests/${requestId}`).expect(404);
  await agents.admin
    .post(`/api/requests/${requestId}/assign`)
    .send({ officerId: people.student.id })
    .expect(400);
  const assigned = await agents.admin
    .post(`/api/requests/${requestId}/assign`)
    .send({ officerId: people.officer.id })
    .expect(200);
  assert.equal(assigned.body.status, 'ASSIGNED');
  await agents.officer.get(`/api/requests/${requestId}`).expect(200);
  await agents.replacement.get(`/api/requests/${requestId}`).expect(404);
  await agents.officer.post('/api/requests').send(payload()).expect(403);
  await agents.student
    .patch(`/api/requests/${requestId}`)
    .send(payload())
    .expect(409);
  await agents.student
    .delete(`/api/requests/${requestId}`)
    .send({})
    .expect(409);
});

test('progress cannot skip stages or be changed by the requester', async () => {
  await agents.student
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'IN_PROGRESS', note: 'Working on this.' })
    .expect(403);
  await agents.officer
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'COMPLETED', note: 'Repair complete.' })
    .expect(409);
  await agents.officer
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'IN_PROGRESS', note: 'Inspecting the pipe.' })
    .expect(200);
  await agents.officer
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'IN_PROGRESS', note: 'Duplicate update.' })
    .expect(409);
});

test('active assignments protect officers; reassignment revokes the previous officer’s access', async () => {
  const input = { name: people.officer.name, role: 'OFFICER', active: false };
  await agents.admin
    .patch(`/api/users/${people.officer.id}`)
    .send(input)
    .expect(409);
  await agents.admin
    .post(`/api/requests/${requestId}/assign`)
    .send({ officerId: people.replacement.id })
    .expect(200);
  await agents.officer.get(`/api/requests/${requestId}`).expect(404);
  await agents.officer
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'COMPLETED', note: 'Old officer update.' })
    .expect(404);
  const detail = (
    await agents.replacement.get(`/api/requests/${requestId}`).expect(200)
  ).body;
  assert.equal(detail.status, 'ASSIGNED');
  assert.equal(detail.assignments.length, 2);
  assert.equal(detail.assignments.filter((row) => !row.endedAt).length, 1);
});

test('simultaneous progress updates allow only one transition and one matching history entry', async () => {
  const results = await Promise.all(
    [1, 2].map(() =>
      agents.replacement
        .post(`/api/requests/${requestId}/status`)
        .send({ status: 'IN_PROGRESS', note: 'Beginning replacement repair.' }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  await agents.replacement
    .post(`/api/requests/${requestId}/status`)
    .send({ status: 'COMPLETED', note: 'Replaced pipe and checked for leaks.' })
    .expect(200);
  const detail = (
    await agents.student.get(`/api/requests/${requestId}`).expect(200)
  ).body;
  assert.equal(detail.status, 'COMPLETED');
  assert.equal(
    detail.logs.filter((log) => log.note === 'Beginning replacement repair.')
      .length,
    1,
  );
  assert.ok(detail.assignments.every((row) => row.endedAt));
  await agents.admin
    .post(`/api/requests/${requestId}/assign`)
    .send({ officerId: people.officer.id })
    .expect(409);
});

test('administrators manage users; disabling a user revokes their existing session', async () => {
  const created = await agents.admin
    .post('/api/users')
    .send({
      name: 'New Officer',
      email: 'new-officer@example.edu',
      password,
      role: 'OFFICER',
    })
    .expect(201);
  assert.equal(created.body.passwordHash, undefined);
  const users = (
    await agents.admin
      .get('/api/users?role=OFFICER&search=new&limit=1')
      .expect(200)
  ).body;
  assert.equal(users.total, 1);
  await agents.admin
    .patch(`/api/users/${people.officer.id}`)
    .send({ name: people.officer.name, role: 'OFFICER', active: false })
    .expect(200);
  await agents.officer.get('/api/auth/me').expect(401);
  await agents.admin
    .patch(`/api/users/${people.admin.id}`)
    .send({ name: people.admin.name, role: 'ADMIN', active: false })
    .expect(409);
});

test('dashboard totals are scoped and reports validate date ranges', async () => {
  const dashboard = (await agents.student.get('/api/dashboard').expect(200))
    .body;
  assert.equal(dashboard.total, 1);
  assert.equal(dashboard.counts.COMPLETED, 1);
  const report = (await agents.admin.get('/api/reports').expect(200)).body;
  assert.equal(report.total, 2);
  assert.equal(report.completed, 1);
  assert.equal(report.completionRate, 50);
  await agents.admin.get('/api/reports?from=2026-02-30').expect(400);
  await agents.admin
    .get('/api/reports?from=2026-12-01&to=2026-01-01')
    .expect(400);
  assert.equal(
    (
      await agents.admin
        .get('/api/reports?from=2000-01-01&to=2000-01-01')
        .expect(200)
    ).body.total,
    0,
  );
});

test('deleting a submitted request removes it and its dependent logs', async () => {
  const created = await agents.student
    .post('/api/requests')
    .send(payload('Duplicate pipe complaint'))
    .expect(201);
  await agents.student
    .delete(`/api/requests/${created.body.id}`)
    .send({})
    .expect(204);
  await agents.admin.get(`/api/requests/${created.body.id}`).expect(404);
  const rows = await db.query(
    'SELECT count(*)::int AS count FROM status_logs WHERE "requestId" = $1',
    [created.body.id],
  );
  assert.equal(rows[0].count, 0);
});

test('Swagger serves the implemented operations and DTO constraints', async () => {
  const spec = (
    await supertest(instance.app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
  ).body;
  assert.ok(spec.paths['/api/requests/{id}/assign'].post);
  assert.ok(spec.paths['/api/reports'].get);
  assert.equal(
    spec.components.schemas.RequestDto.properties.title.minLength,
    5,
  );
});
