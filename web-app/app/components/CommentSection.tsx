'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { MessageCircle, Reply, Edit, Trash2, Flag, MoreHorizontal, Filter, SortAsc, SortDesc } from 'lucide-react';
import VoteButtons from './VoteButtons';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  replies: Comment[];
  parentId?: string;
  isEdited?: boolean;
  editedAt?: string;
}

interface CommentSectionProps {
  elementId: string;
  elementType: 'submission' | 'alignment' | 'clarification' | 'extension';
  submissionId: string;
}

type SortOption = 'newest' | 'oldest' | 'most_voted' | 'least_voted';

export default function CommentSection({ elementId, elementType, submissionId }: CommentSectionProps) {
  const privy = usePrivy();
  const { authenticated, login, user, getAccessToken } = privy || {};
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showModMenu, setShowModMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [elementId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments?elementId=${elementId}&elementType=${elementType}&submissionId=${submissionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      setComments(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      // Fallback to mock data if API fails
      const mockComments: Comment[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'Alice',
          content: 'This is a great submission! I particularly like how it addresses the decentralization aspects.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          upvotes: 12,
          downvotes: 2,
          replies: [
            {
              id: '1-1',
              userId: 'user2',
              userName: 'Bob',
              content: 'I agree! The implementation details are well thought out.',
              createdAt: new Date(Date.now() - 43200000).toISOString(),
              upvotes: 5,
              downvotes: 0,
              replies: [],
              parentId: '1'
            }
          ]
        },
        {
          id: '2',
          userId: 'user3',
          userName: 'Charlie',
          content: 'I have some concerns about the scalability aspects. Has this been tested at scale?',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          upvotes: 8,
          downvotes: 3,
          replies: []
        }
      ];
      setComments(mockComments);
    } finally {
      setLoading(false);
    }
  };

  const sortComments = (comments: Comment[], sortBy: SortOption): Comment[] => {
    const sorted = [...comments];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'most_voted':
        return sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      case 'least_voted':
        return sorted.sort((a, b) => (a.upvotes - a.downvotes) - (b.upvotes - b.downvotes));
      default:
        return sorted;
    }
  };

  const getSortLabel = (sortBy: SortOption): string => {
    switch (sortBy) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'most_voted': return 'Most Voted';
      case 'least_voted': return 'Least Voted';
      default: return 'Newest';
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    if (!privy) {
      // If Privy is not configured, just add to local state
      const comment: Comment = {
        id: Date.now().toString(),
        userId: 'anonymous',
        userName: 'Anonymous',
        content: newComment,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        replies: []
      };
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
        body: JSON.stringify({
          elementId,
          elementType,
          submissionId,
          content: newComment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      const result = await response.json();
      setComments(prev => [result.comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      // Fallback to local state if API fails
      const comment: Comment = {
        id: Date.now().toString(),
        userId: user?.id || 'anonymous',
        userName: user?.email?.address || user?.wallet?.address || 'Anonymous',
        content: newComment,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        replies: []
      };
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    if (!privy) {
      const reply: Comment = {
        id: `${parentId}-${Date.now()}`,
        userId: 'anonymous',
        userName: 'Anonymous',
        content: replyContent,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        replies: [],
        parentId
      };
      setComments(prev => 
        prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [...comment.replies, reply] }
            : comment
        )
      );
      setReplyContent('');
      setReplyingTo(null);
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
        body: JSON.stringify({
          elementId,
          elementType,
          submissionId,
          content: replyContent,
          parentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }

      const result = await response.json();
      setComments(prev => 
        prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [...comment.replies, result.comment] }
            : comment
        )
      );
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      // Fallback to local state if API fails
      const reply: Comment = {
        id: `${parentId}-${Date.now()}`,
        userId: user?.id || 'anonymous',
        userName: user?.email?.address || user?.wallet?.address || 'Anonymous',
        content: replyContent,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        replies: [],
        parentId
      };
      setComments(prev => 
        prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [...comment.replies, reply] }
            : comment
        )
      );
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                content: editContent, 
                isEdited: true, 
                editedAt: new Date().toISOString() 
              }
            : comment
        )
      );
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReportComment = async (commentId: string) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
        body: JSON.stringify({
          commentId,
          reason: 'Inappropriate content',
        }),
      });

      if (response.ok) {
        alert('Comment reported successfully');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const isCommentOwner = (comment: Comment) => {
    return privy && authenticated && user?.id === comment.userId;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-gray-600 pl-4' : ''}`}>
      <div className="bg-gray-800 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-white">{comment.userName}</span>
              <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
              {comment.isEdited && (
                <span className="text-xs text-gray-500">(edited)</span>
              )}
            </div>
            
            {editingComment === comment.id ? (
              <div className="mb-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 resize-none"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-200 mb-3">{comment.content}</p>
            )}
            
            <div className="flex items-center gap-4">
              <VoteButtons
                elementId={`comment-${comment.id}`}
                elementType="comment"
                submissionId={submissionId}
                initialUpvotes={comment.upvotes}
                initialDownvotes={comment.downvotes}
              />
              {!isReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
              )}
              
              {/* Moderation Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowModMenu(showModMenu === comment.id ? null : comment.id)}
                  className="text-gray-400 hover:text-gray-300 p-1"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {showModMenu === comment.id && (
                  <div className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-10 min-w-[120px]">
                    {isCommentOwner(comment) && (
                      <>
                        <button
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditContent(comment.content);
                            setShowModMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteComment(comment.id);
                            setShowModMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </>
                    )}
                    {!isCommentOwner(comment) && (
                      <button
                        onClick={() => {
                          handleReportComment(comment.id);
                          setShowModMenu(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
                      >
                        <Flag className="h-4 w-4" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleSubmitReply(comment.id)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-4">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  const sortedComments = sortComments(comments, sortBy);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Comments</h3>
          <span className="text-gray-400 text-sm">({comments.length})</span>
        </div>
        
        {/* Sort Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
          >
            <Filter className="h-4 w-4" />
            Sort: {getSortLabel(sortBy)}
          </button>
          
          {showSortMenu && (
            <div className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-10 min-w-[140px]">
              {(['newest', 'oldest', 'most_voted', 'least_voted'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortMenu(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                    sortBy === option 
                      ? 'text-cyan-400 bg-gray-600' 
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {option === 'newest' && <SortDesc className="h-4 w-4" />}
                  {option === 'oldest' && <SortAsc className="h-4 w-4" />}
                  {option === 'most_voted' && <SortDesc className="h-4 w-4" />}
                  {option === 'least_voted' && <SortAsc className="h-4 w-4" />}
                  {getSortLabel(option)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-400 resize-none"
          rows={4}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-sm text-gray-400">
            {privy ? (authenticated ? 'Commenting as yourself' : 'Sign in to comment') : 'Anonymous commenting'}
          </span>
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Comment
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-800 rounded-lg p-4">
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedComments.length > 0 ? (
        <div className="space-y-4">
          {sortedComments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
} 