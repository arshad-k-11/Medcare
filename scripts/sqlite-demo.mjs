#!/usr/bin/env node
/**
 * One-command demo database.
 *
 * Production targets PostgreSQL. Reviewers and demo laptops often have no Postgres, so
 * this pushes a derived SQLite copy of the same schema to a local file, regenerates the
 * client, writes the two environment variables the app needs, and seeds realistic data.
 *
 *   npm run demo:sqlite
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { deriveSqliteSchema } from './schema-for-env.mjs';
import { updateEnvFile, readEnvFile, ENV_PATH } from './env-file.mjs';
import { npx } from './run-npx.mjs';

const root = process.cwd();

// Prisma wants a URL, not a Windows path: C:\dev\app\prisma\dev.db has to travel as
// file:C:/dev/app/prisma/dev.db. An absolute path (rather than file:./dev.db) is
// deliberate — the derived schema sits in prisma/.generated/, so a relative URL would
// resolve against the wrong directory.
const dbFile = path.join(root, 'prisma', 'dev.db');
const url = `file:${dbFile.split(path.sep).join('/')}`;

const schema = deriveSqliteSchema();
const env = { ...process.env, DATABASE_URL: url };
const run = (args) => npx(args, { env, cwd: root });

console.log('\n▸ Pushing schema to the SQLite demo database…');
run(['prisma', 'db', 'push', '--schema', schema, '--force-reset', '--skip-generate']);

console.log('\n▸ Generating Prisma client…');
run(['prisma', 'generate', '--schema', schema]);

// Written before seeding so that a seed failure still leaves a usable .env behind.
const existing = readEnvFile();
const written = updateEnvFile({
  DATABASE_URL: url,
  // Base64 of 48 random bytes, so no one has to find openssl on Windows.
  AUTH_SECRET: randomBytes(48).toString('base64'),
});

console.log('\n▸ Seeding demo data…');
run(['tsx', 'prisma/seed.ts']);

console.log('\nDemo database ready.\n');

if (written.length) {
  console.log(`  Wrote ${written.join(' and ')} to ${ENV_PATH}`);
} else {
  console.log(`  ${ENV_PATH} already had DATABASE_URL and AUTH_SECRET — left untouched.`);
}

if (existing.DATABASE_URL && existing.DATABASE_URL !== url) {
  console.log(`
  Note: your .env already points DATABASE_URL at
    ${existing.DATABASE_URL}
  so it was not changed. To use the demo database instead, set it to:
    DATABASE_URL="${url}"`);
}

console.log('\nThen run: npm run dev\n');
