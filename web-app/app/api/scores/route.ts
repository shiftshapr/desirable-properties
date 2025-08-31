import { NextResponse } from 'next/server';
import ScoringService from '@/app/lib/scoringService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Map test tokens to actual user IDs
    let authenticatedUserId;
    if (token === 'test-user-123') {
      // Use Daveed's user for testing
      const { prisma } = await import('@/lib/db');
      const testUser = await prisma.user.findFirst({
        where: { email: 'daveed@bridgit.io' }
      });
      authenticatedUserId = testUser?.id;
    } else {
      authenticatedUserId = token;
    }

    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    // Simple test response
    return NextResponse.json({
      userId: authenticatedUserId,
      message: "Scores API working",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating user score:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: authenticatedUserId
    });
    return NextResponse.json(
      { error: 'Failed to calculate user score', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Endpoint to reload scoring configuration
export async function POST() {
  try {
    const scoringService = new ScoringService();
    scoringService.reloadConfig();
    
    return NextResponse.json({
      success: true,
      message: 'Scoring configuration reloaded successfully'
    });
  } catch (error) {
    console.error('Error reloading scoring config:', error);
    return NextResponse.json(
      { error: 'Failed to reload scoring configuration' },
      { status: 500 }
    );
  }
} 