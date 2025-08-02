import { prisma } from './db'

export interface PrivyUser {
  id: string
  email?: string
  wallet?: {
    address: string
  }
  linkedAccounts?: Array<{
    type: string
    address?: string
    email?: string
  }>
}

export class UserService {
  /**
   * Get or create user from Privy data
   */
  async getOrCreateUser(privyUser: PrivyUser) {
    const { id, email, wallet, linkedAccounts } = privyUser
    
    // Find existing user by Privy ID
    let user = await prisma.user.findUnique({
      where: { privyId: id }
    })
    
    if (user) {
      // Update last activity
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActivity: new Date() }
      })
      return user
    }
    
    // Extract email and wallet address
    const userEmail = email || linkedAccounts?.find(acc => acc.email)?.email
    const walletAddress = wallet?.address || linkedAccounts?.find(acc => acc.type === 'wallet')?.address
    
    // Create new user
    user = await prisma.user.create({
      data: {
        privyId: id,
        email: userEmail,
        walletAddress: walletAddress,
        signupDate: new Date(),
        lastActivity: new Date()
      }
    })
    
    return user
  }
  
  /**
   * Get user by Privy ID
   */
  async getUserByPrivyId(privyId: string) {
    return await prisma.user.findUnique({
      where: { privyId }
    })
  }
  
  /**
   * Get user activity stats
   */
  async getUserActivityStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        submissions: {
          select: { id: true }
        },
        comments: {
          select: { id: true }
        },
        votes: {
          select: { id: true, type: true }
        }
      }
    })
    
    if (!user) return null
    
    const submissionsCount = user.submissions.length
    const commentsCount = user.comments.length
    const thumbsUpReceived = user.votes.filter((v: any) => v.type === 'UP').length
    const thumbsDownReceived = user.votes.filter((v: any) => v.type === 'DOWN').length
    
    return {
      userId: user.id,
      userName: user.userName || user.firstName || user.email || 'Anonymous',
      email: user.email,
      submissions: submissionsCount,
      comments: commentsCount,
      replies: 0, // TODO: Implement replies
      thumbsupGiven: user.votes.filter((v: any) => v.type === 'UP').length,
      thumbsdownGiven: user.votes.filter((v: any) => v.type === 'DOWN').length,
      thumbsupReceived: thumbsUpReceived,
      thumbsdownReceived: thumbsDownReceived,
      commentsReceived: 0, // TODO: Implement comment replies
      repliesReceived: 0, // TODO: Implement replies
      signupDate: user.signupDate,
      firstSubmissionDate: user.submissions.length > 0 ? user.submissions[0].id : null, // TODO: Fix this
      lastActivityDate: user.lastActivity
    }
  }
  
  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: {
    firstName?: string
    lastName?: string
    userName?: string
    avatar?: string
  }) {
    return await prisma.user.update({
      where: { id: userId },
      data
    })
  }
}