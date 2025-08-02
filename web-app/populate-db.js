const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function populateDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting database population...');
    
    // Clear existing data first
    console.log('Clearing existing data...');
    await prisma.vote.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.clarificationExtension.deleteMany({});
    await prisma.directlyAddressedDP.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Database cleared successfully');
    
    // Read the submissions data
    const dataFilePath = path.join(process.cwd(), 'data', 'compiled', 'allstructured.json');
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    const submissionsData = JSON.parse(fileContent);
    
    console.log(`Found ${submissionsData.submissions.length} submissions to import`);
    
    // Import each submission
    for (let i = 0; i < submissionsData.submissions.length; i++) {
      const sub = submissionsData.submissions[i];
      
      console.log(`Importing submission ${i + 1}/${submissionsData.submissions.length}: ${sub.submission.title}`);
      
      // Create or find the proper user for this submission
      let user = await prisma.user.findFirst({
        where: { email: sub.submitter.email }
      });
      
      if (!user) {
        console.log(`Creating user for ${sub.submitter.email}`);
        user = await prisma.user.create({
          data: {
            email: sub.submitter.email,
            firstName: sub.submitter.first_name || 'Anonymous',
            lastName: sub.submitter.last_name || 'User',
            privyId: `user-${sub.submitter.email.replace('@', '-at-')}`
          }
        });
      }
      
      // Create the submission with the proper submitter
      const submission = await prisma.submission.create({
        data: {
          title: sub.submission.title,
          overview: sub.submission.overview,
          sourceLink: sub.submission.source_link,
          submitterId: user.id,
        }
      });
      
      // Import directly addressed DPs
      if (sub.directly_addressed_dps && sub.directly_addressed_dps.length > 0) {
        for (const dp of sub.directly_addressed_dps) {
          await prisma.directlyAddressedDP.create({
            data: {
              dp: dp.dp,
              summary: dp.summary,
              submissionId: submission.id
            }
          });
        }
      }
      
      // Import clarifications and extensions
      if (sub.clarifications_and_extensions && sub.clarifications_and_extensions.length > 0) {
        for (const item of sub.clarifications_and_extensions) {
          await prisma.clarificationExtension.create({
            data: {
              dp: item.dp,
              type: item.type,
              title: item.title,
              content: item.clarification || item.extension || '',
              whyItMatters: item.why_it_matters,
              submissionId: submission.id
            }
          });
        }
      }
    }
    
    console.log('Database population completed successfully!');
    
    // Verify the import
    const submissionCount = await prisma.submission.count();
    const dpCount = await prisma.directlyAddressedDP.count();
    const ceCount = await prisma.clarificationExtension.count();
    const userCount = await prisma.user.count();
    
    console.log(`Import verification:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Submissions: ${submissionCount}`);
    console.log(`- Directly Addressed DPs: ${dpCount}`);
    console.log(`- Clarifications/Extensions: ${ceCount}`);
    
    // Show some sample submissions with their submitters
    const sampleSubmissions = await prisma.submission.findMany({
      take: 5,
      include: {
        submitter: true
      }
    });
    
    console.log('\nSample submissions with submitters:');
    sampleSubmissions.forEach((sub, index) => {
      console.log(`${index + 1}. "${sub.title}" - By: ${sub.submitter.firstName} ${sub.submitter.lastName} (${sub.submitter.email})`);
    });
    
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateDatabase(); 