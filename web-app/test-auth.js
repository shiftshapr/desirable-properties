const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuth() {
  console.log('🔐 TESTING AUTHENTICATION FLOW\n');

  try {
    // 1. Check all users with their privyId
    console.log('1. ALL USERS WITH PRIVY ID:');
    const allUsers = await prisma.user.findMany();
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Privy ID: ${user.privyId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log('');
    });

    // 2. Test finding user by privyId
    console.log('2. TESTING USER LOOKUP BY PRIVY ID:');
    const testPrivyId = 'did:privy:cmde0isl3007cjo0mqtfch80w';
    const userByPrivyId = await prisma.user.findFirst({
      where: { privyId: testPrivyId }
    });
    console.log(`User with privyId ${testPrivyId}:`, userByPrivyId);

    // 3. Test finding user by email
    console.log('3. TESTING USER LOOKUP BY EMAIL:');
    const testEmail = 'daveed@bridgit.io';
    const userByEmail = await prisma.user.findFirst({
      where: { email: testEmail }
    });
    console.log(`User with email ${testEmail}:`, userByEmail);

    // 4. Check if there are multiple users with same privyId
    console.log('4. CHECKING FOR DUPLICATE PRIVY IDS:');
    const privyIdGroups = {};
    allUsers.forEach(user => {
      if (user.privyId) {
        if (!privyIdGroups[user.privyId]) privyIdGroups[user.privyId] = [];
        privyIdGroups[user.privyId].push(user);
      }
    });
    
    const duplicates = Object.entries(privyIdGroups).filter(([privyId, users]) => users.length > 1);
    console.log('Duplicate privyIds:', duplicates);

    // 5. Check users with null email
    console.log('5. USERS WITH NULL EMAIL:');
    const nullEmailUsers = allUsers.filter(user => !user.email);
    nullEmailUsers.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Privy ID: ${user.privyId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log('');
    });

    // 6. Check users with null privyId
    console.log('6. USERS WITH NULL PRIVY ID:');
    const nullPrivyIdUsers = allUsers.filter(user => !user.privyId);
    nullPrivyIdUsers.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Privy ID: ${user.privyId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error during auth testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth(); 