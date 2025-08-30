'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Star, Award } from 'lucide-react';

interface ScoreBreakdown {
  contribution: number;
  engagement: number;
  bonus: number;
  total: number;
}

interface UserActivity {
  userId: string;
  submissions: number;
  comments: number;
  replies: number;
  thumbsupGiven: number;
  thumbsdownGiven: number;
  thumbsupReceived: number;
  commentsReceived: number;
  repliesReceived: number;
  signupDate: string;
  firstSubmissionDate?: string;
  lastActivityDate: string;
}

interface ScoreDisplayProps {
  userId: string;
  accessToken?: string;
}

export default function ScoreDisplay({ userId, accessToken }: ScoreDisplayProps) {
  const [scoreData, setScoreData] = useState<{
    scoreBreakdown: ScoreBreakdown;
    activity: UserActivity;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/scores?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken || 'test-user-123'}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch score data');
        }
        
        const data = await response.json();
        setScoreData(data);
      } catch (error) {
        console.error('Error fetching score:', error);
        setError('Failed to load score data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchScore();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!scoreData) {
    return null;
  }

  const { scoreBreakdown, activity } = scoreData;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">Your Score</h2>
      </div>

      {/* Total Score */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-yellow-400 mb-2">
          {scoreBreakdown.total}
        </div>
        <div className="text-sm text-gray-400">Total Points</div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">Contribution</span>
          </div>
          <span className="text-blue-400 font-bold">{scoreBreakdown.contribution}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-green-400" />
            <span className="text-white font-medium">Engagement</span>
          </div>
          <span className="text-green-400 font-bold">{scoreBreakdown.engagement}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-400" />
            <span className="text-white font-medium">Bonus</span>
          </div>
          <span className="text-purple-400 font-bold">{scoreBreakdown.bonus}</span>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Activity Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Submissions:</span>
            <span className="text-white">{activity.submissions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Comments:</span>
            <span className="text-white">{activity.comments}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Replies:</span>
            <span className="text-white">{activity.replies}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Thumbs up given:</span>
            <span className="text-white">{activity.thumbsupGiven}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Thumbs up received:</span>
            <span className="text-white">{activity.thumbsupReceived}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Comments received:</span>
            <span className="text-white">{activity.commentsReceived}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 