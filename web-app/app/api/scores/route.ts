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

    // Fetch comprehensive user data with the same logic as leaderboard
    try {
      const user = await prisma.user.findUnique({
        where: { id: authenticatedUserId },
        include: {
          submissions: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' }
          },
          comments: {
            select: { id: true }
          },
          votes: {
            select: { id: true, type: true }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get votes received on user's submissions
      const submissionsVotesReceived = await prisma.vote.count({
        where: {
          submissionId: {
            in: user.submissions.map(s => s.id)
          },
          type: 'UP'
        }
      });

      // Get comments received on user's submissions
      const submissionsCommentsReceived = await prisma.comment.count({
        where: {
          submissionId: {
            in: user.submissions.map(s => s.id)
          }
        }
      });

      // Get votes received on user's comments
      const commentsVotesReceived = await prisma.vote.count({
        where: {
          commentId: {
            in: user.comments.map(c => c.id)
          },
          type: 'UP'
        }
      });

      // Calculate metrics
      const submissionsCount = user.submissions.length;
      const commentsCount = user.comments.length;
      const thumbsUpGiven = user.votes.filter((v: any) => v.type === 'UP').length;
      const thumbsDownGiven = user.votes.filter((v: any) => v.type === 'DOWN').length;
      
      // Calculate submission points: 10 for first, 1 for each subsequent
      const submissionPoints = submissionsCount > 0 ? 10 + (submissionsCount - 1) : 0;
      
      // Calculate engagement points
      const dailyThumbsupLimit = Math.min(thumbsUpGiven, 20); // Daily limit
      const engagementPoints = (dailyThumbsupLimit * 1) + (commentsCount * 2);
      
      // Calculate received interaction points
      const receivedPoints = submissionsVotesReceived + submissionsCommentsReceived + commentsVotesReceived;
      
      const totalScore = submissionPoints + engagementPoints + receivedPoints;

      // Create user activity data
      const userActivity = {
        userId: authenticatedUserId,
        submissions: submissionsCount,
        comments: commentsCount,
        replies: 0, // TODO: Add replies count when available
        thumbsupGiven: thumbsUpGiven,
        thumbsdownGiven: thumbsDownGiven,
        thumbsupReceived: submissionsVotesReceived + commentsVotesReceived,
        commentsReceived: submissionsCommentsReceived,
        repliesReceived: 0,
        signupDate: user.signupDate?.toISOString() || new Date().toISOString(),
        firstSubmissionDate: user.submissions.length > 0 ? user.submissions[0].createdAt.toISOString() : undefined,
        lastActivityDate: user.lastActivity?.toISOString() || new Date().toISOString()
      };
      
      return NextResponse.json({
        userId: authenticatedUserId,
        scoreBreakdown: {
          total: totalScore,
          contribution: submissionPoints,
          engagement: engagementPoints,
          received: receivedPoints
        },
        activity: userActivity
      });
    } catch (dbError) {
      console.error('Database error in scores API:', dbError);
      // Return fallback data if database fails
      return NextResponse.json({
        userId: authenticatedUserId,
        scoreBreakdown: {
          total: 0,
          submissions: 0,
          comments: 0,
          engagement: 0
        },
        activity: {
          userId: authenticatedUserId,
          submissions: 0,
          comments: 0,
          replies: 0,
          thumbsupGiven: 0,
          thumbsdownGiven: 0,
          thumbsupReceived: 0,
          commentsReceived: 0,
          repliesReceived: 0,
          signupDate: new Date().toISOString(),
          lastActivityDate: new Date().toISOString()
        }
      });
    }
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