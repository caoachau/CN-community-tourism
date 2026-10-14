import { createDatabase } from '../src/database.js';
import { createAuthRepository } from '../src/auth/repository.js';
import { hashPassword } from '../src/auth/passwords.js';
import { registerSchema } from '../src/auth/router.js';
import { AppError } from '../src/shared/errors.js';
import { DatabaseConfigError, databaseErrorCode } from '../src/config/database.js';

let database;
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--apply' ||
      args[1] !== `--confirm-database=${process.env.DB_EXPECTED_DATABASE}` || !process.env.DB_EXPECTED_DATABASE) {
    throw new DatabaseConfigError('ADMIN_CREATION_REQUIRES_APPLY_AND_DATABASE_CONFIRMATION');
  }
  const parsed = registerSchema.safeParse({
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    displayName: process.env.ADMIN_BOOTSTRAP_NAME,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  });
  if (!parsed.success) throw new DatabaseConfigError('INVALID_ADMIN_BOOTSTRAP_INPUT');
  const passwordHash = await hashPassword(parsed.data.password);
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  database = createDatabase();
  await database.check();
  const user = await createAuthRepository(database).transaction((tx) => tx.createUser({ ...parsed.data, passwordHash, role: 'ADMIN' }));
  // Never promote or reset an existing account; duplicate email fails closed.
  console.log(JSON.stringify({ event: 'admin_created', userId: String(user.id), role: 'ADMIN' }));
} catch (error) {
  console.error(JSON.stringify({ event: 'admin_creation_failed', code: error instanceof AppError ? error.code : databaseErrorCode(error) }));
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  await database?.close();
}
