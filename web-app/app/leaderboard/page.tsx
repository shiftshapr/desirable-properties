'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Users, FileText, X, MessageCircle, ThumbsUp, User } from 'lucide-react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import VoteButtons from '../components/VoteButtons';
import CommentSection from '../components/CommentSection';

interface ScoreBreakdown {
  contribution: number;
  engagement: number;
  received: number;
  total: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
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

interface Submission {
  id: string;
  title: string;
  overview: string;
  sourceLink: string | null;
  submitter: {
    firstName: string | null;
    lastName: string | null;
  };
  directlyAddressedDPs: Array<{
    dp: string;
    summary: string;
  }>;
  clarificationsExtensions: Array<{
    dp: string;
    type: string;
    title: string;
    content: string;
    whyItMatters: string;
  }>;
  upvotes: number;
  downvotes: number;
  totalPoints?: number;
  thumbsUpPoints?: number;
  commentPoints?: number;
  submissionPoints?: number;
}

export default function LeaderboardPage() {
  const privy = usePrivy();
  const { user, login, logout, authenticated, ready } = privy || {};
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'submissions'>('leaderboard');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number; downvotes: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch leaderboard data
        const leaderboardResponse = await fetch('/api/leaderboard');
        if (!leaderboardResponse.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboardData(leaderboardData);
        
        // Fetch submissions data
        const submissionsResponse = await fetch('/api/submissions');
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const allSubmissions = submissionsData.submissions || [];
          
          // Calculate points for each submission using the correct scoring system
          const submissionsWithPoints = allSubmissions.map((submission: Submission) => {
            // Base submission points: 10 for first, 1 for each subsequent
            // For now, we'll use a simplified approach since we don't have user context here
            const submissionPoints = 10; // Base points for having a submission
            
            // Points from received interactions
            const thumbsUpPoints = submission.upvotes || 0; // 1 point per upvote received
            const commentPoints = 0; // TODO: Add comment count when available
            
            const totalPoints = submissionPoints + thumbsUpPoints + commentPoints;
            
            return {
              ...submission,
              totalPoints,
              thumbsUpPoints,
              commentPoints,
              submissionPoints
            };
          });
          
          // Sort by total points (highest first) and take top 10
          const sortedSubmissions = submissionsWithPoints
            .sort((a: Submission, b: Submission) => (b.totalPoints || 0) - (a.totalPoints || 0))
            .slice(0, 10);
          
          setSubmissions(sortedSubmissions);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const openSubmissionModal = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const closeSubmissionModal = () => {
    setSelectedSubmission(null);
  };

  const toggleComments = (elementId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
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

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'leaderboard'
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>Leaderboard</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'submissions'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Submissions</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'leaderboard' ? (
          <>
        {/* Stats */}
        <div className="mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
                <span className="text-white font-medium">Top Participants</span>
              </div>
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
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-400">
                        Submissions: {entry.activity.submissions}
                      </span>
                      <span className="text-gray-400">
                        Comments: {entry.activity.comments}
                      </span>
                      <span className="text-gray-400">
                        Thumbs up: {entry.activity.thumbsupReceived}
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
                    <span className="text-blue-400">Sub: {entry.scoreBreakdown.contribution}</span>
                    <span className="text-green-400">Eng: {entry.scoreBreakdown.engagement}</span>
                    <span className="text-purple-400">Rec: {entry.scoreBreakdown.received}</span>
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
          </>
        ) : (
          <>
            {/* Submissions Stats */}
            <div className="mb-8">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-cyan-400" />
                    <span className="text-white font-medium">Top Submissions</span>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-4">
              {submissions.map((submission, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={() => openSubmissionModal(submission)}
                          className="text-lg font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors text-left"
                        >
                          {submission.title}
                        </button>
                        <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        By: {(submission.submitter.firstName || submission.submitter.lastName) 
                          ? `${submission.submitter.firstName || ''} ${submission.submitter.lastName || ''}`.trim() 
                          : 'Anon'}
                      </div>
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2 max-h-12 overflow-hidden">
                        {submission.overview}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {submission.directlyAddressedDPs?.length || 0} alignments
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {submission.clarificationsExtensions?.length || 0} clarifications/extensions
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-400">
                          {submission.totalPoints || 0}
                        </div>
                        <div className="text-xs text-gray-400">points</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{submission.submissionPoints || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{submission.thumbsUpPoints || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{submission.commentPoints || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {submissions.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Be the first to submit a contribution!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {selectedSubmission.title}
                </h2>
                <button
                  onClick={closeSubmissionModal}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Submitter Info */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-300">
                    By: {(selectedSubmission.submitter.firstName || selectedSubmission.submitter.lastName) 
                      ? `${selectedSubmission.submitter.firstName || ''} ${selectedSubmission.submitter.lastName || ''}`.trim() 
                      : 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-4">
                    <VoteButtons
                      elementId={selectedSubmission.id}
                      elementType="submission"
                      submissionId={selectedSubmission.id}
                      initialUpvotes={selectedSubmission.upvotes}
                      initialDownvotes={selectedSubmission.downvotes}
                    />
                  </div>
                </div>
              </div>

              {/* Overview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                <p className="text-gray-300 leading-relaxed">
                  {selectedSubmission.overview}
                </p>
              </div>

              {/* Source Link */}
              {selectedSubmission.sourceLink && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Source</h3>
                  <a 
                    href={selectedSubmission.sourceLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    {selectedSubmission.sourceLink}
                  </a>
                </div>
              )}

              {/* Directly Addressed DPs */}
              {selectedSubmission.directlyAddressedDPs && Array.isArray(selectedSubmission.directlyAddressedDPs) && selectedSubmission.directlyAddressedDPs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Directly Addressed Desirable Properties</h3>
                  <div className="space-y-3">
                    {Array.isArray(selectedSubmission.directlyAddressedDPs) ? selectedSubmission.directlyAddressedDPs.map((dp, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-cyan-400">{dp.dp}</h4>
                          <div className="flex items-center gap-2">
                            <VoteButtons
                              elementId={`${selectedSubmission.id}-dp-${index}`}
                              elementType="alignment"
                              submissionId={selectedSubmission.id}
                              initialUpvotes={voteCounts[`${selectedSubmission.id}-dp-${index}`]?.upvotes || 0}
                              initialDownvotes={voteCounts[`${selectedSubmission.id}-dp-${index}`]?.downvotes || 0}
                            />
                            <button
                              onClick={() => toggleComments(`${selectedSubmission.id}-dp-${index}`)}
                              className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{dp.summary}</p>
                        


                        {/* Comment Button for DP */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComments(`${selectedSubmission.id}-dp-${index}`)}
                            className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs text-gray-500">(0)</span>
                          </button>
                        </div>

                        {/* Comments for DP - Collapsible */}
                        {expandedComments.has(`${selectedSubmission.id}-dp-${index}`) && (
                          <div className="mt-3">
                            <CommentSection
                              elementId={`${selectedSubmission.id}-dp-${index}`}
                              elementType="alignment"
                              submissionId={selectedSubmission.id}
                            />
                          </div>
                        )}
                      </div>
                    )) : null}
                  </div>
                </div>
              )}

              {/* Clarifications & Extensions */}
              {selectedSubmission.clarificationsExtensions && Array.isArray(selectedSubmission.clarificationsExtensions) && selectedSubmission.clarificationsExtensions.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Clarifications & Extensions</h3>
                  <div className="space-y-4">
                    {Array.isArray(selectedSubmission.clarificationsExtensions) ? selectedSubmission.clarificationsExtensions.map((item, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${item.type === 'Clarification' ? 'bg-blue-600 text-blue-100' : 'bg-green-600 text-green-100'}`}>{item.type}</span>
                            <h4 className="font-medium text-cyan-400">{item.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <VoteButtons
                              elementId={`${selectedSubmission.id}-ce-${index}`}
                              elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                              submissionId={selectedSubmission.id}
                              initialUpvotes={voteCounts[`${selectedSubmission.id}-ce-${index}`]?.upvotes || 0}
                              initialDownvotes={voteCounts[`${selectedSubmission.id}-ce-${index}`]?.downvotes || 0}
                            />
                            <button
                              onClick={() => toggleComments(`${selectedSubmission.id}-ce-${index}`)}
                              className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-300 mb-1">{item.type}:</h5>
                          <p className="text-gray-300 text-sm">{item.content}</p>
                        </div>
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-300 mb-1">Why it matters:</h5>
                          <p className="text-gray-300 text-sm">{item.whyItMatters}</p>
                        </div>
                        


                        {/* Comment Button for Clarification/Extension */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComments(`${selectedSubmission.id}-ce-${index}`)}
                            className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs text-gray-500">(0)</span>
                          </button>
                        </div>

                        {/* Comments for Clarification/Extension - Collapsible */}
                        {expandedComments.has(`${selectedSubmission.id}-ce-${index}`) && (
                          <div className="mt-3">
                            <CommentSection
                              elementId={`${selectedSubmission.id}-ce-${index}`}
                              elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                              submissionId={selectedSubmission.id}
                            />
                          </div>
                        )}
                      </div>
                    )) : null}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="comments-section mt-4">
                <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>
                <CommentSection
                  elementId={selectedSubmission.id}
                  elementType="submission"
                  submissionId={selectedSubmission.id}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 