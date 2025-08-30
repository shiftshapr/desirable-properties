'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { MessageCircle, Reply, Edit, Trash2, Flag, MoreHorizontal, Filter, SortAsc, SortDesc } from 'lucide-react';
import UnifiedVotingDisplay from './UnifiedVotingDisplay';

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
  const { isAuthenticated: authenticated, login, user, getAccessToken } = useAuth();
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
      
              // Ensure comments is always an array and transform to match Comment interface
        if (Array.isArray(comments)) {
          // Transform API response to match Comment interface
          const transformedComments = comments.map(comment => ({
            id: comment.id,
            userId: comment.author?.id || comment.userId || 'unknown',
            userName: comment.author?.userName || comment.author?.email || comment.userName || 'Unknown',
            content: comment.content,
            createdAt: comment.createdAt,
            upvotes: comment.upvotes || 0,
            downvotes: comment.downvotes || 0,
            replies: comment.replies || [],
            parentId: comment.parentId,
            isEdited: comment.isEdited,
            editedAt: comment.editedAt
          }));
          
          setComments(transformedComments);
          const commentCount = transformedComments.length;
          if (isScottYatesSubmission) {
            console.log('🔵 [CommentSection] Setting comment count to:', commentCount, 'for elementId:', elementId, 'elementType:', elementType);
            console.log('🔵 [CommentSection] Transformed comments:', transformedComments);
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

    if (!authenticated) {
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
          // Legacy response format - transform to match Comment interface
          const transformedComment: Comment = {
            id: result.comment.id,
            userId: result.comment.author?.id || result.comment.userId || 'unknown',
            userName: result.comment.author?.userName || result.comment.author?.email || result.comment.userName || 'Unknown',
            content: result.comment.content,
            createdAt: result.comment.createdAt,
            upvotes: result.comment.upvotes || 0,
            downvotes: result.comment.downvotes || 0,
            replies: result.comment.replies || []
          };
          setComments(prev => [transformedComment, ...prev]);
          const newCount = comments.length + 1;
          if (isScottYatesSubmission) {
            console.log('🔵 [CommentSection] Updated comment count (legacy response):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
          }
          onCommentCountChange?.(newCount);
        } else if (result.comments) {
          // Unified service response format - transform to match Comment interface
          const transformedComments = result.comments.map((comment: any) => ({
            id: comment.id,
            userId: comment.author?.id || comment.userId || 'unknown',
            userName: comment.author?.userName || comment.author?.email || comment.userName || 'Unknown',
            content: comment.content,
            createdAt: comment.createdAt,
            upvotes: comment.upvotes || 0,
            downvotes: comment.downvotes || 0,
            replies: comment.replies || []
          }));
          setComments(transformedComments);
          const newCount = transformedComments.length;
          if (isScottYatesSubmission) {
            console.log('🔵 [CommentSection] Updated comment count (unified response):', newCount, 'for elementId:', elementId, 'elementType:', elementType);
          }
          onCommentCountChange?.(newCount);
      } else {
        // Fallback
        const comment: Comment = {
          id: Date.now().toString(),
          userId: user?.id || 'anonymous',
          userName: user?.email || user?.name || 'Anonymous',
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
        userName: user?.email || user?.name || 'Anonymous',
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

    if (!authenticated) {
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
          userName: user?.email || user?.name || 'Anonymous',
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
        userName: user?.email || user?.name || 'Anonymous',
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

    const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
    const isDPDetailModal = window.location.pathname === '/'; // Main page has DP detail modal
    
    if (isScottYatesSubmission || isDPDetailModal) {
      console.log('🔵 [CommentSection] handleEditComment called:', {
        commentId,
        editContent,
        elementId,
        elementType,
        submissionId,
        context: isDPDetailModal ? 'DP_DETAIL_MODAL' : 'SUBMISSION_DETAIL_PAGE',
        location: window.location.pathname
      });
    }

    try {
      const token = await getAccessToken?.();
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Edit token:', token);
      }

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Edit response status:', response.status);
        console.log('🔵 [CommentSection] Edit response ok:', response.ok);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (isScottYatesSubmission || isDPDetailModal) {
          console.log('🔵 [CommentSection] Edit error response:', errorText);
        }
        throw new Error(`Failed to edit comment: ${errorText}`);
      }

      const result = await response.json();
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Edit success result:', result);
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
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Edit error caught:', error);
      }
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
    const isDPDetailModal = window.location.pathname === '/'; // Main page has DP detail modal
    
    if (isScottYatesSubmission || isDPDetailModal) {
      console.log('🔵 [CommentSection] handleDelete called:', {
        commentId,
        elementId,
        elementType,
        submissionId,
        context: isDPDetailModal ? 'DP_DETAIL_MODAL' : 'SUBMISSION_DETAIL_PAGE',
        location: window.location.pathname
      });
    }
    
    try {
      const token = await getAccessToken();
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Delete token:', token);
      }
      
      if (!token) {
        if (isScottYatesSubmission || isDPDetailModal) {
          console.log('🔵 [CommentSection] No token available for delete');
        }
        return;
      }
  
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Delete response status:', response.status);
        console.log('🔵 [CommentSection] Delete response ok:', response.ok);
      }
  
      if (response.ok) {
        if (isScottYatesSubmission || isDPDetailModal) {
          console.log('🔵 [CommentSection] Delete successful, updating comments state');
        }
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        const errorText = await response.text();
        if (isScottYatesSubmission || isDPDetailModal) {
          console.log('🔵 [CommentSection] Delete error response:', errorText);
        }
        throw new Error(`Delete failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] Delete error caught:', error);
      }
      alert('Failed to delete comment');
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
    // Add comprehensive logging for debugging comment ownership
    const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
    const isDPDetailModal = window.location.pathname === '/'; // Main page has DP detail modal
    
    if (isScottYatesSubmission || isDPDetailModal) {
      console.log('🔵 [CommentSection] Checking comment ownership:', {
        elementId,
        elementType,
        submissionId,
        authenticated,
        userId: user?.id,
        userEmail: user?.email,
        commentUserId: comment.userId,
        commentId: comment.id,
        commentUserName: comment.userName,
        isOwner: authenticated && user?.id === comment.userId,
        context: isDPDetailModal ? 'DP_DETAIL_MODAL' : 'SUBMISSION_DETAIL_PAGE',
        location: window.location.pathname
      });
    }
    return authenticated && user?.id === comment.userId;
  };

  const canEditComment = (comment: Comment) => {
    const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
    const isDPDetailModal = window.location.pathname === '/'; // Main page has DP detail modal
    
    if (!isCommentOwner(comment)) {
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] canEditComment: false - not owner');
      }
      return false;
    }
    
    // Check if comment is within 24 hours of creation (matches API)
    const commentDate = new Date(comment.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
    
    const canEdit = diffInHours <= 24;
    if (isScottYatesSubmission || isDPDetailModal) {
      console.log('🔵 [CommentSection] canEditComment:', {
        commentId: comment.id,
        commentCreatedAt: comment.createdAt,
        diffInHours,
        canEdit,
        context: isDPDetailModal ? 'DP_DETAIL_MODAL' : 'SUBMISSION_DETAIL_PAGE'
      });
    }
    
    return canEdit;
  };

  const canDeleteComment = (comment: Comment) => {
    const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
    const isDPDetailModal = window.location.pathname === '/'; // Main page has DP detail modal
    
    if (!isCommentOwner(comment)) {
      if (isScottYatesSubmission || isDPDetailModal) {
        console.log('🔵 [CommentSection] canDeleteComment: false - not owner');
      }
      return false;
    }
    
    // Check if comment is within 24 hours of creation (matches API)
    const commentDate = new Date(comment.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
    
    const canDelete = diffInHours <= 24;
    if (isScottYatesSubmission || isDPDetailModal) {
      console.log('🔵 [CommentSection] canDeleteComment:', {
        commentId: comment.id,
        commentCreatedAt: comment.createdAt,
        diffInHours,
        canDelete,
        context: isDPDetailModal ? 'DP_DETAIL_MODAL' : 'SUBMISSION_DETAIL_PAGE'
      });
    }
    
    return canDelete;
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
              <UnifiedVotingDisplay
                elementId={comment.id}
                elementType="comment"
                submissionId={submissionId}
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
                    {canEditComment(comment) && (
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
                    )}
                    {canDeleteComment(comment) && (
                      <button
                        onClick={() => {
                                                     handleDelete(comment.id);
                          setShowModMenu(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                    {isCommentOwner(comment) && !canEditComment(comment) && !canDeleteComment(comment) && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Edit/delete window expired (24 hours)
                      </div>
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
            {authenticated ? 'Commenting as yourself' : 'Sign in to comment'}
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