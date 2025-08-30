'use client';

/**
 * UNIFIED VOTING DISPLAY COMPONENT
 * Replaces VoteButtons and provides consistent voting UI across the entire app
 * Uses the unified voting service for all operations
 */

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { useUnifiedVoting, VotingConfig, VotingDisplayData } from '@/lib/unifiedVotingService';

interface UnifiedVotingDisplayProps extends VotingConfig {
  showComments?: boolean;
  commentCount?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'detailed';
  commentsExpanded?: boolean;
}

export default function UnifiedVotingDisplay({
  elementId,
  elementType,
  submissionId,
  showComments = true,
  commentCount = 0,
  onVoteChange,
  onCommentToggle,
  className = '',
  size = 'medium',
  variant = 'default',
  commentsExpanded = false
}: UnifiedVotingDisplayProps) {
  // Component initialization
  // useEffect(() => {
  //   console.log(`🟢 [UNIFIED VOTING] Component mounted for ${elementType} ${elementId}`);
  // }, [elementType, elementId]);

  const [votingData, setVotingData] = useState<VotingDisplayData>({
    elementId,
    elementType,
    submissionId,
    upvotes: 0,
    downvotes: 0,
    isLoading: true
  });

  const { vote, getVotingData } = useUnifiedVoting();

  const config: VotingConfig = {
    elementId,
    elementType,
    submissionId,
    showComments,
    commentCount,
    onVoteChange: (data) => {
      console.log(`Vote change callback triggered:`, data);
      setVotingData(data);
      onVoteChange?.(data);
    },
    onCommentToggle
  };

  // Load initial voting data
  useEffect(() => {

    loadVotingData();
  }, [elementId, elementType, submissionId]);

  const loadVotingData = async () => {
    try {
      setVotingData(prev => ({ ...prev, isLoading: true }));
      const data = await getVotingData(config);
      setVotingData(data);
      
    } catch (error) {
      console.error(`Failed to load voting data:`, error);
      setVotingData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleVote = async (voteType: 'UP' | 'DOWN') => {
    try {
      // Optimistic update
      setVotingData(prev => ({
        ...prev,
        isLoading: true
      }));

      const result = await vote(config, voteType);
      setVotingData(result);
      
    } catch (error) {
      console.error(`❌ [VOTE FAILED]`, error);
      // Revert optimistic update
      await loadVotingData();
    }
  };

  const handleCommentToggle = () => {
    onCommentToggle?.();
  };

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 14,
      gap: 'gap-1',
      textSize: 'text-xs',
      padding: 'px-2 py-1'
    },
    medium: {
      iconSize: 16,
      gap: 'gap-2',
      textSize: 'text-sm',
      padding: 'px-3 py-1.5'
    },
    large: {
      iconSize: 20,
      gap: 'gap-3',
      textSize: 'text-base',
      padding: 'px-4 py-2'
    }
  };

  const { iconSize, gap, textSize, padding } = sizeConfig[size];

  // Variant-specific rendering
  const renderVotingButtons = () => {
    const buttonClass = `
      flex items-center ${gap} ${padding} ${textSize}
      rounded transition-all duration-200
      hover:bg-gray-100 dark:hover:bg-gray-700
      ${votingData.isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    const upvoteClass = `
      ${buttonClass}
      ${votingData.userVote === 'UP' ? 'text-green-500 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}
    `;

    const downvoteClass = `
      ${buttonClass}
      ${votingData.userVote === 'DOWN' ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
    `;

    return (
      <>
        <button
          onClick={() => handleVote('UP')}
          disabled={votingData.isLoading}
          className={upvoteClass}
          data-testid={`upvote-${elementId}`}
        >
          <ThumbsUp size={iconSize} />
          <span>{votingData.upvotes}</span>
        </button>

        <button
          onClick={() => handleVote('DOWN')}
          disabled={votingData.isLoading}
          className={downvoteClass}
          data-testid={`downvote-${elementId}`}
        >
          <ThumbsDown size={iconSize} />
          <span>{votingData.downvotes}</span>
        </button>
      </>
    );
  };

  const renderCommentButton = () => {
    if (!showComments) return null;

    const commentClass = `
      flex items-center ${gap} ${padding} ${textSize}
      rounded transition-all duration-200
      hover:bg-gray-100 dark:hover:bg-gray-700
      cursor-pointer ml-2
      ${commentsExpanded ? 'text-green-500 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}
    `;

    return (
      <button
        onClick={handleCommentToggle}
        className={commentClass}
        data-testid={`comments-${elementId}`}
      >
        <MessageCircle size={iconSize} />
        <span>{commentCount}</span>
      </button>
    );
  };

  // Log render state
  // console.log(`Rendering with state:`, {
  //   votingData,
  //   showComments,
  //   commentCount,
  //   size,
  //   variant
  // });

  if (variant === 'compact') {
    return (
      <div className={`flex items-center ${gap} ${className}`}>
        {renderVotingButtons()}
        {renderCommentButton()}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className={`flex items-center ${gap}`}>
          {renderVotingButtons()}
        </div>
        {showComments && (
          <div className="flex items-center justify-center">
            {renderCommentButton()}
          </div>
        )}
        {variant === 'detailed' && votingData.userVote && (
          <div className={`text-xs text-gray-500 ${textSize}`}>
            You voted: {votingData.userVote.toLowerCase()}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {renderVotingButtons()}
      {renderCommentButton()}
    </div>
  );
}
