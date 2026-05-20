import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '&connect_timeout=5&command_timeout=10',
    },
  },
});

// Graceful disconnect on exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
