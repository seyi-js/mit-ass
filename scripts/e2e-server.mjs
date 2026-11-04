import { config } from 'dotenv';
import { Pool } from 'pg';
import { DataSource } from 'typeorm';

config({ quiet: true });
const testDatabase = process.env.TEST_DATABASE_URL;
if (
  !testDatabase ||
  !new URL(testDatabase).pathname.endsWith('_test') ||
  testDatabase === process.env.DATABASE_URL
)
  throw new Error(
    'Set TEST_DATABASE_URL to a separate database ending in _test.',
  );
process.env.DATABASE_URL = testDatabase;
process.env.NODE_ENV = 'test';
process.env.APP_ORIGIN = 'http://127.0.0.1:3101';
process.env.SESSION_SECRET = 'browser-test-secret-with-at-least-32-characters';
const pool = new Pool({ connectionString: testDatabase });
await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
await pool.end();
const { createApp } = await import('../apps/server/dist/app.js');
const { User } = await import('../apps/server/dist/entities.js');
const { hashPassword } = await import('../apps/server/dist/password.js');
const instance = await createApp();
await instance.app.get(DataSource).manager.save(User, {
  name: 'Amina Bello',
  email: 'admin@example.edu',
  passwordHash: await hashPassword('Browser-test-password-8333'),
  role: 'ADMIN',
  active: true,
});
await instance.app.listen(3101, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await instance.close();
    process.exit(0);
  });
