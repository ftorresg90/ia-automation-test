import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is not defined in environment variables. Prisma connection will likely fail.');
}

const prisma = new PrismaClient();

export default prisma;
