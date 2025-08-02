const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('🧹 CLEANING DUPLICATE VOTES\n');

  try {
    // 1. Find all votes for the specific submission
    const submissionId = 'cmdrukifk035jh21wn82fiag2';
    const allVotes = await prisma.vote.findMany({
      where: { submissionId },
      include: { voter: true }
    });
    
    console.log(`Found ${allVotes.length} votes for submission ${submissionId}:`);
    allVotes.forEach((vote, index) => {
      console.log(`${index + 1}. Vote ID: ${vote.id}`);
      console.log(`   Type: ${vote.type}`);
      console.log(`   Voter: ${vote.voter?.email}`);
      console.log(`   Element: ${vote.elementId} (${vote.elementType})`);
      console.log(`   Created: ${vote.createdAt}`);
      console.log('');
    });

    // 2. Group votes by voter and element
    const voteGroups = {};
    allVotes.forEach(vote => {
      const key = `${vote.voterId}-${vote.elementId || 'submission'}-${vote.elementType || 'submission'}`;
      if (!voteGroups[key]) voteGroups[key] = [];
      voteGroups[key].push(vote);
    });

    // 3. Find duplicates and keep the most recent
    const votesToDelete = [];
    Object.entries(voteGroups).forEach(([key, votes]) => {
      if (votes.length > 1) {
        console.log(`Found ${votes.length} votes for key: ${key}`);
        
        // Sort by creation date, keep the most recent
        votes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Mark all but the most recent for deletion
        votes.slice(1).forEach(vote => {
          votesToDelete.push(vote.id);
          console.log(`  Will delete vote: ${vote.id} (${vote.type})`);
        });
      }
    });

    // 4. Delete duplicate votes
    if (votesToDelete.length > 0) {
      console.log(`\nDeleting ${votesToDelete.length} duplicate votes...`);
      await prisma.vote.deleteMany({
        where: { id: { in: votesToDelete } }
      });
      console.log('✅ Duplicate votes deleted successfully!');
    } else {
      console.log('✅ No duplicate votes found!');
    }

    // 5. Verify the cleanup
    const remainingVotes = await prisma.vote.findMany({
      where: { submissionId },
      include: { voter: true }
    });
    
    console.log(`\nRemaining votes for submission: ${remainingVotes.length}`);
    remainingVotes.forEach((vote, index) => {
      console.log(`${index + 1}. Vote ID: ${vote.id}`);
      console.log(`   Type: ${vote.type}`);
      console.log(`   Voter: ${vote.voter?.email}`);
      console.log(`   Element: ${vote.elementId} (${vote.elementType})`);
      console.log('');
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicates(); 