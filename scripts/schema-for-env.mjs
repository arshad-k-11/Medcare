/**
 * Resolves which Prisma schema to use for the current DATABASE_URL.
 *
 * The committed schema (prisma/schema.prisma) targets PostgreSQL — that is the
 * production database. A `file:` URL means someone is running the SQLite demo, so we
 * derive a SQLite copy of the same schema on the fly. Deriving rather than committing a
 * second schema is what stops the two from drifting.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const POSTGRES_SCHEMA = path.join(process.cwd(), 'prisma', 'schema.prisma');
const DERIVED_DIR = path.join(process.cwd(), 'prisma', '.generated');
const DERIVED_SCHEMA = path.join(DERIVED_DIR, 'schema.prisma');

export function deriveSqliteSchema() {
  const source = readFileSync(POSTGRES_SCHEMA, 'utf8');
  // Only the provider changes. The url still reads DATABASE_URL, so the generated
  // client and the running app agree on one environment variable.
  const sqlite = source.replace('provider = "postgresql"', 'provider = "sqlite"');
  if (sqlite === source) {
    throw new Error('Could not rewrite the datasource block — has prisma/schema.prisma changed shape?');
  }
  mkdirSync(DERIVED_DIR, { recursive: true });
  writeFileSync(DERIVED_SCHEMA, sqlite);
  return DERIVED_SCHEMA;
}

export function isSqlite(url = process.env.DATABASE_URL ?? '') {
  return url.startsWith('file:');
}

export function schemaForEnv() {
  return isSqlite() ? deriveSqliteSchema() : POSTGRES_SCHEMA;
}
