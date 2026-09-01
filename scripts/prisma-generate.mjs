#!/usr/bin/env node
/** Generates the Prisma client against whichever database the environment points at. */
import { execFileSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { schemaForEnv, isSqlite } from './schema-for-env.mjs';

loadEnv({ path: '.env', quiet: true });

const schema = schemaForEnv();
if (isSqlite()) {
  console.log('DATABASE_URL is a file: URL — generating the client against a derived SQLite schema.');
}

execFileSync('npx', ['prisma', 'generate', '--schema', schema], { stdio: 'inherit' });
