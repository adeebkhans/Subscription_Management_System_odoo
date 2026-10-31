import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const database = new PrismaClient();

async function seed() {
  const passwordHash = await argon2.hash('Admin@1234');
  await database.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date()
    }
  });
}

seed().finally(() => database.$disconnect());
