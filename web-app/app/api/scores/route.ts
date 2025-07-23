import { NextResponse } from 'next/server';
import ScoringService from '../../lib/scoringService';

// Mock user activity data - in a real app, this would come from a database
const mockUserActivity = {
  userId: 'user123',
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
};

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

    const scoringService = new ScoringService();
    
    // For now, using mock data - in a real app, you'd fetch user activity from database
    const userActivity = mockUserActivity;
    userActivity.userId = userId;

    const scoreBreakdown = scoringService.getScoreBreakdown(userActivity);

    return NextResponse.json({
      userId,
      scoreBreakdown,
      activity: userActivity
    });
  } catch (error) {
    console.error('Error calculating user score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate user score' },
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