import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface VoteButtonsProps {
  elementId: string;
  elementType?: string;
  submissionId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  showComments?: boolean;
  commentCount?: number;
  onCommentToggle?: () => void;
  onVoteChange?: (vote: string) => void;
}

export default function VoteButtons({
  elementId,
  elementType,
  submissionId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  showComments = true,
  commentCount = 0,
  onCommentToggle = () => {},
  onVoteChange = () => {}
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const { getAccessToken } = useAuth();

  const handleVote = async (type: 'UP' | 'DOWN') => {
    console.log(`⚠️ [OLD VOTE BUTTONS] Vote clicked: ${elementType} ${elementId} - ${type}`);
    console.log(`⚠️ [OLD VOTE BUTTONS] This should be using UnifiedVotingDisplay!`);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        console.log(`⚠️ [OLD VOTE BUTTONS] No auth token available`);
        return;
      }

      // Call onVoteChange callback
      onVoteChange(type.toLowerCase());

      console.log(`⚠️ [OLD VOTE BUTTONS] Calling API with token: ${token?.substring(0, 10)}...`);
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          elementId, 
          voteType: type,
          submissionId,
          elementType 
        })
      });

      if (!response.ok) throw new Error('Vote failed');
      
      const data = await response.json();
      setUpvotes(data.upvotes || 0);
      setDownvotes(data.downvotes || 0);
    } catch (error) {
      console.error('Voting error:', error);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button 
        onClick={() => handleVote('UP')}
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <ThumbsUp size={16} />
        <span>{upvotes}</span>
      </button>
      
      <button 
        onClick={() => handleVote('DOWN')}
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <ThumbsDown size={16} />
        <span>{downvotes}</span>
      </button>

      {showComments && (
        <button 
          onClick={onCommentToggle}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            marginLeft: '8px'
          }}
        >
          <MessageCircle size={16} />
          <span>{commentCount}</span>
        </button>
      )}
    </div>
  );
}