const { PrismaClient } = require('@prisma/client');

async function checkSubmissions() {
  const prisma = new PrismaClient();
  
  try {
    const submissions = await prisma.submission.findMany({
      select: {
        id: true,
        title: true
      }
    });
    
    console.log('Available submissions:');
    submissions.forEach(sub => {
      console.log(`ID: ${sub.id}, Title: ${sub.title}`);
    });
    
    if (submissions.length === 0) {
      console.log('No submissions found in database');
    }
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissions(); 