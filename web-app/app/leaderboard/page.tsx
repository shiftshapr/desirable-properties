'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface ScoreBreakdown {
  contribution: number;
  engagement: number;
  bonus: number;
  total: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  email: string;
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  activity: {
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
  };
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalUsers: number;
  lastUpdated: string;
}

export default function LeaderboardPage() {
  const privy = usePrivy();
  const { user, login, logout, authenticated, ready } = privy || {};
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        setLeaderboardData(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-500/10 border-gray-500/30';
    if (rank === 3) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-gray-700/50 border-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo on the left */}
            <Link href="/" className="flex items-center">
              <img 
                src="/mli_logo_white.png" 
                alt="Meta-Layer Initiative" 
                className="h-6 w-auto"
              />
            </Link>
            
            {/* Navigation items on the right */}
            <div className="flex items-center gap-4">
              {privy && ready && (
                <>
                  <Link 
                    href="/leaderboard" 
                    className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm hidden sm:inline">Leaderboard</span>
                  </Link>
                  {authenticated ? (
                    <>
                      <Link 
                        href="/profile" 
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm hidden sm:inline">
                          {user?.email?.address || user?.wallet?.address || 'Profile'}
                        </span>
                      </Link>
                      <button
                        onClick={logout}
                        className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={login}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign In
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <h1 className="text-xl font-bold text-white">Leaderboard</h1>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Last updated: {leaderboardData?.lastUpdated ? new Date(leaderboardData.lastUpdated).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>
      </header>

      {/* Leaderboard Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
                <span className="text-white font-medium">Total Participants</span>
              </div>
              <span className="text-2xl font-bold text-cyan-400">{leaderboardData?.totalUsers || 0}</span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          {leaderboardData?.leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`bg-gray-800 rounded-lg p-6 border ${getRankColor(entry.rank)} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{entry.userName}</h3>
                      <span className="text-sm text-gray-400">({entry.email})</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-400">
                        {entry.activity.submissions} submissions
                      </span>
                      <span className="text-gray-400">
                        {entry.activity.comments} comments
                      </span>
                      <span className="text-gray-400">
                        {entry.activity.thumbsupReceived} thumbs up
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    {entry.totalScore}
                  </div>
                  <div className="text-sm text-gray-400">points</div>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-blue-400">C: {entry.scoreBreakdown.contribution}</span>
                    <span className="text-green-400">E: {entry.scoreBreakdown.engagement}</span>
                    <span className="text-purple-400">B: {entry.scoreBreakdown.bonus}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {leaderboardData?.leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No participants yet</h3>
            <p className="text-gray-500">Be the first to start earning points!</p>
          </div>
        )}
      </div>
    </div>
  );
} 