const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCompleteVotingSystem() {
  console.log('🔍 COMPREHENSIVE VOTING SYSTEM DEBUG');
  console.log('=====================================\n');

  try {
    // 1. Check database state
    console.log('1. DATABASE STATE:');
    const submissions = await prisma.submission.findMany({ take: 3 });
    const votes = await prisma.vote.findMany({ take: 10 });
    const comments = await prisma.comment.findMany({ take: 5 });
    const users = await prisma.user.findMany({ take: 3 });
    
    console.log(`- Total submissions: ${submissions.length}`);
    console.log(`- Total votes: ${votes.length}`);
    console.log(`- Total comments: ${comments.length}`);
    console.log(`- Total users: ${users.length}\n`);

    // 2. Check vote data structure
    console.log('2. SAMPLE VOTE DATA:');
    votes.slice(0, 3).forEach((vote, i) => {
      console.log(`Vote ${i + 1}:`);
      console.log(`  - ID: ${vote.id}`);
      console.log(`  - Voter ID: ${vote.voterId}`);
      console.log(`  - Element ID: ${vote.elementId}`);
      console.log(`  - Element Type: ${vote.elementType}`);
      console.log(`  - Submission ID: ${vote.submissionId}`);
      console.log(`  - Comment ID: ${vote.commentId}`);
      console.log(`  - Vote Type: ${vote.type}`);
      console.log('');
    });

    // 3. Check comment data structure
    console.log('3. SAMPLE COMMENT DATA:');
    comments.slice(0, 3).forEach((comment, i) => {
      console.log(`Comment ${i + 1}:`);
      console.log(`  - ID: ${comment.id}`);
      console.log(`  - User ID: ${comment.userId}`);
      console.log(`  - User Name: ${comment.userName}`);
      console.log(`  - Submission ID: ${comment.submissionId}`);
      console.log(`  - Element ID: ${comment.elementId}`);
      console.log(`  - Element Type: ${comment.elementType}`);
      console.log(`  - Content: ${comment.content.substring(0, 50)}...`);
      console.log('');
    });

    // 4. Check user data structure
    console.log('4. SAMPLE USER DATA:');
    users.slice(0, 3).forEach((user, i) => {
      console.log(`User ${i + 1}:`);
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - First Name: ${user.firstName}`);
      console.log(`  - Last Name: ${user.lastName}`);
      console.log(`  - Privy ID: ${user.privyId}`);
      console.log('');
    });

    // 5. Test specific voting scenarios
    console.log('5. VOTING SCENARIOS TEST:');
    
    if (submissions.length > 0 && users.length > 0) {
      const testSubmission = submissions[0];
      const testUser = users[0];
      
      console.log(`Testing with submission: ${testSubmission.id}`);
      console.log(`Testing with user: ${testUser.id} (${testUser.email})\n`);
      
      // Test submission votes
      const submissionVotes = await prisma.vote.findMany({
        where: {
          submissionId: testSubmission.id,
          elementType: 'submission'
        }
      });
      console.log(`Submission votes count: ${submissionVotes.length}`);
      
      // Test element votes (alignments, clarifications, extensions)
      const elementVotes = await prisma.vote.findMany({
        where: {
          submissionId: testSubmission.id,
          elementType: { in: ['alignment', 'clarification', 'extension'] }
        }
      });
      console.log(`Element votes count: ${elementVotes.length}`);
      
      // Test comment votes
      const commentVotes = await prisma.vote.findMany({
        where: {
          commentId: { not: null }
        }
      });
      console.log(`Comment votes count: ${commentVotes.length}`);
      
      // Test user's specific votes
      const userVotes = await prisma.vote.findMany({
        where: {
          voterId: testUser.id
        }
      });
      console.log(`User's votes count: ${userVotes.length}\n`);
    }

    // 6. Test API-like queries
    console.log('6. API-LIKE QUERIES TEST:');
    
    if (submissions.length > 0) {
      const testSubmission = submissions[0];
      
      // Test vote count aggregation
      const upvotes = await prisma.vote.count({
        where: {
          submissionId: testSubmission.id,
          elementType: 'submission',
          type: 'UP'
        }
      });
      
      const downvotes = await prisma.vote.count({
        where: {
          submissionId: testSubmission.id,
          elementType: 'submission',
          type: 'DOWN'
        }
      });
      
      console.log(`Submission ${testSubmission.id} votes: ${upvotes} up, ${downvotes} down`);
      
      // Test comment count
      const commentsCount = await prisma.comment.count({
        where: {
          submissionId: testSubmission.id,
          elementType: 'submission'
        }
      });
      
      console.log(`Submission ${testSubmission.id} comments: ${commentsCount}\n`);
    }

    // 7. Check for data inconsistencies
    console.log('7. DATA CONSISTENCY CHECK:');
    
    // Check for orphaned votes
    const orphanedVotes = await prisma.vote.findMany({
      where: {
        AND: [
          { commentId: null },
          { submissionId: null }
        ]
      }
    });
    console.log(`Orphaned votes (no submission or comment): ${orphanedVotes.length}`);
    
    // Check for votes with invalid element types
    const invalidElementTypeVotes = await prisma.vote.findMany({
      where: {
        elementType: { notIn: ['submission', 'alignment', 'clarification', 'extension', 'comment'] }
      }
    });
    console.log(`Invalid element type votes: ${invalidElementTypeVotes.length}`);
    
    // Check for duplicate votes (should not exist after constraint removal)
    const allVotes = await prisma.vote.findMany();
    const duplicateCheck = new Map();
    let duplicates = 0;
    
    allVotes.forEach(vote => {
      const key = `${vote.voterId}-${vote.submissionId}-${vote.elementId}-${vote.elementType}`;
      if (duplicateCheck.has(key)) {
        duplicates++;
      } else {
        duplicateCheck.set(key, true);
      }
    });
    console.log(`Potential duplicate votes: ${duplicates}`);

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCompleteVotingSystem();