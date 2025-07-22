import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

export async function POST(request: NextRequest) {
  try {
    // Debug: Log environment variables
    console.log('Environment variables:', {
      PRIVY_APP_ID: process.env.PRIVY_APP_ID,
      PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET ? '***' : 'undefined',
      NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    });

    const body = await request.json();
    const { elementId, elementType, submissionId, vote } = body;

    // Verify the request is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token received:', token.substring(0, 20) + '...');
    
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

    // TODO: Implement actual vote storage
    // For now, we'll just return success
    // In a real implementation, you would:
    // 1. Check if user already voted on this element
    // 2. Update or create vote record
    // 3. Update vote counts
    // 4. Store in database

    console.log('Vote received:', {
      userId,
      elementId,
      elementType,
      submissionId,
      vote,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Vote recorded successfully'
    });

  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');
    const submissionId = searchParams.get('submissionId');

    if (!elementId || !elementType || !submissionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // TODO: Implement actual vote retrieval
    // For now, return mock data
    const mockVotes = {
      upvotes: Math.floor(Math.random() * 50),
      downvotes: Math.floor(Math.random() * 20),
      userVote: null, // TODO: Get actual user vote
    };

    return NextResponse.json(mockVotes);

  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 