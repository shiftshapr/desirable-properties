import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    console.log('Leaderboard API called');
    
    // Test basic database connection
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Get all users with their activity and received interactions
    const users = await prisma.user.findMany({
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
      },
      orderBy: { lastActivity: 'desc' }
    });
    
    console.log('Found users:', users.length);
    
    // Calculate received interactions for each user
    const usersWithReceivedInteractions = await Promise.all(
      users.map(async (user) => {
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

        // Replies not implemented yet in the schema
        const repliesReceived = 0;

        // Get votes received on user's comments
        const commentsVotesReceived = await prisma.vote.count({
          where: {
            commentId: {
              in: user.comments.map(c => c.id)
            },
            type: 'UP'
          }
        });

        return {
          ...user,
          submissionsVotesReceived,
          submissionsCommentsReceived,
          repliesReceived,
          commentsVotesReceived
        };
      })
    );
    
    // Create leaderboard with proper scoring
    const leaderboard = usersWithReceivedInteractions.map((user, index) => {
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
      const receivedPoints = user.submissionsVotesReceived + user.submissionsCommentsReceived + 
                           user.repliesReceived + user.commentsVotesReceived;
      
      // Create display name without email
      const displayName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || 'Anonymous';
      
      return {
        rank: index + 1,
        userId: user.id,
        userName: displayName,
        totalScore: submissionPoints + engagementPoints + receivedPoints,
        scoreBreakdown: {
          contribution: submissionPoints,
          engagement: engagementPoints,
          received: receivedPoints
        },
        activity: {
          userId: user.id,
          userName: displayName,
          submissions: submissionsCount,
          comments: commentsCount,
          replies: 0, // TODO: Add replies count when available
          thumbsupGiven: thumbsUpGiven,
          thumbsdownGiven: thumbsDownGiven,
          thumbsupReceived: user.submissionsVotesReceived + user.commentsVotesReceived,
          thumbsdownReceived: 0, // TODO: Add downvotes received
          commentsReceived: user.submissionsCommentsReceived,
          repliesReceived: user.repliesReceived,
          signupDate: user.signupDate.toISOString(),
          firstSubmissionDate: user.submissions.length > 0 ? user.submissions[0].createdAt.toISOString() : undefined,
          lastActivityDate: user.lastActivity.toISOString()
        }
      };
    });

    // Filter out users with no activity (no submissions, no comments, no votes)
    const activeUsers = leaderboard.filter(user => 
      user.activity.submissions > 0 || 
      user.activity.comments > 0 || 
      user.activity.thumbsupGiven > 0 ||
      user.activity.thumbsupReceived > 0
    );

    // Sort by total score (descending)
    activeUsers.sort((a, b) => b.totalScore - a.totalScore);

    // Limit to top 10
    const topUsers = activeUsers.slice(0, 10);

    // Update ranks after sorting
    topUsers.forEach((user, index) => {
      user.rank = index + 1;
    });

    console.log('Returning leaderboard with', topUsers.length, 'active users');

    return NextResponse.json({
      leaderboard: topUsers,
      totalUsers: topUsers.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: String(error) },
      { status: 500 }
    );
  }
} 