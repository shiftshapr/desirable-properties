import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

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
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

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