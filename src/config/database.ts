/**
 * Database Configuration
 *
 * Prisma Client singleton dengan automatic logging based on environment
 * dan graceful shutdown support.
 *
 * @module config/database
 */

import { PrismaClient } from '@prisma/client';

/**
 * Create Prisma Client dengan environment-aware logging.
 * Development: log query, error, warn
 * Production: log error only
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

// Global type declaration untuk singleton pattern
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

/**
 * Prisma Client instance (singleton).
 * Reuse instance di development untuk avoid multiple connections.
 */
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Store instance globally di non-production untuk hot reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Graceful shutdown untuk close database connections.
 * Dipanggil saat server shutdown.
 */
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};