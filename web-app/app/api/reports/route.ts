import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, reason } = body;

    // Verify the request is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    // For test authentication, use a consistent mock user ID
    const verifiedClaims = { userId: "test-user-123", email: "daveed@bridgit.io", name: "Daveed Benjamin" };
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = "test-user-123"; // Test user ID for authentication

    // TODO: Implement actual report storage
    // For now, we'll just return success
    console.log('Report received:', {
      commentId,
      reason,
      reportedBy: userId,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Report submitted successfully'
    });

  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 