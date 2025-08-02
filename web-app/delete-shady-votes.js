const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteShadyVotes() {
  try {
    console.log('Deleting specific shady votes...');
    
    // The specific shady vote IDs we found
    const shadyVoteIds = [
      'cmdq7esze00ugh2wogzdmnbd0',
      'cmdq656cd00ueh2wog2y3rfqi', 
      'cmdq64fwq00uch2wohpzghnpg'
    ];
    
    console.log('Deleting votes with IDs:', shadyVoteIds);
    
    const deleteResult = await prisma.vote.deleteMany({
      where: {
        id: {
          in: shadyVoteIds
        }
      }
    });
    
    console.log(`\n✅ Successfully removed ${deleteResult.count} shady votes!`);
    
    // Verify they're gone
    const remainingVotes = await prisma.vote.findMany({
      include: {
        voter: true,
        submission: {
          select: {
            title: true
          }
        }
      }
    });
    
    console.log(`\nRemaining votes in database: ${remainingVotes.length}`);
    
    if (remainingVotes.length > 0) {
      console.log('Remaining votes:');
      remainingVotes.forEach((vote, index) => {
        console.log(`${index + 1}. Vote ID: ${vote.id}`);
        console.log(`   Type: ${vote.type}`);
        console.log(`   Voter: ${vote.voter?.firstName || 'null'} ${vote.voter?.lastName || 'null'}`);
        console.log(`   Submission: ${vote.submission?.title || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error deleting shady votes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteShadyVotes(); 