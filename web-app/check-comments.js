const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkComments() {
  try {
    // Check if Daveed's user exists
    const daveed = await prisma.user.findFirst({
      where: { email: 'daveed@bridgit.io' }
    });
    console.log('Daveed user:', daveed);

    // Get all comments
    const comments = await prisma.comment.findMany({
      include: {
        author: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log('Recent comments:');
    comments.forEach(comment => {
      console.log(`- ID: ${comment.id}`);
      console.log(`  Content: ${comment.content.substring(0, 50)}...`);
      console.log(`  Author: ${comment.author?.email || 'unknown'} (ID: ${comment.authorId})`);
      console.log(`  Created: ${comment.createdAt}`);
      console.log(`  Element: ${comment.elementId} (${comment.elementType})`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComments();
