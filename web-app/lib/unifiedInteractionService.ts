import { prisma } from './db';
import { PrivyClient } from '@privy-io/server-auth';

export interface ElementData {
  id: string;
  type: 'submission' | 'comment' | 'reaction';
  submissionId?: string;
  elementId?: string;
  elementType?: string;
  content?: string;
  voteType?: 'UP' | 'DOWN';
  authorId?: string;
}

export interface DisplayData {
  id: string;
  type: 'submission' | 'comment' | 'reaction';
  content?: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'UP' | 'DOWN';
  comments?: DisplayData[];
  createdAt?: Date;
  author?: {
    firstName?: string;
    lastName?: string;
  };
}

export class UnifiedInteractionService {
  private privyClient: PrivyClient;

  constructor() {
    this.privyClient = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  }

  /**
   * Save any element (submission, comment, reaction)
   */
  async saveElement(elementData: ElementData, authToken?: string): Promise<DisplayData> {
    // console.log('🔵 [UnifiedInteractionService] saveElement called with:', {
    //   elementData,
    //   hasAuthToken: !!authToken,
    //   authTokenLength: authToken?.length
    // });

    try {
      let userId: string | undefined;
      
      if (authToken) {
        // console.log('🔵 [UnifiedInteractionService] Verifying auth token...');
        const verifiedClaims = await this.privyClient.verifyAuthToken(authToken);
        userId = verifiedClaims.userId;
        // console.log('🔵 [UnifiedInteractionService] Auth token verified, userId:', userId);
      } else {
        // console.log('🔵 [UnifiedInteractionService] No auth token provided');
      }

      // console.log('🔵 [UnifiedInteractionService] Processing element type:', elementData.type);

      switch (elementData.type) {
        case 'submission':
          return await this.saveSubmission(elementData, userId);
        case 'comment':
          return await this.saveComment(elementData, userId);
        case 'reaction':
          return await this.saveReaction(elementData, userId);
        default:
          throw new Error(`Unknown element type: ${elementData.type}`);
      }
    } catch (error) {
      console.error('🔴 [UnifiedInteractionService] Error saving element:', error);
      throw error;
    }
  }

  /**
   * Display any element with its associated data
   */
  async displayElement(elementId: string, elementType: string, submissionId?: string, userId?: string): Promise<DisplayData> {
    try {
      switch (elementType) {
        case 'submission':
          return await this.displaySubmission(elementId, userId);
        case 'comment':
          return await this.displayComment(elementId, userId);
        case 'reaction':
          if (!submissionId) {
            throw new Error('submissionId is required for reaction elements');
          }
          return await this.displayReaction(elementId, elementType, submissionId, userId);
        default:
          throw new Error(`Unknown element type: ${elementType}`);
      }
    } catch (error) {
      console.error('Error displaying element:', error);
      throw error;
    }
  }

  /**
   * Get all elements of a specific type for a submission
   */
  async getSubmissionElements(submissionId: string, elementType: string, userId?: string): Promise<DisplayData[]> {
    try {
      switch (elementType) {
        case 'comment':
          return await this.getSubmissionComments(submissionId, userId);
        case 'reaction':
          return await this.getSubmissionReactions(submissionId, userId);
        default:
          throw new Error(`Unknown element type: ${elementType}`);
      }
    } catch (error) {
      console.error('Error getting submission elements:', error);
      throw error;
    }
  }

  /**
   * Create a modal link for any element
   */
  createElementModalLink(elementId: string, elementType: string, submissionId?: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.themetalayer.org';
    
    switch (elementType) {
      case 'submission':
        return `${baseUrl}/submission/${elementId}`;
      case 'comment':
        return `${baseUrl}/submission/${submissionId}?comment=${elementId}`;
      case 'reaction':
        return `${baseUrl}/submission/${submissionId}?reaction=${elementId}`;
      default:
        return `${baseUrl}/submission/${submissionId}`;
    }
  }

  /**
   * Add event listener for any element interaction
   */
  addElementEventListener(
    elementId: string, 
    elementType: string, 
    eventType: 'click' | 'submit' | 'vote',
    handler: (event: any) => void
  ): () => void {
    const element = document.querySelector(`[data-element-id="${elementId}"][data-element-type="${elementType}"]`);
    
    if (element) {
      element.addEventListener(eventType, handler);
      
      // Return cleanup function
      return () => {
        element.removeEventListener(eventType, handler);
      };
    }
    
    return () => {}; // No-op cleanup
  }

