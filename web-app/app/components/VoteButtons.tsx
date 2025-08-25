'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

interface VoteButtonsProps {
  elementId: string;
  elementType: 'submission' | 'alignment' | 'clarification' | 'extension' | 'comment';
  submissionId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  userVote?: 'up' | 'down' | null;
  onVoteChange?: (vote: 'up' | 'down' | null) => void;
  showComments?: boolean;
  commentCount?: number;
  onCommentToggle?: () => void;
}

export default function VoteButtons({
  elementId,
  elementType,
  submissionId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  userVote = null,
  onVoteChange,
  showComments = false,
  commentCount = 0,
  onCommentToggle,
}: VoteButtonsProps) {
  const { user, isAuthenticated: authenticated, login, getAccessToken } = useAuth();
  // Only log for Scott Yates submission
  const isScottYatesSubmission = submissionId === 'cmds3zumt00s3h2108o3bojs9';
  if (isScottYatesSubmission) {
    console.log('🔵 [VoteButtons] Component loaded for Scott Yates submission!', { elementId, elementType, submissionId });
  }
  // const privyInstance = usePrivy(); // Authentication disabled
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(userVote);
  
  // Update currentVote when userVote prop changes
  useEffect(() => {
    setCurrentVote(userVote);
  }, [userVote]);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [isVoting, setIsVoting] = useState(false);

  // Fetch actual vote counts and user vote on component mount
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        // Build URL parameters based on element type
        let url = '';
        if (elementType === 'comment') {
          url = `/api/votes?commentId=${elementId}&submissionId=${submissionId}`;
        } else if (elementType === 'submission') {
          url = `/api/votes?submissionId=${submissionId}`;
        } else {
          // For alignments, clarifications, extensions
          url = `/api/votes?elementId=${elementId}&elementType=${elementType}&submissionId=${submissionId}`;
        }
        
        // Add authorization header if authenticated
        const accessToken = await getAccessToken();
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          // Only update if we don't have initial values or if the fetched values are different
          if (initialUpvotes === 0 && initialDownvotes === 0) {
            setUpvotes(data.upvotes || 0);
            setDownvotes(data.downvotes || 0);
          } else {
            // If we have initial values, only update if the fetched values are different
            const fetchedUpvotes = data.upvotes || 0;
            const fetchedDownvotes = data.downvotes || 0;
            if (fetchedUpvotes !== initialUpvotes || fetchedDownvotes !== initialDownvotes) {
              setUpvotes(fetchedUpvotes);
              setDownvotes(fetchedDownvotes);
            }
          }
          setCurrentVote(data.userVote || null);
        }
      } catch (error) {
        console.error('Error fetching votes:', error);
      }
    };

    fetchVotes();
  }, [elementId, elementType, submissionId, authenticated, user, initialUpvotes, initialDownvotes]);

  const handleVote = async (vote: 'up' | 'down', event?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering parent click handlers
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!authenticated) {
      login();
      return;
    }

    if (isVoting) return;

    // Prevent duplicate votes - if user already voted this way, do nothing
    if (currentVote === vote) {
      return;
    }

    try {
      setIsVoting(true);

      // If clicking the same vote, remove it
      if (currentVote === vote) {
        if (vote === 'up') {
          setUpvotes(prev => prev - 1);
        } else {
          setDownvotes(prev => prev - 1);
        }
        setCurrentVote(null);
        onVoteChange?.(null);
      } else {
        // If switching votes or voting for the first time
        if (currentVote === 'up') {
          setUpvotes(prev => prev - 1);
        } else if (currentVote === 'down') {
          setDownvotes(prev => prev - 1);
        }

        if (vote === 'up') {
          setUpvotes(prev => prev + 1);
        } else {
          setDownvotes(prev => prev + 1);
        }

        setCurrentVote(vote);
        onVoteChange?.(vote);
      }

      // Send vote to API
      await submitVote(vote);
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update
      if (currentVote === vote) {
        if (vote === 'up') {
          setUpvotes(prev => prev + 1);
        } else {
          setDownvotes(prev => prev + 1);
        }
        setCurrentVote(vote);
      } else {
        if (currentVote === 'up') {
          setUpvotes(prev => prev + 1);
        } else if (currentVote === 'down') {
          setDownvotes(prev => prev + 1);
        }
        if (vote === 'up') {
          setUpvotes(prev => prev - 1);
        } else {
          setDownvotes(prev => prev - 1);
        }
        setCurrentVote(currentVote);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const submitVote = async (vote: 'up' | 'down') => {
    const accessToken = await getAccessToken();
    
    // Prepare the request body based on element type
    const requestBody: any = {
      type: vote.toUpperCase() as 'UP' | 'DOWN',
    };
    
    if (elementType === 'comment') {
      requestBody.commentId = elementId;
      requestBody.submissionId = submissionId;
    } else if (elementType === 'submission') {
      requestBody.submissionId = submissionId;
    } else {
      // For alignments, clarifications, extensions
      requestBody.elementId = elementId;
      requestBody.elementType = elementType;
      requestBody.submissionId = submissionId;
    }
    
    console.log('Sending vote request:', requestBody);
    
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vote API error:', response.status, errorText);
      throw new Error('Failed to submit vote');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => handleVote('up', e)}
        disabled={isVoting}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          currentVote === 'up'
            ? 'bg-green-500/20 text-green-400'
            : 'text-gray-400 hover:text-green-400 hover:bg-green-500/10'
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
        <span>{upvotes}</span>
      </button>
      
      <button
        onClick={(e) => handleVote('down', e)}
        disabled={isVoting}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          currentVote === 'down'
            ? 'bg-red-500/20 text-red-400'
            : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
        }`}
      >
        <ThumbsDown className="h-4 w-4" />
        <span>{downvotes}</span>
      </button>
      
      {showComments && onCommentToggle && (
        <button
          onClick={onCommentToggle}
          className="flex items-center gap-1 px-2 py-1 rounded text-sm text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount}</span>
        </button>
      )}
    </div>
  );
}