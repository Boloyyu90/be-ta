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
  console.log('   Password: Admin123456');

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
  console.log('   Password: Admin123456');

  // Create additional test participants
  const testUsers = [];
  for (let i = 1; i <= 5; i++) {
    const testUser = await prisma.user.upsert({
      where: { email: `test${i}@example.com` },
      update: {},
      create: {
        email: `test${i}@example.com`,
        password: hashedPassword,
        name: `Test User ${i}`,
        role: UserRole.PARTICIPANT,
        isEmailVerified: true,
      },
    });
    testUsers.push(testUser);
  }

  console.log(`✅ Created ${testUsers.length} test users (test1@example.com - test5@example.com)`);
  console.log('   Password: Admin123456');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📝 Summary:');
  console.log(`   - 1 Admin user: ${admin.email}`);
  console.log(`   - 1 Participant user: ${participant.email}`);
  console.log(`   - 5 Test users: test1@example.com - test5@example.com`);
  console.log(`   - All passwords: Admin123456`);
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });