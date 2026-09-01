/**
 * Reads and updates the project's .env.
 *
 * The demo used to print a DATABASE_URL and trust the reader to paste it in. Missing that
 * step produces a stack of `Environment variable not found: DATABASE_URL` errors at the
 * first page render, which is a poor welcome, so the demo now writes the file itself.
 *
 * Existing values are never overwritten — if you have already pointed .env at your own
 * database, running the demo will not silently take it away from you.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.join(process.cwd(), '.env');
const EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

/** Parses just enough of the dotenv format to know which keys already have a value. */
export function readEnvFile() {
  if (!existsSync(ENV_PATH)) return {};
  const values = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

/**
 * Sets keys in .env, skipping any that already hold a non-empty value.
 * Returns the keys it actually wrote.
 */
export function updateEnvFile(updates) {
  let contents = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8')
    : existsSync(EXAMPLE_PATH)
      ? readFileSync(EXAMPLE_PATH, 'utf8')
      : '';

  const current = readEnvFile();
  const written = [];

  for (const [key, value] of Object.entries(updates)) {
    if (current[key]) continue; // already set by hand — leave it alone
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
    contents = pattern.test(contents)
      ? contents.replace(pattern, line)
      : `${contents.replace(/\s*$/, '')}\n${line}\n`;
    written.push(key);
  }

  if (written.length) writeFileSync(ENV_PATH, contents);
  return written;
}

export { ENV_PATH };
