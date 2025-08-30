#!/usr/bin/env node

/**
 * Test script to simulate a vote workflow and see what logs are generated
 */

async function testVoteWorkflow() {
  console.log('🧪 Testing Vote Workflow');
  console.log('='.repeat(50));
  
  // Wait for server to start
  console.log('Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Test voting on a submission
    console.log('\n🎯 Testing submission vote...');
    const response = await fetch('http://localhost:3000/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-user-123'
      },
      body: JSON.stringify({
        elementId: 'cme65z5to00s1h2vv7vnempsx',
        voteType: 'UP',
        submissionId: 'cme65z5to00s1h2vv7vnempsx',
        elementType: 'submission'
      })
    });
    
    console.log(`Vote API Response: ${response.status}`);
    const result = await response.json();
    console.log('Vote API Result:', result);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVoteWorkflow();




