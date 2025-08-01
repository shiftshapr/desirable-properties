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
  onCommentCountChange?: (count: number) => void;
}

type SortOption = 'newest' | 'oldest' | 'most_voted' | 'least_voted';

export default function CommentSection({ elementId, elementType, submissionId, onCommentCountChange }: CommentSectionProps) {
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

  // Only log for Scott Yates submission
  const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';

  useEffect(() => {
    fetchComments();
  }, [elementId, elementType, submissionId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      let url = `/api/comments?submissionId=${submissionId}`;
      
      // Add elementId and elementType if this is for a specific element (not submission-level)
      if (elementId && elementType && elementType !== 'submission') {
        url += `&elementId=${elementId}&elementType=${elementType}`;
      }
      
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Fetching comments for Scott Yates submission:', submissionId, 'elementId:', elementId, 'elementType:', elementType, 'URL:', url);
        console.log('🔵 [CommentSection] This CommentSection is for:', elementType === 'submission' ? 'SUBMISSION-LEVEL' : 'ELEMENT-SPECIFIC');
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Received comments:', comments);
      }
      
      // Ensure comments is always an array
      if (Array.isArray(comments)) {
        setComments(comments);
        const commentCount = comments.length;
        if (isScottYatesSubmission) {
          console.log('🔵 [CommentSection] Setting comment count to:', commentCount, 'for elementId:', elementId, 'elementType:', elementType);
        }
        onCommentCountChange?.(commentCount);
      } else {
        if (isScottYatesSubmission) {
          console.warn('API returned non-array comments:', comments);
        }
        setComments([]);
        if (isScottYatesSubmission) {
          console.log('🔵 [CommentSection] Setting comment count to 0 (non-array response) for elementId:', elementId, 'elementType:', elementType);
        }
        onCommentCountChange?.(0);
      }
    } catch (error) {
      if (isScottYatesSubmission) {
        console.error('Error fetching comments:', error);
      }
      // Fallback to empty array if API fails
      setComments([]);
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Setting comment count to 0 (error) for elementId:', elementId, 'elementType:', elementType);
      }
      onCommentCountChange?.(0);
    } finally {
      setLoading(false);
    }
  };

  const sortComments = (comments: Comment[], sortBy: SortOption): Comment[] => {
    if (!Array.isArray(comments)) {
      console.warn('sortComments received non-array:', comments);
      return [];
    }
    
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

    if (isScottYatesSubmission) {
      console.log('🔵 [CommentSection] Submitting comment for Scott Yates submission:', submissionId, 'elementId:', elementId, 'elementType:', elementType, 'content:', newComment);
    }

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
      const newCount = comments.length + 1;
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Updated comment count (no privy):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
      }
      onCommentCountChange?.(newCount);
      setNewComment('');
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    try {
      // For submission-level comments, don't send elementId and elementType
      const requestBody = elementType === 'submission' 
        ? {
            submissionId,
            content: newComment,
          }
        : {
            elementId,
            elementType,
            submissionId,
            content: newComment,
          };

      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Comment type:', elementType === 'submission' ? 'SUBMISSION-LEVEL' : 'ELEMENT-SPECIFIC');
        console.log('🔵 [CommentSection] Request body:', requestBody);
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken?.()}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      const result = await response.json();
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Comment submission result:', result);
      }
      
      // Handle both unified service response and legacy response
      if (result.comment) {
        // Legacy response format
        setComments(prev => [result.comment, ...prev]);
        const newCount = comments.length + 1;
        if (isScottYatesSubmission) {
          console.log('🔵 [CommentSection] Updated comment count (legacy response):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
        }
        onCommentCountChange?.(newCount);
      } else if (result.comments) {
        // Unified service response format
        setComments(result.comments);
        const newCount = result.comments.length;
        if (isScottYatesSubmission) {
          console.log('🔵 [CommentSection] Updated comment count (unified response):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
        }
        onCommentCountChange?.(newCount);
      } else {
        // Fallback
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
        const newCount = comments.length + 1;
        if (isScottYatesSubmission) {
          console.log('🔵 [CommentSection] Updated comment count (fallback):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
        }
        onCommentCountChange?.(newCount);
      }
      
      setNewComment('');
    } catch (error) {
      if (isScottYatesSubmission) {
        console.error('Error submitting comment:', error);
      }
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
      const newCount = comments.length + 1;
      if (isScottYatesSubmission) {
        console.log('🔵 [CommentSection] Updated comment count (error fallback):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
      }
      onCommentCountChange?.(newCount);
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
      const newCount = comments.length + 1;
      onCommentCountChange?.(newCount);
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
      
      // Handle both unified service response and legacy response
      if (result.comment) {
        // Legacy response format
        setComments(prev => 
          prev.map(comment => 
            comment.id === parentId 
              ? { ...comment, replies: [...comment.replies, result.comment] }
              : comment
          )
        );
        const newCount = comments.length + 1;
        onCommentCountChange?.(newCount);
      } else if (result.comments) {
        // Unified service response format - refresh all comments
        setComments(result.comments);
        const newCount = result.comments.length;
        onCommentCountChange?.(newCount);
      } else {
        // Fallback
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
        const newCount = comments.length + 1;
        onCommentCountChange?.(newCount);
      }
      
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
      const newCount = comments.length + 1;
      onCommentCountChange?.(newCount);
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
      const newCount = comments.length - 1;
      onCommentCountChange?.(newCount);
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
    <div key={comment.id} className={`${isReply ? 'ml-4 border-l border-gray-600 pl-2' : ''}`}>
      <div className="bg-gray-800 rounded p-2 mb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white text-sm">{comment.userName}</span>
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
              <p className="text-gray-200 mb-2 text-sm">{comment.content}</p>
            )}
            
            <div className="flex items-center gap-2">
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
          <div className="mt-2 pt-2 border-t border-gray-700">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white placeholder-gray-400 resize-none text-sm"
              rows={2}
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleSubmitReply(comment.id)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
        <div className="ml-4">
          {Array.isArray(comment.replies) ? comment.replies.map(reply => renderComment(reply, true)) : null}
        </div>
      )}
    </div>
  );

  const sortedComments = sortComments(comments, sortBy);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Comments</h3>
          <span className="text-gray-400 text-xs">({comments.length})</span>
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
              {Array.isArray(['newest', 'oldest', 'most_voted', 'least_voted']) ? (['newest', 'oldest', 'most_voted', 'least_voted'] as SortOption[]).map((option) => (
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
              )) : null}
            </div>
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="mb-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white placeholder-gray-400 resize-none text-sm"
          rows={2}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            {privy ? (authenticated ? 'Commenting as yourself' : 'Sign in to comment') : 'Anonymous commenting'}
          </span>
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Comment
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {Array.isArray([...Array(3)]) ? [...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-800 rounded-lg p-4">
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          )) : null}
        </div>
      ) : sortedComments.length > 0 ? (
        <div className="space-y-4">
          {Array.isArray(sortedComments) ? sortedComments.map(comment => renderComment(comment)) : null}
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