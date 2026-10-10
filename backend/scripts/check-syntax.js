import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

const files = [new URL('../src/', import.meta.url), new URL('./', import.meta.url)]
  .flatMap((directory) => filesUnder(fileURLToPath(directory)));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}
console.log(`Syntax check passed (${files.length} backend files)`);
