'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, User, Activity, Trophy } from 'lucide-react';
import Link from 'next/link';
import ScoreDisplay from '../components/ScoreDisplay';

interface Vote {
  id: string;
  userId: string;
  submissionId: string;
  elementType: 'submission' | 'alignment' | 'clarification' | 'extension';
  elementId: string;
  vote: 'up' | 'down';
  createdAt: string;
}

interface UserActivity {
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  submissions: number;
  clarifications: number;
  extensions: number;
  recentVotes: Vote[];
}

export default function ProfilePage() {
  const { user, login, logout, authenticated, ready } = usePrivy();
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authenticated && user) {
      fetchUserActivity();
      fetchUserRank();
    }
  }, [authenticated, user]);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const mockActivity: UserActivity = {
        totalVotes: 42,
        upvotes: 35,
        downvotes: 7,
        submissions: 3,
        clarifications: 8,
        extensions: 5,
        recentVotes: [
          {
            id: '1',
            userId: user?.id || '',
            submissionId: 'submission-1',
            elementType: 'submission',
            elementId: 'submission-1',
            vote: 'up',
            createdAt: new Date().toISOString(),
          },
          // Add more mock votes...
        ],
      };
      setUserActivity(mockActivity);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        const currentUser = Array.isArray(data.leaderboard) ? data.leaderboard.find((entry: { userId: string; email: string }) => 
          entry.userId === user?.id || entry.email === user?.email?.address
        ) : null;
        setUserRank(currentUser?.rank || null);
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Welcome to Meta-Layer</h1>
          <p className="text-gray-300 mb-8">Sign in to view your profile and activity</p>
          <button
            onClick={login}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
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
              {ready && (
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
                <User className="h-6 w-6 text-cyan-400" />
                <h1 className="text-xl font-bold text-white">Profile</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Display */}
          <div className="lg:col-span-1">
            <ScoreDisplay userId={user?.id || 'default-user'} />
          </div>
          
          {/* Rank Display */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Your Rank</h2>
              </div>
              
              {userRank ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">
                    #{userRank}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">Current Rank</div>
                  <Link 
                    href="/leaderboard" 
                    className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    View Leaderboard
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-gray-400 mb-4">Not ranked yet</div>
                  <Link 
                    href="/leaderboard" 
                    className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    View Leaderboard
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Profile Stats */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Your Activity</h2>
              
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-700 rounded"></div>
                </div>
              ) : userActivity ? (
                <div className="space-y-6">
                  {/* Total Votes */}
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-6 w-6 text-cyan-400" />
                      <span className="text-gray-300">Total Votes</span>
                    </div>
                    <span className="text-2xl font-bold text-white">{userActivity.totalVotes}</span>
                  </div>

                  {/* Upvotes */}
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <ThumbsUp className="h-6 w-6 text-green-400" />
                      <span className="text-gray-300">Upvotes</span>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{userActivity.upvotes}</span>
                  </div>

                  {/* Downvotes */}
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <ThumbsDown className="h-6 w-6 text-red-400" />
                      <span className="text-gray-300">Downvotes</span>
                    </div>
                    <span className="text-2xl font-bold text-red-400">{userActivity.downvotes}</span>
                  </div>

                  {/* Contributions */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white mb-3">Contributions</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Submissions</span>
                        <span className="text-white font-medium">{userActivity.submissions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Clarifications</span>
                        <span className="text-white font-medium">{userActivity.clarifications}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Extensions</span>
                        <span className="text-white font-medium">{userActivity.extensions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No activity data available
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
              
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {Array.isArray([...Array(5)]) ? [...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-700 rounded"></div>
                  )) : null}
                </div>
              ) : userActivity?.recentVotes && userActivity.recentVotes.length > 0 ? (
                <div className="space-y-4">
                  {Array.isArray(userActivity.recentVotes) ? userActivity.recentVotes.map((vote) => (
                    <div key={vote.id} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        vote.vote === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {vote.vote === 'up' ? (
                          <ThumbsUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {vote.vote === 'up' ? 'Upvoted' : 'Downvoted'} a {vote.elementType}
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(vote.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )) : null}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 