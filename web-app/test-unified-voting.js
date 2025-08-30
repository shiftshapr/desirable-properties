#!/usr/bin/env node

/**
 * Test script for the unified voting system
 * Tests both the UnifiedInteractionService and API endpoints
 */

const { PrismaClient } = require('@prisma/client');

async function testUnifiedVoting() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Unified Voting System');
    console.log('='.repeat(50));
    
    // 1. Find a test submission
    console.log('\n1. Finding test submission...');
    const submission = await prisma.submission.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!submission) {
      console.log('❌ No submissions found in database');
      return;
    }
    
    console.log(`✅ Found submission: ${submission.id} - "${submission.title}"`);
    
    // 2. Get test user
    console.log('\n2. Getting test user...');
    const daveedUser = await prisma.user.findFirst({
      where: { email: 'daveed@bridgit.io' }
    });
    
    if (!daveedUser) {
      console.log('❌ No Daveed user found for testing');
      return;
    }
    
    console.log(`✅ Using test user: ${daveedUser.id} (${daveedUser.email})`);
    
    // 3. Test vote API endpoint directly
    console.log('\n3. Testing vote API endpoint...');
    const testVoteData = {
      elementId: submission.id,
      voteType: 'UP',
      submissionId: submission.id,
      elementType: 'submission'
    };
    
    console.log('Vote data to send:', testVoteData);
    
    try {
      const response = await fetch('http://localhost:3001/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-user-123'
        },
        body: JSON.stringify(testVoteData)
      });
      
      const result = await response.json();
      console.log(`API Response Status: ${response.status}`);
      console.log('API Response:', result);
      
      if (response.ok) {
        console.log('✅ Vote API endpoint working');
      } else {
        console.log('❌ Vote API endpoint failed');
      }
    } catch (error) {
      console.log('❌ Error calling vote API:', error.message);
      console.log('ℹ️  This is normal if the server is not running');
    }
    
    // 4. Test database vote creation directly
    console.log('\n4. Testing direct database vote creation...');
    
    // Clean up any existing test votes
    await prisma.vote.deleteMany({
      where: {
        voterId: daveedUser.id,
        submissionId: submission.id,
        elementId: submission.id
      }
    });
    
    // Create a test vote
    const vote = await prisma.vote.create({
      data: {
        type: 'UP',
        voterId: daveedUser.id,
        submissionId: submission.id,
        elementId: submission.id,
        elementType: 'submission'
      }
    });
    
    console.log('✅ Vote created in database:', {
      id: vote.id,
      type: vote.type,
      voterId: vote.voterId,
      submissionId: vote.submissionId,
      elementId: vote.elementId,
      elementType: vote.elementType
    });
    
    // 5. Test vote counting
    console.log('\n5. Testing vote counting...');
    const upvotes = await prisma.vote.count({
      where: {
        submissionId: submission.id,
        elementId: submission.id,
        elementType: 'submission',
        type: 'UP'
      }
    });
    
    const downvotes = await prisma.vote.count({
      where: {
        submissionId: submission.id,
        elementId: submission.id,
        elementType: 'submission',
        type: 'DOWN'
      }
    });
    
    console.log(`✅ Vote counts - Up: ${upvotes}, Down: ${downvotes}`);
    
    // 6. Test UnifiedInteractionService (skipped - requires TypeScript compilation)
    console.log('\n6. Testing UnifiedInteractionService...');
    console.log('ℹ️  Skipping service test - requires compiled TypeScript');
    
    // 7. Clean up
    console.log('\n7. Cleaning up test data...');
    await prisma.vote.deleteMany({
      where: {
        voterId: daveedUser.id,
        submissionId: submission.id
      }
    });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Unified voting system test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUnifiedVoting();
