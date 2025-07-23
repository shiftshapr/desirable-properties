import { NextResponse } from 'next/server';
import ScoringService from '../../lib/scoringService';

// Mock leaderboard data - in a real app, this would come from a database
const mockLeaderboardData = [
  {
    userId: 'user1',
    userName: 'Alice Johnson',
    email: 'alice@example.com',
    submissions: 5,
    comments: 25,
    replies: 12,
    thumbsupGiven: 89,
    thumbsdownGiven: 15,
    thumbsupReceived: 156,
    commentsReceived: 45,
    repliesReceived: 23,
    signupDate: '2024-01-10T00:00:00Z',
    firstSubmissionDate: '2024-01-11T00:00:00Z',
    lastActivityDate: '2024-01-25T00:00:00Z'
  },
  {
    userId: 'user2',
    userName: 'Bob Smith',
    email: 'bob@example.com',
    submissions: 3,
    comments: 18,
    replies: 8,
    thumbsupGiven: 67,
    thumbsdownGiven: 12,
    thumbsupReceived: 98,
    commentsReceived: 32,
    repliesReceived: 15,
    signupDate: '2024-01-12T00:00:00Z',
    firstSubmissionDate: '2024-01-13T00:00:00Z',
    lastActivityDate: '2024-01-24T00:00:00Z'
  },
  {
    userId: 'user3',
    userName: 'Carol Davis',
    email: 'carol@example.com',
    submissions: 2,
    comments: 15,
    replies: 8,
    thumbsupGiven: 45,
    thumbsdownGiven: 12,
    thumbsupReceived: 67,
    commentsReceived: 23,
    repliesReceived: 12,
    signupDate: '2024-01-15T00:00:00Z',
    firstSubmissionDate: '2024-01-16T00:00:00Z',
    lastActivityDate: '2024-01-25T00:00:00Z'
  },
  {
    userId: 'user4',
    userName: 'David Wilson',
    email: 'david@example.com',
    submissions: 1,
    comments: 8,
    replies: 3,
    thumbsupGiven: 23,
    thumbsdownGiven: 5,
    thumbsupReceived: 34,
    commentsReceived: 12,
    repliesReceived: 6,
    signupDate: '2024-01-18T00:00:00Z',
    firstSubmissionDate: '2024-01-19T00:00:00Z',
    lastActivityDate: '2024-01-23T00:00:00Z'
  },
  {
    userId: 'user5',
    userName: 'Eva Brown',
    email: 'eva@example.com',
    submissions: 0,
    comments: 5,
    replies: 2,
    thumbsupGiven: 15,
    thumbsdownGiven: 3,
    thumbsupReceived: 12,
    commentsReceived: 4,
    repliesReceived: 2,
    signupDate: '2024-01-20T00:00:00Z',
    lastActivityDate: '2024-01-22T00:00:00Z'
  }
];

export async function GET() {
  try {
    const scoringService = new ScoringService();
    
    // Calculate scores for all users
    const leaderboard = mockLeaderboardData.map((userActivity, index) => {
      const scoreBreakdown = scoringService.getScoreBreakdown(userActivity);
      return {
        rank: index + 1,
        userId: userActivity.userId,
        userName: userActivity.userName,
        email: userActivity.email,
        totalScore: scoreBreakdown.total,
        scoreBreakdown,
        activity: userActivity
      };
    });

    // Sort by total score (descending)
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    // Update ranks after sorting
    leaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    return NextResponse.json({
      leaderboard,
      totalUsers: leaderboard.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
} 