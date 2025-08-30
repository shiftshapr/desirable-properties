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
          email: 'daveed@bridgit.io',
          userName: 'Daveed Benjamin (Test)',
          firstName: 'Daveed',
          lastName: 'Benjamin'
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




