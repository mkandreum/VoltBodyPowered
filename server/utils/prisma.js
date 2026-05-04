import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Graceful disconnect on exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
