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

    // Fetch basic user activity data with error handling
    try {
      const votes = await prisma.vote.findMany({
        where: { userId: authenticatedUserId },
        select: {
          type: true,
          createdAt: true
        }
      });

      const submissions = await prisma.submission.findMany({
        where: { authorId: authenticatedUserId },
        select: {
          id: true,
          createdAt: true
        }
      });

      const comments = await prisma.comment.findMany({
        where: { authorId: authenticatedUserId },
        select: {
          id: true,
          createdAt: true,
          parentId: true
        }
      });

      // Calculate basic metrics
      const totalVotes = votes.length;
      const upvotes = votes.filter(v => v.type === 'UP').length;
      const downvotes = votes.filter(v => v.type === 'DOWN').length;
      const submissionCount = submissions.length;
      const commentCount = comments.filter(c => !c.parentId).length;
      const replyCount = comments.filter(c => c.parentId).length;

      const userActivity = {
        totalVotes,
        upvotes,
        downvotes,
        submissions: submissionCount,
        clarifications: 0,
        extensions: 0,
        comments: commentCount,
        replies: replyCount,
        thumbsUpGiven: upvotes,
        thumbsDownGiven: downvotes,
        thumbsUpReceived: 0, // Simplified for now
        commentsReceived: 0, // Simplified for now
        recentVotes: votes.slice(0, 10).map(vote => ({
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