  // Private methods for specific element types
  private async saveSubmission(elementData: ElementData, userId?: string): Promise<DisplayData> {
    // console.log('🔵 [UnifiedInteractionService] saveSubmission called with:', {
    //   elementData,
    //   userId
    // });

    if (!userId || !elementData.content || !elementData.submissionId) {
      console.error('🔴 [UnifiedInteractionService] Missing required fields for submission:', {
        hasUserId: !!userId,
        hasContent: !!elementData.content,
        hasSubmissionId: !!elementData.submissionId
      });
      throw new Error('Missing required fields for submission');
    }

    // For now, we'll just return the existing submission data
    // since submission creation is handled by the existing submission API
          // console.log('🔵 [UnifiedInteractionService] Returning existing submission data');
    return await this.displaySubmission(elementData.submissionId, userId);
  }

  private async saveComment(elementData: ElementData, userId?: string): Promise<DisplayData> {
    if (!userId || !elementData.content || !elementData.submissionId) {
      throw new Error('Missing required fields for comment');
    }

    const comment = await prisma.comment.create({
      data: {
        content: elementData.content,
        authorId: userId,
        submissionId: elementData.submissionId,
        elementId: elementData.elementId,
        elementType: elementData.elementType,
      },
      include: {
        author: true,
        votes: true,
      },
    });

    return this.formatCommentForDisplay(comment, userId);
  }

