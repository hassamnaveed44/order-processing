import dotenv from 'dotenv';
import { defineConfig } from '@prisma/config';

dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orderprocessing?schema=public',
  },
});
