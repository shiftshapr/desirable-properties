import fetch from 'node-fetch';

async function testEditDelete() {
  const baseUrl = 'https://app.themetalayer.org';
  const commentId = 'cmeyj2s3i0009h25re1fnncvs'; // Recent comment by Daveed
  const token = 'test-user-123';

  console.log('Testing comment edit/delete functionality...');
  console.log('Comment ID:', commentId);
  console.log('Token:', token);

  // Test edit
  console.log('\n=== Testing EDIT ===');
  try {
    const editResponse = await fetch(`${baseUrl}/api/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: 'Updated comment from test script'
      })
    });

    console.log('Edit response status:', editResponse.status);
    console.log('Edit response ok:', editResponse.ok);
    
    if (editResponse.ok) {
      const result = await editResponse.json();
      console.log('Edit success:', result);
    } else {
      const errorText = await editResponse.text();
      console.log('Edit error:', errorText);
    }
  } catch (error) {
    console.error('Edit request failed:', error);
  }

  // Test delete
  console.log('\n=== Testing DELETE ===');
  try {
    const deleteResponse = await fetch(`${baseUrl}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Delete response status:', deleteResponse.status);
    console.log('Delete response ok:', deleteResponse.ok);
    
    if (deleteResponse.ok) {
      const result = await deleteResponse.json();
      console.log('Delete success:', result);
    } else {
      const errorText = await deleteResponse.text();
      console.log('Delete error:', errorText);
    }
  } catch (error) {
    console.error('Delete request failed:', error);
  }
}

testEditDelete();
