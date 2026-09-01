import { PrismaClient } from '@prisma/client';

/**
 * A single client per process. Next.js dev-mode hot reload would otherwise open a new
 * pool on every edit and exhaust the database's connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
