import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
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

    // Fetch comprehensive user data with the same logic as scores API
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
            select: { id: true, type: true, createdAt: true }
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
      const totalVotes = user.votes.length;

      const userActivity = {
        totalVotes,
        upvotes: thumbsUpGiven,
        downvotes: thumbsDownGiven,
        submissions: submissionsCount,
        clarifications: 0,
        extensions: 0,
        comments: commentsCount,
        replies: 0, // TODO: Add replies count when available
        thumbsUpGiven: thumbsUpGiven,
        thumbsDownGiven: thumbsDownGiven,
        thumbsUpReceived: submissionsVotesReceived + commentsVotesReceived,
        commentsReceived: submissionsCommentsReceived,
        recentVotes: user.votes.slice(0, 10).map(vote => ({
          id: vote.createdAt.getTime().toString(),
          userId: authenticatedUserId,
          submissionId: null,
          elementType: 'vote',
          elementId: vote.createdAt.getTime().toString(),
          vote: vote.type.toLowerCase() as 'up' | 'down',
          createdAt: vote.createdAt.toISOString()
        }))
      };

      return NextResponse.json(userActivity);
    } catch (dbError) {
      console.error('Database error in user-activity API:', dbError);
      // Return fallback data if database fails
      return NextResponse.json({
        totalVotes: 0,
        upvotes: 0,
        downvotes: 0,
        submissions: 0,
        clarifications: 0,
        extensions: 0,
        comments: 0,
        replies: 0,
        thumbsUpGiven: 0,
        thumbsDownGiven: 0,
        thumbsUpReceived: 0,
        commentsReceived: 0,
        recentVotes: []
      });
    }

  } catch (error) {
    console.error('Error fetching user activity:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: authenticatedUserId
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
