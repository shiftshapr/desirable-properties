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

    // Fetch user's votes
    const votes = await prisma.vote.findMany({
      where: { userId: authenticatedUserId },
      select: {
        type: true,
        createdAt: true,
        submissionId: true,
        elementType: true,
        elementId: true
      }
    });

    // Fetch user's submissions
    const submissions = await prisma.submission.findMany({
      where: { authorId: authenticatedUserId },
      select: {
        id: true,
        createdAt: true
      }
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

    // Calculate activity metrics
    const totalVotes = votes.length;
    const upvotes = votes.filter(v => v.type === 'UP').length;
    const downvotes = votes.filter(v => v.type === 'DOWN').length;
    
    const submissionCount = submissions.length;
    const commentCount = comments.filter(c => !c.parentId).length; // Top-level comments
    const replyCount = comments.filter(c => c.parentId).length; // Replies

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

    // Get votes given by user
    const thumbsUpGiven = upvotes;
    const thumbsDownGiven = downvotes;

    const userActivity = {
      totalVotes,
      upvotes,
      downvotes,
      submissions: submissionCount,
      clarifications: 0, // TODO: Implement when clarification system is added
      extensions: 0, // TODO: Implement when extension system is added
      comments: commentCount,
      replies: replyCount,
      thumbsUpGiven,
      thumbsDownGiven,
      thumbsUpReceived,
      commentsReceived,
      recentVotes: votes.slice(0, 10).map(vote => ({
        id: vote.elementId,
        userId: authenticatedUserId,
        submissionId: vote.submissionId,
        elementType: vote.elementType,
        elementId: vote.elementId,
        vote: vote.type.toLowerCase() as 'up' | 'down',
        createdAt: vote.createdAt.toISOString()
      }))
    };

    return NextResponse.json(userActivity);

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
