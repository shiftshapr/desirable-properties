const { PrismaClient } = require('@prisma/client');

async function createTestUser() {
  const prisma = new PrismaClient();
  
  try {
    // Check if test user exists
    let testUser = await prisma.user.findUnique({
      where: { privyId: 'test-user-123' }
    });
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          privyId: 'test-user-123',
          email: 'noreply@themetalayer.org',
          userName: 'Anon (Test)',
          firstName: 'Anon',
          lastName: ''
        }
      });
      console.log('✅ Created test user:', testUser);
    } else {
      console.log('✅ Test user already exists:', testUser);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();




