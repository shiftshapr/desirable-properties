'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VoteButtonsProps {
  elementId: string;
  elementType: 'submission' | 'alignment' | 'clarification' | 'extension' | 'comment';
  submissionId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  userVote?: 'up' | 'down' | null;
  onVoteChange?: (vote: 'up' | 'down' | null) => void;
}

export default function VoteButtons({
  elementId,
  elementType,
  submissionId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  userVote = null,
  onVoteChange,
}: VoteButtonsProps) {
  const privy = usePrivy();
  const { authenticated, login } = privy || {};
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(userVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (vote: 'up' | 'down') => {
    if (!privy) {
      // If Privy is not configured, just update the UI optimistically
      if (currentVote === vote) {
        if (vote === 'up') {
          setUpvotes(prev => prev - 1);
        } else {
          setDownvotes(prev => prev - 1);
        }
        setCurrentVote(null);
        onVoteChange?.(null);
      } else {
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
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    if (isVoting) return;

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

      // TODO: Send vote to API
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
    // TODO: Implement actual API call
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        elementId,
        elementType,
        submissionId,
        vote,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit vote');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('up')}
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
        onClick={() => handleVote('down')}
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
    </div>
  );
} 