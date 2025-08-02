const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCommentCreation() {
  console.log('Testing comment creation...');
  
  try {
    // Get a test submission
    const submission = await prisma.submission.findFirst();
    if (!submission) {
      console.log('No submissions found');
      return;
    }
    
    console.log('Test submission ID:', submission.id);
    
    // Get a test user  
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found');
      return;
    }
    
    console.log('Test user ID:', user.id);
    
    // Create a test comment for submission
    const testComment = await prisma.comment.create({
      data: {
        content: 'Test submission comment - ' + Date.now(),
        authorId: user.id,
        submissionId: submission.id,
        elementId: submission.id,
        elementType: 'submission'
      }
    });
    
    console.log('Created test comment:', testComment.id);
    
    // Now test fetching with our API logic
    const submissionComments = await prisma.comment.findMany({
      where: { 
        submissionId: submission.id,
        OR: [
          { elementId: null, elementType: null }, // Legacy comments
          { elementType: 'submission' } // New submission-level comments
        ]
      }
    });
    
    console.log('Fetched submission comments:', submissionComments.length);
    submissionComments.forEach(c => console.log('  -', c.content.substring(0, 30), '|', c.elementType || 'null'));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommentCreation();