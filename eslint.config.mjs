import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

// `next lint` is deprecated in Next 15 and removed in 16, so this project uses the ESLint
// CLI directly. FlatCompat is still needed because eslint-config-next is published as a
// legacy (eslintrc) config.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'prisma/.generated/**',
      'next-env.d.ts',
      'private-uploads/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // The schema stores multi-value fields as JSON strings for PostgreSQL/SQLite
      // portability, so a handful of parsed values are legitimately `any` at the boundary.
      // They are narrowed in src/lib/json-list.ts; everywhere else this stays an error.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
