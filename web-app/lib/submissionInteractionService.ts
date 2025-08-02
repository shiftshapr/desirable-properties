import { prisma } from './db';

interface InteractionResult {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

interface LogEntry {
  timestamp: string;
  action: string;
  elementId: string;
  elementType: string;
  submissionId: string;
  userId?: string;
  success: boolean;
  error?: string;
  details?: any;
}

class SubmissionInteractionService {
  private logs: LogEntry[] = [];

  private log(action: string, elementId: string, elementType: string, submissionId: string, success: boolean, userId?: string, error?: string, details?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      action,
      elementId,
      elementType,
      submissionId,
      userId,
      success,
      error,
      details
    };
    
    this.logs.push(logEntry);
    console.log(`[SubmissionInteraction] ${action}:`, { elementId, elementType, submissionId, success, error, details });
  }

  async getSubmissionLevelReactions(submissionId: string, userId?: string): Promise<InteractionResult> {
    try {
      this.log('getSubmissionLevelReactions', 'submission', 'submission', submissionId, true, userId);
      
      const votes = await prisma.vote.findMany({
        where: {
          submissionId,
          commentId: null, // Only submission-level votes
          elementId: null,
          elementType: null
        },
        include: {
          voter: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          }
        }
      });

      const upvotes = votes.filter(v => v.type === 'UP').length;
      const downvotes = votes.filter(v => v.type === 'DOWN').length;

      // Find user's vote if userId is provided
      let userVote: 'UP' | 'DOWN' | null = null;
      if (userId) {
        const userVoteRecord = votes.find(v => v.voterId === userId);
        userVote = userVoteRecord?.type || null;
      }

      return {
        success: true,
        data: { votes, upvotes, downvotes, userVote },
        count: votes.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🔴 [SubmissionInteraction] Error in getSubmissionLevelReactions:', error);
      this.log('getSubmissionLevelReactions', 'submission', 'submission', submissionId, false, undefined, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getSubmissionLevelComments(submissionId: string): Promise<InteractionResult> {
    try {
      this.log('getSubmissionLevelComments', 'submission', 'submission', submissionId, true);
      
      const comments = await prisma.comment.findMany({
        where: {
          submissionId,
          OR: [
            { elementId: null, elementType: null }, // Legacy submission-level comments
            { elementId: submissionId, elementType: 'submission' } // New submission-level comments
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          },
          votes: {
            include: {
              voter: {
                select: {
                  id: true,
                  userName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate vote counts for each comment
      const commentsWithVotes = comments.map(comment => {
        const upvotes = comment.votes.filter(v => v.type === 'UP').length;
        const downvotes = comment.votes.filter(v => v.type === 'DOWN').length;
        
        return { ...comment, upvotes, downvotes };
      });

      return {
        success: true,
        data: commentsWithVotes,
        count: comments.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('getSubmissionLevelComments', 'submission', 'submission', submissionId, false, undefined, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async addSubmissionLevelReaction(submissionId: string, userId: string, type: 'UP' | 'DOWN'): Promise<InteractionResult> {
    try {
      console.log('🔵 [SubmissionInteraction] addSubmissionLevelReaction called:', { submissionId, userId, type });
      this.log('addSubmissionLevelReaction', 'submission', 'submission', submissionId, true, userId, undefined, { type });
      
      // Check if user already has a vote
      console.log('🔵 [SubmissionInteraction] Checking for existing vote...');
      const existingVote = await prisma.vote.findFirst({
        where: {
          submissionId,
          voterId: userId,
          commentId: null,
          elementId: null,
          elementType: null
        }
      });

      console.log('🔵 [SubmissionInteraction] Existing vote found:', !!existingVote, existingVote ? `ID: ${existingVote.id}, Type: ${existingVote.type}` : '');

      if (existingVote) {
        if (existingVote.type === type) {
          console.log('🔵 [SubmissionInteraction] Removing existing vote (same type)');
          // Remove vote if same type
          await prisma.vote.delete({
            where: { id: existingVote.id }
          });
          this.log('removeSubmissionLevelVote', 'submission', 'submission', submissionId, true, userId);
        } else {
          console.log('🔵 [SubmissionInteraction] Updating existing vote type');
          // Update vote type
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { type }
          });
          this.log('updateSubmissionLevelVote', 'submission', 'submission', submissionId, true, userId, undefined, { type });
        }
      } else {
        console.log('🔵 [SubmissionInteraction] Creating new vote...');
        // Create new vote
        const newVote = await prisma.vote.create({
          data: {
            submissionId,
            voterId: userId,
            type,
            commentId: null,
            elementId: null,
            elementType: null
          }
        });
        console.log('🔵 [SubmissionInteraction] New vote created:', newVote.id);
        this.log('createSubmissionLevelVote', 'submission', 'submission', submissionId, true, userId, undefined, { type });
      }

      // Get updated counts
      console.log('🔵 [SubmissionInteraction] Getting updated counts...');
      const result = await this.getSubmissionLevelReactions(submissionId);
      console.log('🔵 [SubmissionInteraction] Final result:', result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🔴 [SubmissionInteraction] Error in addSubmissionLevelReaction:', error);
      this.log('addSubmissionLevelReaction', 'submission', 'submission', submissionId, false, userId, errorMessage, { type });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async addSubmissionLevelComment(submissionId: string, userId: string, content: string): Promise<InteractionResult> {
    try {
      this.log('addSubmissionLevelComment', 'submission', 'submission', submissionId, true, userId, undefined, { content });
      
      const comment = await prisma.comment.create({
        data: {
          submissionId,
          authorId: userId,
          content,
          elementId: null,
          elementType: null
        },
        include: {
          author: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          }
        }
      });

      // Get updated comments
      const result = await this.getSubmissionLevelComments(submissionId);
      return {
        ...result,
        data: { comment, comments: result.data }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('addSubmissionLevelComment', 'submission', 'submission', submissionId, false, userId, errorMessage, { content });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async updateSubmissionLevelComment(commentId: string, userId: string, content: string): Promise<InteractionResult> {
    try {
      this.log('updateSubmissionLevelComment', 'submission', 'submission', 'unknown', true, userId, undefined, { commentId, content });
      
      const comment = await prisma.comment.update({
        where: {
          id: commentId,
          authorId: userId // Ensure user owns the comment
        },
        data: {
          content
        },
        include: {
          author: {
            select: {
              id: true,
              userName: true,
              email: true
            }
          }
        }
      });

      return {
        success: true,
        data: { comment }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('updateSubmissionLevelComment', 'submission', 'submission', 'unknown', false, userId, errorMessage, { commentId, content });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async deleteSubmissionLevelComment(commentId: string, userId: string): Promise<InteractionResult> {
    try {
      this.log('deleteSubmissionLevelComment', 'submission', 'submission', 'unknown', true, userId, undefined, { commentId });
      
      await prisma.comment.delete({
        where: {
          id: commentId,
          authorId: userId // Ensure user owns the comment
        }
      });

      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('deleteSubmissionLevelComment', 'submission', 'submission', 'unknown', false, userId, errorMessage, { commentId });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const submissionInteractionService = new SubmissionInteractionService(); 