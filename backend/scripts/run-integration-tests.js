import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { testDatabaseOptions } from '../test/support/config.js';

// Do not load backend/.env or fall back to DATABASE_URL. Unit tests stay DB-free.
const env = { ...process.env, NODE_ENV: 'test' };
try {
  testDatabaseOptions(env); // Fail before spawning workers or touching any server.
  const directory = fileURLToPath(new URL('../test/integration/', import.meta.url));
  const files = (await readdir(directory)).filter((name) => name.endsWith('.test.js')).sort();
  if (!files.length) throw new Error();
  const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files.map((name) => `${directory}/${name}`)], {
    env, stdio: 'inherit',
  });
  child.once('error', () => {
    console.error('Integration test runner could not start');
    process.exitCode = 1;
  });
  child.once('exit', (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(JSON.stringify({ level: 'error', code: error.code ?? 'TEST_RUNNER_FAILED' }));
  process.exitCode = 1;
}
