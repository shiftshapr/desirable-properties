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

    // Fetch basic user data
    const votes = await prisma.vote.findMany({
      where: { userId: authenticatedUserId },
      select: { type: true }
    });

    const submissions = await prisma.submission.findMany({
      where: { authorId: authenticatedUserId },
      select: { id: true, createdAt: true }
    });

    const comments = await prisma.comment.findMany({
      where: { authorId: authenticatedUserId },
      select: { id: true, parentId: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: { signupDate: true, lastActivity: true }
    });

    // Calculate basic metrics
    const submissionCount = submissions.length;
    const commentCount = comments.filter(c => !c.parentId).length;
    const replyCount = comments.filter(c => c.parentId).length;
    const thumbsUpGiven = votes.filter(v => v.type === 'UP').length;
    const thumbsDownGiven = votes.filter(v => v.type === 'DOWN').length;

    // Create user activity data
    const userActivity = {
      userId: authenticatedUserId,
      submissions: submissionCount,
      comments: commentCount,
      replies: replyCount,
      thumbsupGiven: thumbsUpGiven,
      thumbsdownGiven: thumbsDownGiven,
      thumbsupReceived: 0, // Simplified for now
      commentsReceived: 0, // Simplified for now
      repliesReceived: 0,
      signupDate: user?.signupDate?.toISOString() || new Date().toISOString(),
      firstSubmissionDate: submissions.length > 0 ? submissions[0].createdAt.toISOString() : undefined,
      lastActivityDate: user?.lastActivity?.toISOString() || new Date().toISOString()
    };

    // Simple score calculation for now
    const totalScore = submissionCount * 10 + commentCount * 2 + thumbsUpGiven * 1;
    
    return NextResponse.json({
      userId: authenticatedUserId,
      scoreBreakdown: {
        total: totalScore,
        submissions: submissionCount * 10,
        comments: commentCount * 2,
        engagement: thumbsUpGiven * 1
      },
      activity: userActivity
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