  private async saveReaction(elementData: ElementData, userId?: string): Promise<DisplayData> {
    // console.log('🔵 [UnifiedInteractionService] saveReaction called with:', {
    //   elementData,
    //   userId,
    //   hasUserId: !!userId,
    //   hasVoteType: !!elementData.voteType,
    //   hasSubmissionId: !!elementData.submissionId
    // });

    if (!userId || !elementData.voteType || !elementData.submissionId) {
      console.error('🔴 [UnifiedInteractionService] Missing required fields for reaction:', {
        hasUserId: !!userId,
        hasVoteType: !!elementData.voteType,
        hasSubmissionId: !!elementData.submissionId
      });
      throw new Error('Missing required fields for reaction');
    }

    // console.log('🔵 [UnifiedInteractionService] Checking for existing vote...');
    // Check if user already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: userId,
        submissionId: elementData.submissionId,
        elementId: elementData.elementId,
        elementType: elementData.elementType,
      },
    });

    // console.log('🔵 [UnifiedInteractionService] Existing vote found:', !!existingVote);

    if (existingVote) {
      // console.log('🔵 [UnifiedInteractionService] Updating existing vote:', existingVote.id);
      // Update existing vote
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { type: elementData.voteType },
      });
      // console.log('🔵 [UnifiedInteractionService] Vote updated successfully');
    } else {
      // console.log('🔵 [UnifiedInteractionService] Creating new vote...');
      // Create new vote
      const newVote = await prisma.vote.create({
        data: {
          type: elementData.voteType,
          voterId: userId,
          submissionId: elementData.submissionId,
          elementId: elementData.elementId,
          elementType: elementData.elementType,
        },
      });
      // console.log('🔵 [UnifiedInteractionService] New vote created:', newVote.id);
    }

    // console.log('🔵 [UnifiedInteractionService] Getting updated vote counts...');
    // Return updated vote counts
    return await this.getVoteCounts(elementData.submissionId, elementData.elementId, elementData.elementType, userId);
  }

  private async displaySubmission(submissionId: string, userId?: string): Promise<DisplayData> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: true,
        votes: true,
        comments: {
          include: {
            author: true,
            votes: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    return this.formatSubmissionForDisplay(submission, userId);
  }

  private async displayComment(commentId: string, userId?: string): Promise<DisplayData> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        votes: true,
      },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    return this.formatCommentForDisplay(comment, userId);
  }

  private async displayReaction(elementId: string, elementType: string, submissionId: string, userId?: string): Promise<DisplayData> {
    return await this.getVoteCounts(submissionId, elementId, elementType, userId);
  }

  private async getSubmissionComments(submissionId: string, userId?: string): Promise<DisplayData[]> {
    const comments = await prisma.comment.findMany({
      where: { 
        submissionId,
        elementId: null, // Only submission-level comments
        elementType: null,
      },
      include: {
        author: true,
        votes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(comment => this.formatCommentForDisplay(comment, userId));
  }

  private async getSubmissionReactions(submissionId: string, userId?: string): Promise<DisplayData[]> {
    const votes = await prisma.vote.findMany({
      where: { 
        submissionId,
        elementId: null, // Only submission-level reactions
        elementType: null,
      },
      include: {
        voter: true,
      },
    });

    return this.aggregateVotes(votes, userId);
  }

  private async getVoteCounts(submissionId: string, elementId?: string, elementType?: string, userId?: string): Promise<DisplayData> {
    // console.log('🔵 [UnifiedInteractionService] getVoteCounts called with:', {
    //   submissionId,
    //   elementId,
    //   elementType,
    //   userId
    // });

    const votes = await prisma.vote.findMany({
      where: {
        submissionId,
        elementId,
        elementType,
      },
      include: {
        voter: true,
      },
    });

    // console.log('🔵 [UnifiedInteractionService] Found votes:', votes.length, 'votes');
    // console.log('🔵 [UnifiedInteractionService] Vote details:', votes.map(v => ({
    //   id: v.id,
    //   type: v.type,
    //   voterId: v.voterId,
    //   submissionId: v.submissionId,
    //   elementId: v.elementId,
    //   elementType: v.elementType
    // })));

    const aggregated = this.aggregateVotes(votes, userId);
    // console.log('🔵 [UnifiedInteractionService] Aggregated result:', aggregated[0]);
    
    return aggregated[0] || { id: elementId || submissionId, type: 'reaction', upvotes: 0, downvotes: 0 };
  }

  private aggregateVotes(votes: any[], userId?: string): DisplayData[] {
    // console.log('🔵 [UnifiedInteractionService] aggregateVotes called with:', {
    //   votesCount: votes.length,
    //   userId
    // });

    const voteCounts = votes.reduce((acc, vote) => {
      const key = vote.elementId || vote.submissionId;
      if (!acc[key]) {
        acc[key] = { upvotes: 0, downvotes: 0, userVote: undefined };
      }
      
      if (vote.type === 'UP') {
        acc[key].upvotes++;
      } else {
        acc[key].downvotes++;
      }
      
      if (vote.voterId === userId) {
        acc[key].userVote = vote.type;
      }
      
      return acc;
    }, {} as Record<string, { upvotes: number; downvotes: number; userVote?: 'UP' | 'DOWN' }>);

    // console.log('🔵 [UnifiedInteractionService] Vote counts before aggregation:', voteCounts);

    const result = Object.entries(voteCounts).map(([id, counts]) => {
      const c = counts as { upvotes: number; downvotes: number; userVote?: 'UP' | 'DOWN' };
      return {
        id,
        type: 'reaction' as const,
        upvotes: c.upvotes,
        downvotes: c.downvotes,
        userVote: c.userVote,
      };
    });

    // console.log('🔵 [UnifiedInteractionService] Aggregated votes result:', result);
    return result;
  }

  private formatSubmissionForDisplay(submission: any, userId?: string): DisplayData {
    const userVote = submission.votes.find((v: any) => v.voterId === userId)?.type;
    
    return {
      id: submission.id,
      type: 'submission',
      content: submission.overview,
      upvotes: submission.votes.filter((v: any) => v.type === 'UP').length,
      downvotes: submission.votes.filter((v: any) => v.type === 'DOWN').length,
      userVote,
      createdAt: submission.createdAt,
      author: {
        firstName: submission.submitter.firstName,
        lastName: submission.submitter.lastName,
      },
    };
  }

  private formatCommentForDisplay(comment: any, userId?: string): DisplayData {
    const userVote = comment.votes.find((v: any) => v.voterId === userId)?.type;
    
    return {
      id: comment.id,
      type: 'comment',
      content: comment.content,
      upvotes: comment.votes.filter((v: any) => v.type === 'UP').length,
      downvotes: comment.votes.filter((v: any) => v.type === 'DOWN').length,
      userVote,
      createdAt: comment.createdAt,
      author: {
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
      },
    };
  }
}

export const unifiedInteractionService = new UnifiedInteractionService(); 