import { prisma } from './db'

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(data: {
    content: string
    authorId: string
    submissionId: string
    elementId?: string
    elementType?: string
  }) {
    return await prisma.comment.create({
      data: {
        content: data.content,
        authorId: data.authorId,
        submissionId: data.submissionId,
        elementId: data.elementId,
        elementType: data.elementType
      },
      include: {
        author: {
          select: {
            id: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
  }

  /**
   * Get comments for a submission
   */
  async getCommentsBySubmission(submissionId: string) {
    return await prisma.comment.findMany({
      where: { submissionId },
      include: {
        author: {
          select: {
            id: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        votes: {
          select: {
            id: true,
            type: true,
            voterId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get comments for a specific element
   */
  async getCommentsByElement(submissionId: string, elementId: string, elementType: string) {
    return await prisma.comment.findMany({
      where: { 
        submissionId,
        elementId,
        elementType
      },
      include: {
        author: {
          select: {
            id: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        votes: {
          select: {
            id: true,
            type: true,
            voterId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get submission-level comments (backward compatible)
   */
  async getSubmissionLevelComments(submissionId: string) {
    return await prisma.comment.findMany({
      where: { 
        submissionId,
        OR: [
          { elementId: null, elementType: null }, // Legacy comments
          { elementType: 'submission' } // New submission-level comments
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        votes: {
          select: {
            id: true,
            type: true,
            voterId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Vote on a comment
   */
  async voteOnComment(data: {
    commentId: string
    voterId: string
    voteType: 'UP' | 'DOWN'
  }) {
    // Check if user already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: data.voterId,
        commentId: data.commentId
      }
    })

    if (existingVote) {
      // Update existing vote
      return await prisma.vote.update({
        where: { id: existingVote.id },
        data: { type: data.voteType }
      })
    } else {
      // Create new vote
      return await prisma.vote.create({
        data: {
          type: data.voteType,
          voterId: data.voterId,
          commentId: data.commentId
        }
      })
    }
  }

  /**
   * Vote on a submission
   */
  async voteOnSubmission(data: {
    submissionId: string
    voterId: string
    voteType: 'UP' | 'DOWN'
  }) {
    // Check if user already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: data.voterId,
        submissionId: data.submissionId
      }
    })

    if (existingVote) {
      // Update existing vote
      return await prisma.vote.update({
        where: { id: existingVote.id },
        data: { type: data.voteType }
      })
    } else {
      // Create new vote
      return await prisma.vote.create({
        data: {
          type: data.voteType,
          voterId: data.voterId,
          submissionId: data.submissionId
        }
      })
    }
  }

  /**
   * Vote on an element (alignment, clarification, extension)
   */
  async voteOnElement(data: {
    elementId: string
    elementType: string
    submissionId: string
    voterId: string
    voteType: 'UP' | 'DOWN'
  }) {
    // Check if user already voted on this element
    const existingVote = await prisma.vote.findFirst({
      where: {
        voterId: data.voterId,
        elementId: data.elementId,
        elementType: data.elementType,
        submissionId: data.submissionId
      }
    })

    if (existingVote) {
      // Update existing vote
      return await prisma.vote.update({
        where: { id: existingVote.id },
        data: { type: data.voteType }
      })
    } else {
      // Create new vote
      return await prisma.vote.create({
        data: {
          type: data.voteType,
          voterId: data.voterId,
          elementId: data.elementId,
          elementType: data.elementType,
          submissionId: data.submissionId
        }
      })
    }
  }

  /**
   * Get vote counts for a comment
   */
  async getCommentVoteCounts(commentId: string) {
    const votes = await prisma.vote.findMany({
      where: { commentId }
    })

    return {
      upvotes: votes.filter((v: any) => v.type === 'UP').length,
      downvotes: votes.filter((v: any) => v.type === 'DOWN').length
    }
  }

  /**
   * Get vote counts for a submission
   */
  async getSubmissionVoteCounts(submissionId: string) {
    const votes = await prisma.vote.findMany({
      where: { submissionId }
    })

    return {
      upvotes: votes.filter((v: any) => v.type === 'UP').length,
      downvotes: votes.filter((v: any) => v.type === 'DOWN').length
    }
  }

  /**
   * Get vote counts for an element
   */
  async getElementVoteCounts(elementId: string, elementType: string, submissionId: string) {
    const votes = await prisma.vote.findMany({
      where: {
        elementId,
        elementType,
        submissionId
      }
    })

    const upvotes = votes.filter(vote => vote.type === 'UP').length
    const downvotes = votes.filter(vote => vote.type === 'DOWN').length

    return { upvotes, downvotes }
  }

  /**
   * Get user's vote on a comment
   */
  async getUserCommentVote(commentId: string, userId: string) {
    const vote = await prisma.vote.findFirst({
      where: {
        voterId: userId,
        commentId: commentId
      }
    })
    return vote ? vote.type.toLowerCase() : null
  }

  /**
   * Get user's vote on a submission
   */
  async getUserSubmissionVote(submissionId: string, userId: string) {
    const vote = await prisma.vote.findFirst({
      where: {
        voterId: userId,
        submissionId: submissionId
      }
    })
    return vote ? vote.type.toLowerCase() : null
  }

  /**
   * Get user's vote on an element
   */
  async getUserVote(elementId: string, elementType: string, submissionId: string, userId: string) {
    const vote = await prisma.vote.findFirst({
      where: {
        elementId,
        elementType,
        submissionId,
        voterId: userId
      }
    })

    return vote ? vote.type.toLowerCase() : null
  }
} 