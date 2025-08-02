const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVotes() {
  try {
    console.log('🔍 Checking all votes in database...');
    
    const allVotes = await prisma.vote.findMany({
      take: 20,
      include: {
        voter: {
          select: {
            id: true,
            userName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${allVotes.length} votes:`);
    allVotes.forEach((vote, index) => {
      console.log(`\nVote ${index + 1}:`);
      console.log(`  ID: ${vote.id}`);
      console.log(`  Type: ${vote.type}`);
      console.log(`  SubmissionId: ${vote.submissionId}`);
      console.log(`  CommentId: ${vote.commentId}`);
      console.log(`  ElementId: ${vote.elementId}`);
      console.log(`  ElementType: ${vote.elementType}`);
      console.log(`  VoterId: ${vote.voterId}`);
      console.log(`  Voter: ${vote.voter?.userName || 'Unknown'}`);
      console.log(`  Created: ${vote.createdAt}`);
    });

    // Check for submission-level votes specifically
    console.log('\n🔍 Checking submission-level votes (commentId=null, elementId=null, elementType=null):');
    const submissionVotes = await prisma.vote.findMany({
      where: {
        commentId: null,
        elementId: null,
        elementType: null
      },
      include: {
        voter: {
          select: {
            id: true,
            userName: true,
            email: true
          }
        }
      }
    });

    console.log(`Found ${submissionVotes.length} submission-level votes:`);
    submissionVotes.forEach((vote, index) => {
      console.log(`\nSubmission Vote ${index + 1}:`);
      console.log(`  ID: ${vote.id}`);
      console.log(`  Type: ${vote.type}`);
      console.log(`  SubmissionId: ${vote.submissionId}`);
      console.log(`  VoterId: ${vote.voterId}`);
      console.log(`  Voter: ${vote.voter?.userName || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVotes(); 