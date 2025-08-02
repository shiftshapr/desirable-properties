'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import CommentSection from '../../components/CommentSection';
import VoteButtons from '../../components/VoteButtons';

interface Submission {
  id: string;
  title: string;
  overview: string;
  sourceLink: string | null;
  submitter: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
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
}

export default function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number; downvotes: number }>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setSubmissionId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/submissions/${submissionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch submission');
      }
      
      const data = await response.json();
      setSubmission(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    } finally {
      setLoading(false);
    }
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

  const updateCommentCount = (elementId: string, count: number) => {
    // Only log for Scott Yates submission
    const isScottYatesSubmission = elementId.includes('cmds3zumt00s3h2108o3bojs9');
    if (isScottYatesSubmission) {
      console.log('🟡 [SubmissionDetail] updateCommentCount called for Scott Yates submission - elementId:', elementId, 'new count:', count);
    }
    setCommentCounts(prev => {
      const newCounts = {
        ...prev,
        [elementId]: count
      };
      if (isScottYatesSubmission) {
        console.log('🟡 [SubmissionDetail] Updated commentCounts state:', newCounts);
      }
      return newCounts;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-white">Loading submission...</div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-red-400">Error: {error || 'Submission not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href="/leaderboard" 
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            ← Back to Leaderboard
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          {/* Submission Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{submission.title}</h1>
            <p className="text-gray-400 text-sm mb-4">
              By: {submission.submitter.firstName} {submission.submitter.lastName} ({submission.submitter.email})
            </p>
            <p className="text-gray-300 mb-4">{submission.overview}</p>
            {submission.sourceLink && (
              <a 
                href={submission.sourceLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Source →
              </a>
            )}
          </div>

          {/* Submission-Level Voting and Comments */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Submission</h2>
              <div className="flex items-center gap-4">
                <VoteButtons
                  elementId={submission.id}
                  elementType="submission"
                  submissionId={submission.id}
                  initialUpvotes={voteCounts[submission.id]?.upvotes || submission.upvotes}
                  initialDownvotes={voteCounts[submission.id]?.downvotes || submission.downvotes}
                  onVoteChange={(vote) => {
                    setVoteCounts(prev => ({
                      ...prev,
                      [submission.id]: {
                        upvotes: prev[submission.id]?.upvotes || submission.upvotes,
                        downvotes: prev[submission.id]?.downvotes || submission.downvotes,
                        ...(vote === 'up' ? { upvotes: (prev[submission.id]?.upvotes || submission.upvotes) + 1 } : {}),
                        ...(vote === 'down' ? { downvotes: (prev[submission.id]?.downvotes || submission.downvotes) + 1 } : {})
                      }
                    }));
                  }}
                />
                <button
                  onClick={() => toggleComments(submission.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{(() => {
                  const count = commentCounts[submission.id] || 0;
                  if (submission.id === 'cmds3zumt00s3h2108o3bojs9') {
                    console.log('🟡 [SubmissionDetail] Displaying comment count for Scott Yates submission:', count, 'elementId:', submission.id);
                  }
                  return count;
                })()}</span>
                </button>
              </div>
            </div>
            
            {/* Submission-Level Comments */}
            {expandedComments.has(submission.id) && (
              <div className="mt-4">
                <CommentSection
                  elementId={submission.id}
                  elementType="submission"
                  submissionId={submission.id}
                  onCommentCountChange={(count) => updateCommentCount(submission.id, count)}
                />
              </div>
            )}
          </div>

          {/* Directly Addressed DPs */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Directly Addressed Desirable Properties</h3>
            <div className="space-y-4">
              {submission.directlyAddressedDPs && submission.directlyAddressedDPs.length > 0 ? (
                submission.directlyAddressedDPs.map((dp, dpIndex) => (
                  <div key={dpIndex} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-cyan-400">{dp.dp}</h4>
                      <div className="flex items-center gap-2">
                        <VoteButtons
                          elementId={`${submission.id}-dp-${dpIndex}`}
                          elementType="alignment"
                          submissionId={submission.id}
                          initialUpvotes={voteCounts[`${submission.id}-dp-${dpIndex}`]?.upvotes || 0}
                          initialDownvotes={voteCounts[`${submission.id}-dp-${dpIndex}`]?.downvotes || 0}
                          onVoteChange={(vote) => {
                            setVoteCounts(prev => ({
                              ...prev,
                              [`${submission.id}-dp-${dpIndex}`]: {
                                upvotes: prev[`${submission.id}-dp-${dpIndex}`]?.upvotes || 0,
                                downvotes: prev[`${submission.id}-dp-${dpIndex}`]?.downvotes || 0,
                                ...(vote === 'up' ? { upvotes: (prev[`${submission.id}-dp-${dpIndex}`]?.upvotes || 0) + 1 } : {}),
                                ...(vote === 'down' ? { downvotes: (prev[`${submission.id}-dp-${dpIndex}`]?.downvotes || 0) + 1 } : {})
                              }
                            }));
                          }}
                        />
                        <button
                          onClick={() => toggleComments(`${submission.id}-dp-${dpIndex}`)}
                          className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{(() => {
                  const count = commentCounts[`${submission.id}-dp-${dpIndex}`] || 0;
                  if (submission.id === 'cmds3zumt00s3h2108o3bojs9') {
                    console.log('🟡 [SubmissionDetail] Displaying DP comment count for Scott Yates submission:', count, 'elementId:', `${submission.id}-dp-${dpIndex}`);
                  }
                  return count;
                })()}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{dp.summary}</p>
                    
                    {/* Comments for DP */}
                    {expandedComments.has(`${submission.id}-dp-${dpIndex}`) && (
                      <div className="mt-3">
                        <CommentSection
                          elementId={`${submission.id}-dp-${dpIndex}`}
                          elementType="alignment"
                          submissionId={submission.id}
                          onCommentCountChange={(count) => updateCommentCount(`${submission.id}-dp-${dpIndex}`, count)}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 italic">No directly addressed desirable properties listed.</p>
              )}
            </div>
          </div>

          {/* Clarifications and Extensions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Clarifications and Extensions</h3>
            <div className="space-y-4">
              {submission.clarificationsExtensions && submission.clarificationsExtensions.length > 0 ? (
                submission.clarificationsExtensions.map((item, itemIndex) => (
                  <div key={itemIndex} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.type === 'Clarification' 
                            ? 'bg-blue-600 text-blue-100' 
                            : 'bg-green-600 text-green-100'
                        }`}>
                          {item.type}
                        </span>
                        <h4 className="font-medium text-cyan-400">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <VoteButtons
                          elementId={`${submission.id}-ce-${itemIndex}`}
                          elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                          submissionId={submission.id}
                          initialUpvotes={voteCounts[`${submission.id}-ce-${itemIndex}`]?.upvotes || 0}
                          initialDownvotes={voteCounts[`${submission.id}-ce-${itemIndex}`]?.downvotes || 0}
                          onVoteChange={(vote) => {
                            setVoteCounts(prev => ({
                              ...prev,
                              [`${submission.id}-ce-${itemIndex}`]: {
                                upvotes: prev[`${submission.id}-ce-${itemIndex}`]?.upvotes || 0,
                                downvotes: prev[`${submission.id}-ce-${itemIndex}`]?.downvotes || 0,
                                ...(vote === 'up' ? { upvotes: (prev[`${submission.id}-ce-${itemIndex}`]?.upvotes || 0) + 1 } : {}),
                                ...(vote === 'down' ? { downvotes: (prev[`${submission.id}-ce-${itemIndex}`]?.downvotes || 0) + 1 } : {})
                              }
                            }));
                          }}
                        />
                        <button
                          onClick={() => toggleComments(`${submission.id}-ce-${itemIndex}`)}
                          className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{(() => {
                  const count = commentCounts[`${submission.id}-ce-${itemIndex}`] || 0;
                  if (submission.id === 'cmds3zumt00s3h2108o3bojs9') {
                    console.log('🟡 [SubmissionDetail] Displaying CE comment count for Scott Yates submission:', count, 'elementId:', `${submission.id}-ce-${itemIndex}`);
                  }
                  return count;
                })()}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{item.dp}</p>
                    <p className="text-gray-300 text-sm mb-3">{item.content}</p>
                    <p className="text-gray-300 text-sm mb-3">
                      <span className="text-gray-400">Why it matters:</span> {item.whyItMatters}
                    </p>
                    
                    {/* Comments for Clarification/Extension */}
                    {expandedComments.has(`${submission.id}-ce-${itemIndex}`) && (
                      <div className="mt-3">
                        <CommentSection
                          elementId={`${submission.id}-ce-${itemIndex}`}
                          elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                          submissionId={submission.id}
                          onCommentCountChange={(count) => updateCommentCount(`${submission.id}-ce-${itemIndex}`, count)}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 italic">No clarifications or extensions listed.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 