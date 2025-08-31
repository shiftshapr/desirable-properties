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

    // Fetch user's submissions
    const submissions = await prisma.submission.findMany({
      where: { authorId: authenticatedUserId },
      select: {
        id: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Fetch user's comments
    const comments = await prisma.comment.findMany({
      where: { authorId: authenticatedUserId },
      select: {
        id: true,
        createdAt: true,
        parentId: true
      }
    });

    // Fetch user's votes
    const votes = await prisma.vote.findMany({
      where: { userId: authenticatedUserId },
      select: {
        type: true
      }
    });

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: {
        signupDate: true,
        lastActivity: true
      }
    });

    // Calculate activity metrics
    const submissionCount = submissions.length;
    const commentCount = comments.filter(c => !c.parentId).length; // Top-level comments
    const replyCount = comments.filter(c => c.parentId).length; // Replies
    
    const thumbsUpGiven = votes.filter(v => v.type === 'UP').length;
    const thumbsDownGiven = votes.filter(v => v.type === 'DOWN').length;

    // Get votes received on user's content
    const userSubmissionIds = submissions.map(s => s.id);
    const userCommentIds = comments.map(c => c.id);
    
    const votesReceived = await prisma.vote.findMany({
      where: {
        OR: [
          { submissionId: { in: userSubmissionIds } },
          { elementId: { in: userCommentIds }, elementType: 'comment' }
        ]
      },
      select: {
        type: true
      }
    });

    const thumbsUpReceived = votesReceived.filter(v => v.type === 'UP').length;
    const commentsReceived = await prisma.comment.count({
      where: {
        OR: [
          { submissionId: { in: userSubmissionIds } },
          { parentId: { in: userCommentIds } }
        ]
      }
    });

    // Create real user activity data
    const userActivity = {
      userId: authenticatedUserId,
      submissions: submissionCount,
      comments: commentCount,
      replies: replyCount,
      thumbsupGiven: thumbsUpGiven,
      thumbsdownGiven: thumbsDownGiven,
      thumbsupReceived: thumbsUpReceived,
      commentsReceived: commentsReceived,
      repliesReceived: 0, // TODO: Implement when reply system is enhanced
      signupDate: user?.signupDate?.toISOString() || new Date().toISOString(),
      firstSubmissionDate: submissions.length > 0 ? submissions[0].createdAt.toISOString() : undefined,
      lastActivityDate: user?.lastActivity?.toISOString() || new Date().toISOString()
    };

    const scoringService = new ScoringService();
    const scoreBreakdown = scoringService.getScoreBreakdown(userActivity);

    return NextResponse.json({
      userId: authenticatedUserId,
      scoreBreakdown,
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