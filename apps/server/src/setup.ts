import { createDataSource } from './config';
import { RoleName, User } from './entities';
import { hashPassword } from './password';

async function setup() {
  const db = await createDataSource().initialize();
  try {
    if (
      !(await db.manager.existsBy(User, { role: RoleName.ADMIN, active: true }))
    ) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !password ||
        password.length < 12 ||
        password.length > 128
      )
        throw new Error(
          'Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (12–128 characters) before setup.',
        );
      await db.manager.save(User, {
        name,
        email,
        role: RoleName.ADMIN,
        active: true,
        passwordHash: await hashPassword(password),
      });
      console.log('Initial administrator created.');
    } else
      console.log(
        'An active administrator already exists; credentials were left unchanged.',
      );
    console.log('Database migrations and categories are ready.');
  } finally {
    await db.destroy();
  }
}

setup().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
