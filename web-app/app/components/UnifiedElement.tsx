import React, { useState } from 'react';
import UnifiedVotingDisplay from './UnifiedVotingDisplay';
import CommentSection from './CommentSection';
import { MessageCircle } from 'lucide-react';

interface UnifiedElementProps {
  elementId?: string;
  elementType: 'submission' | 'comment' | 'reaction';
  submissionId?: string;
  showVotes?: boolean;
  showComments?: boolean;
  showAuthor?: boolean;
  showTimestamp?: boolean;
  className?: string;
  children?: React.ReactNode;
  onElementUpdate?: (element: any) => void;
  onCommentToggle?: () => void;
  onCommentCountChange?: (count: number) => void;
  commentCount?: number;
  initialUpvotes?: number;
  initialDownvotes?: number;
}

export function UnifiedElement({
  elementId,
  elementType,
  submissionId,
  showVotes = true,
  showComments = false,
  showAuthor = true,
  showTimestamp = false,
  className = '',
  children,
  onElementUpdate,
  onCommentToggle,
  onCommentCountChange,
  commentCount = 0,
  initialUpvotes = 0,
  initialDownvotes = 0,
}: UnifiedElementProps) {
  const [showCommentSection, setShowCommentSection] = useState(false);

  const handleCommentToggle = () => {
    setShowCommentSection(!showCommentSection);
    onCommentToggle?.();
  };

  return (
    <div 
      className={`unified-element ${elementType} ${className}`}
      data-element-id={elementId}
      data-element-type={elementType}
    >
      {/* Element Content */}
      <div className="element-content">
        {children || (
          <div className="element-text">
            {/* Content will be provided by parent component */}
          </div>
        )}
      </div>

      {/* Element Metadata - Compact layout */}
      <div className="element-metadata flex items-center justify-between text-sm text-gray-600">
        <div className="element-info flex items-center space-x-4">
          {showAuthor && (
            <span className="author text-gray-300">
              {/* Author info will be provided by parent */}
            </span>
          )}
          
          {showTimestamp && (
            <span className="timestamp text-gray-400">
              {/* Timestamp will be provided by parent */}
            </span>
          )}
        </div>

        {/* Vote Controls and Comments - Same line */}
        <div className="flex items-center gap-2">
          {/* Vote Controls */}
          {showVotes && elementId && submissionId && (
            <UnifiedVotingDisplay
              elementId={elementId}
              elementType={elementType || 'submission'}
              submissionId={submissionId}
            />
          )}
          
          {/* Comments Counter */}
          {showComments && elementId && submissionId && (
            <button
              onClick={handleCommentToggle}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comments Section - Only show when expanded */}
      {showCommentSection && showComments && elementType === 'submission' && elementId && submissionId && (
        <div className="comments-section mt-4">
          <CommentSection
            elementId={elementId}
            elementType="submission"
            submissionId={submissionId}
            onCommentCountChange={onCommentCountChange}
          />
        </div>
      )}
    </div>
  );
}

// Styled components for different element types
export const SubmissionElement = (props: Omit<UnifiedElementProps, 'elementType'>) => (
  <UnifiedElement {...props} elementType="submission" />
);

export const CommentElement = (props: Omit<UnifiedElementProps, 'elementType'>) => (
  <UnifiedElement {...props} elementType="comment" />
);

export const ReactionElement = (props: Omit<UnifiedElementProps, 'elementType'>) => (
  <UnifiedElement {...props} elementType="reaction" />
); 