#!/usr/bin/env node
/**
 * One-command demo database.
 *
 * Production targets PostgreSQL. Reviewers and demo laptops often have no Postgres, so
 * this pushes a derived SQLite copy of the same schema to a local file, regenerates the
 * client and seeds realistic demo data.
 *
 *   npm run demo:sqlite
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { deriveSqliteSchema } from './schema-for-env.mjs';

const root = process.cwd();
const dbFile = path.join(root, 'prisma', 'dev.db');
const schema = deriveSqliteSchema();
const url = `file:${dbFile}`;

const env = { ...process.env, DATABASE_URL: url };
const run = (args) => execFileSync('npx', args, { stdio: 'inherit', env, cwd: root });

console.log('\n▸ Pushing schema to the SQLite demo database…');
run(['prisma', 'db', 'push', '--schema', schema, '--force-reset', '--skip-generate']);

console.log('\n▸ Generating Prisma client…');
run(['prisma', 'generate', '--schema', schema]);

console.log('\n▸ Seeding demo data…');
run(['tsx', 'prisma/seed.ts']);

console.log(`
Demo database ready.

  DATABASE_URL="${url}"   ← put this in .env

Then run: npm run dev
`);
