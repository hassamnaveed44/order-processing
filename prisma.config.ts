import dotenv from 'dotenv';
import { defineConfig } from '@prisma/config';

dotenv.config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orderprocessing?schema=public',
  },
});
