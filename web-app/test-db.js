const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Database connection successful:', result)
    
    // Test user count
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
    
    // Test creating a test user
    const testUser = await prisma.user.create({
      data: {
        privyId: 'test-user-' + Date.now(),
        email: 'test@example.com',
        signupDate: new Date(),
        lastActivity: new Date()
      }
    })
    console.log('Created test user:', testUser)
    
    // Clean up
    await prisma.user.delete({
      where: { id: testUser.id }
    })
    console.log('Test user deleted')
    
  } catch (error) {
    console.error('Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection() 