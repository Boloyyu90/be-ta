import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin123456', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create participant user for testing
  const participant = await prisma.user.upsert({
    where: { email: 'participant@example.com' },
    update: {},
    create: {
      email: 'participant@example.com',
      password: hashedPassword,
      name: 'Participant User',
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  console.log('✅ Participant user created:', participant.email);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });