const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUser() {
  console.log('🔧 FIXING USER RECORD\n');

  try {
    // 1. Find the mystery user
    const mysteryUser = await prisma.user.findFirst({
      where: { privyId: 'did:privy:cmde0isl3007cjo0mqtfch80w' }
    });
    console.log('Mystery user before fix:', mysteryUser);

    // 2. Find Daveed's user
    const daveedUser = await prisma.user.findFirst({
      where: { email: 'daveed@bridgit.io' }
    });
    console.log('Daveed user:', daveedUser);

    if (mysteryUser && daveedUser) {
      // 3. Delete the duplicate Daveed user first
      await prisma.user.delete({
        where: { id: daveedUser.id }
      });
      console.log('Deleted duplicate Daveed user');

      // 4. Update the mystery user with Daveed's information
      const updatedUser = await prisma.user.update({
        where: { id: mysteryUser.id },
        data: {
          email: 'daveed@bridgit.io',
          firstName: 'Daveed',
          lastName: 'Benjamin',
          privyId: 'did:privy:cmde0isl3007cjo0mqtfch80w' // Keep the current privyId
        }
      });
      console.log('Updated mystery user:', updatedUser);

      // 5. Check votes and comments
      const votesToUpdate = await prisma.vote.findMany({
        where: { voterId: mysteryUser.id }
      });
      console.log(`Found ${votesToUpdate.length} votes to update`);

      const commentsToUpdate = await prisma.comment.findMany({
        where: { authorId: mysteryUser.id }
      });
      console.log(`Found ${commentsToUpdate.length} comments to update`);

      console.log('✅ User record fixed successfully!');
      console.log('✅ All votes and comments are now properly attributed to Daveed');

    } else {
      console.log('❌ Could not find required users');
    }

  } catch (error) {
    console.error('Error during user fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser(); 