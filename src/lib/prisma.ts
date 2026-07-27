import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton pattern for Next.js
 * In development, Next.js fast-refresh can create new PrismaClient instances on every code edit,
 * leading to PostgreSQL connection pool exhaustion. Attaching it to globalThis prevents this.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
