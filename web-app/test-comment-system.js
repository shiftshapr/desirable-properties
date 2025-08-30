#!/usr/bin/env node

/**
 * Test script for the comment system
 * Tests comment creation, persistence, and edit/delete functionality
 */

const { PrismaClient } = require('@prisma/client');

async function testCommentSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Comment System');
    console.log('='.repeat(50));
    
    // 1. Find a test submission and user
    console.log('\n1. Setting up test data...');
    const submission = await prisma.submission.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    const daveedUser = await prisma.user.findFirst({
      where: { email: 'daveed@bridgit.io' }
    });
    
    if (!submission || !daveedUser) {
      console.log('❌ Missing test data - submission or user not found');
      return;
    }
    
    console.log(`✅ Using submission: ${submission.id}`);
    console.log(`✅ Using user: ${daveedUser.id} (${daveedUser.email})`);
    
    // 2. Test comment creation API (submission-level)
    console.log('\n2. Testing submission-level comment creation...');
    const submissionCommentData = {
      submissionId: submission.id,
      content: 'Test submission-level comment from API'
    };
    
    try {
      const response = await fetch('http://localhost:3001/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-user-123'
        },
        body: JSON.stringify(submissionCommentData)
      });
      
      const result = await response.json();
      console.log(`API Response Status: ${response.status}`);
      console.log('API Response:', result);
      
      if (response.ok) {
        console.log('✅ Submission-level comment API working');
      } else {
        console.log('❌ Submission-level comment API failed');
      }
    } catch (error) {
      console.log('❌ Error calling comment API:', error.message);
    }
    
    // 3. Test element-level comment creation
    console.log('\n3. Testing element-level comment creation...');
    const elementCommentData = {
      submissionId: submission.id,
      elementId: 'test-element-1',
      elementType: 'alignment',
      content: 'Test element-level comment from API'
    };
    
    try {
      const response = await fetch('http://localhost:3001/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-user-123'
        },
        body: JSON.stringify(elementCommentData)
      });
      
      const result = await response.json();
      console.log(`Element Comment API Response Status: ${response.status}`);
      console.log('Element Comment API Response:', result);
      
      if (response.ok) {
        console.log('✅ Element-level comment API working');
      } else {
        console.log('❌ Element-level comment API failed');
      }
    } catch (error) {
      console.log('❌ Error calling element comment API:', error.message);
    }
    
    // 4. Test comment retrieval
    console.log('\n4. Testing comment retrieval...');
    try {
      // Get submission-level comments
      const submissionCommentsResponse = await fetch(
        `http://localhost:3001/api/comments?submissionId=${submission.id}`
      );
      const submissionComments = await submissionCommentsResponse.json();
      console.log(`✅ Retrieved ${submissionComments.length} submission-level comments`);
      
      // Get element-level comments
      const elementCommentsResponse = await fetch(
        `http://localhost:3001/api/comments?submissionId=${submission.id}&elementId=test-element-1&elementType=alignment`
      );
      const elementComments = await elementCommentsResponse.json();
      console.log(`✅ Retrieved ${elementComments.length} element-level comments`);
      
    } catch (error) {
      console.log('❌ Error retrieving comments:', error.message);
    }
    
    // 5. Test direct database comment creation
    console.log('\n5. Testing direct database comment creation...');
    
    // Clean up any existing test comments
    await prisma.comment.deleteMany({
      where: {
        authorId: daveedUser.id,
        submissionId: submission.id,
        content: { startsWith: 'Test comment from database' }
      }
    });
    
    // Create submission-level comment
    const submissionComment = await prisma.comment.create({
      data: {
        content: 'Test comment from database - submission level',
        authorId: daveedUser.id,
        submissionId: submission.id,
        elementId: null,
        elementType: null
      }
    });
    
    console.log('✅ Submission-level comment created:', {
      id: submissionComment.id,
      content: submissionComment.content,
      elementId: submissionComment.elementId,
      elementType: submissionComment.elementType
    });
    
    // Create element-level comment
    const elementComment = await prisma.comment.create({
      data: {
        content: 'Test comment from database - element level',
        authorId: daveedUser.id,
        submissionId: submission.id,
        elementId: 'test-element-2',
        elementType: 'clarification'
      }
    });
    
    console.log('✅ Element-level comment created:', {
      id: elementComment.id,
      content: elementComment.content,
      elementId: elementComment.elementId,
      elementType: elementComment.elementType
    });
    
    // 6. Test comment counting
    console.log('\n6. Testing comment counting...');
    const submissionCommentCount = await prisma.comment.count({
      where: {
        submissionId: submission.id,
        elementId: null,
        elementType: null
      }
    });
    
    const elementCommentCount = await prisma.comment.count({
      where: {
        submissionId: submission.id,
        elementId: 'test-element-2',
        elementType: 'clarification'
      }
    });
    
    console.log(`✅ Comment counts - Submission: ${submissionCommentCount}, Element: ${elementCommentCount}`);
    
    // 7. Test comment edit/delete API
    console.log('\n7. Testing comment edit API...');
    try {
      const editResponse = await fetch(`http://localhost:3001/api/comments/${submissionComment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-user-123'
        },
        body: JSON.stringify({
          content: 'Updated test comment from API'
        })
      });
      
      const editResult = await editResponse.json();
      console.log(`Edit API Response Status: ${editResponse.status}`);
      console.log('Edit API Response:', editResult);
      
      if (editResponse.ok) {
        console.log('✅ Comment edit API working');
      } else {
        console.log('❌ Comment edit API failed');
      }
    } catch (error) {
      console.log('❌ Error testing comment edit:', error.message);
    }
    
    // 8. Clean up
    console.log('\n8. Cleaning up test data...');
    await prisma.comment.deleteMany({
      where: {
        authorId: daveedUser.id,
        submissionId: submission.id,
        content: { contains: 'Test' }
      }
    });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Comment system test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCommentSystem();




