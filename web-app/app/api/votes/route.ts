import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { submissionInteractionService } from '@/lib/submissionInteractionService';
import { UserService } from '@/lib/userService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');
    const commentId = searchParams.get('commentId');

    // Only log for Scott Yates submission to reduce noise
    if (submissionId === 'cmds3zumt00s3h2108o3bojs9') {
      console.log('🔵 [Votes API] Scott Yates submission vote request:', { submissionId, elementId, elementType, commentId });
    }

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // Try to get user authentication if available
    let userId: string | undefined;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      try {
        const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
        const token = authHeader.replace('Bearer ', '');
        const verifiedClaims = await privy.verifyAuthToken(token);
        
        if (verifiedClaims) {
          const userService = new UserService();
          const user = await userService.getUserByPrivyId(verifiedClaims.userId);
          if (user) {
            userId = user.id;
          }
        }
      } catch (error) {
        // Continue without user authentication
      }
    }

    // If this is for a comment, use commentId
    if (commentId) {
      const { prisma } = await import('@/lib/db');
      
      const votes = await prisma.vote.findMany({
        where: {
          commentId,
          submissionId
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
      
      // Find user's vote if authenticated
      let userVote: 'UP' | 'DOWN' | null = null;
      if (userId) {
        const userVoteRecord = votes.find(v => v.voterId === userId);
        userVote = userVoteRecord?.type || null;
      }

      return NextResponse.json({ votes, upvotes, downvotes, userVote });
    }

    // If this is for a specific element (not comment), use the existing logic
    if (elementId && elementType) {
      const { prisma } = await import('@/lib/db');
      
      const votes = await prisma.vote.findMany({
        where: {
          submissionId,
          elementId,
          elementType
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
      
      // Find user's vote if authenticated
      let userVote: 'UP' | 'DOWN' | null = null;
      if (userId) {
        const userVoteRecord = votes.find(v => v.voterId === userId);
        userVote = userVoteRecord?.type || null;
      }

      return NextResponse.json({ votes, upvotes, downvotes, userVote });
    }

    // For submission-level reactions, get ALL votes for the submission
    const { prisma } = await import('@/lib/db');
    
    const votes = await prisma.vote.findMany({
      where: {
        submissionId
        // Include ALL votes for the submission (submission-level, element-level, comment-level)
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
    
    // Find user's vote if authenticated
    let userVote: 'UP' | 'DOWN' | null = null;
    if (userId) {
      const userVoteRecord = votes.find(v => v.voterId === userId);
      userVote = userVoteRecord?.type || null;
    }

    return NextResponse.json({ votes, upvotes, downvotes, userVote });
  } catch (error) {
    console.error('🔴 [Votes API] Error fetching reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔵 [Votes API] POST request received');
  console.log('🔵 [Votes API] Request URL:', request.url);
  console.log('🔵 [Votes API] Request method:', request.method);
  console.log('🔵 [Votes API] Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    console.log('🔵 [Votes API] Creating PrivyClient...');
    const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
    console.log('🔵 [Votes API] PrivyClient created, APP_ID length:', process.env.PRIVY_APP_ID?.length || 0);
    
    console.log('🔵 [Votes API] Creating UserService...');
    const userService = new UserService();
    
    const authHeader = request.headers.get('authorization');
    console.log('🔵 [Votes API] Auth header present:', !!authHeader);
    console.log('🔵 [Votes API] Auth header value:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null');
    
    if (!authHeader) {
      console.log('🔴 [Votes API] No auth header provided - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔵 [Votes API] Token extracted, length:', token.length);
    console.log('🔵 [Votes API] Token preview:', `${token.substring(0, 20)}...`);
    
    console.log('🔵 [Votes API] Verifying token with Privy...');
    const verifiedClaims = await privy.verifyAuthToken(token);
    console.log('🔵 [Votes API] Token verification result:', !!verifiedClaims);
    console.log('🔵 [Votes API] Verified claims:', verifiedClaims);
    
    if (!verifiedClaims) {
      console.log('🔴 [Votes API] Token verification failed - returning 401');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const privyUserId = verifiedClaims.userId;
    console.log('🔵 [Votes API] Privy user ID extracted:', privyUserId);
    console.log('🔵 [Votes API] Verified claims keys:', Object.keys(verifiedClaims));
    
    // Convert Privy user ID to internal user ID, create user if doesn't exist
    console.log('🔵 [Votes API] Looking up user by Privy ID...');
    let user = await userService.getUserByPrivyId(privyUserId);
    console.log('🔵 [Votes API] User lookup result:', user ? `Found user ${user.id}` : 'User not found');
    console.log('🔵 [Votes API] User details:', user);
    
    if (!user) {
      console.log('🔵 [Votes API] Creating new user...');
      // Create a basic user if they don't exist
      const { prisma } = await import('@/lib/db');
      console.log('🔵 [Votes API] Prisma imported, creating user...');
      
      // Extract user information from Privy claims
      const userEmail = (verifiedClaims as any).email || `user-${privyUserId}@temp.com`;
      const userName = (verifiedClaims as any).name || (verifiedClaims as any).email?.split('@')[0] || `User-${privyUserId.slice(-6)}`;
      
      try {
        user = await prisma.user.create({
          data: {
            privyId: privyUserId,
            email: userEmail,
            userName: userName,
            signupDate: new Date(),
            lastActivity: new Date()
          }
        });
        console.log(`🔵 [Votes API] Created new user: ${user.id} for Privy ID: ${privyUserId}, email: ${user.email}, userName: ${user.userName}`);
      } catch (error) {
        console.error('🔴 [Votes API] Error creating user:', error);
        throw error;
      }
    } else {
      // Update existing user's last activity
      const { prisma } = await import('@/lib/db');
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActivity: new Date() }
      });
    }
    
    console.log('🔵 [Votes API] Parsing request body...');
    const body = await request.json();
    console.log('🔵 [Votes API] Raw request body:', body);
    
    const { submissionId, elementId, elementType, commentId, type } = body;
    console.log('🔵 [Votes API] Extracted fields:', {
      submissionId,
      elementId,
      elementType,
      commentId,
      type
    });

    if (!submissionId || !type) {
      console.log('🔴 [Votes API] Missing required fields:', { submissionId, type });
      return NextResponse.json({ error: 'Submission ID and vote type are required' }, { status: 400 });
    }

    if (!['UP', 'DOWN'].includes(type)) {
      console.log('🔴 [Votes API] Invalid vote type:', type);
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
    }

    // If this is for a comment, use commentId
    if (commentId) {
      console.log('🔵 [Votes API] Processing comment vote...');
      const { prisma } = await import('@/lib/db');
      
      // Check if user already has a vote on this comment
      console.log('🔵 [Votes API] Checking for existing comment vote...');
      const existingVote = await prisma.vote.findFirst({
        where: {
          commentId,
          voterId: user.id,
          submissionId
        }
      });

      console.log('🔵 [Votes API] Existing comment vote found:', !!existingVote, existingVote ? `ID: ${existingVote.id}, Type: ${existingVote.type}` : '');

      if (existingVote) {
        if (existingVote.type === type) {
          console.log('🔵 [Votes API] Removing existing comment vote (same type)');
          // Remove vote if same type
          await prisma.vote.delete({
            where: { id: existingVote.id }
          });
        } else {
          console.log('🔵 [Votes API] Updating existing comment vote type');
          // Update vote type
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { type }
          });
        }
      } else {
        console.log('🔵 [Votes API] Creating new comment vote...');
        // Create new vote
        const newVote = await prisma.vote.create({
          data: {
            submissionId,
            voterId: user.id,
            type,
            commentId,
            elementId: null,
            elementType: null
          }
        });
        console.log('🔵 [Votes API] New comment vote created:', newVote.id);
      }

      // Get updated counts for comment
      console.log('🔵 [Votes API] Getting updated comment vote counts...');
      const votes = await prisma.vote.findMany({
        where: {
          commentId,
          submissionId
        }
      });

      console.log('🔵 [Votes API] Found comment votes for counting:', votes.length);
      console.log('🔵 [Votes API] Comment vote details for counting:', votes.map(v => ({
        id: v.id,
        type: v.type,
        voterId: v.voterId
      })));

      const upvotes = votes.filter(v => v.type === 'UP').length;
      const downvotes = votes.filter(v => v.type === 'DOWN').length;

      console.log('🔵 [Votes API] Final comment counts:', { upvotes, downvotes });
      return NextResponse.json({ votes, upvotes, downvotes });
    }

    // If this is for a specific element (not comment), use the existing logic
    if (elementId && elementType) {
      console.log('🔵 [Votes API] Processing element-specific vote...');
      const { prisma } = await import('@/lib/db');
      
      // Check if user already has a vote
      console.log('🔵 [Votes API] Checking for existing vote...');
      const existingVote = await prisma.vote.findFirst({
        where: {
          submissionId,
          voterId: user.id,
          elementId,
          elementType
        }
      });

      console.log('🔵 [Votes API] Existing vote found:', !!existingVote, existingVote ? `ID: ${existingVote.id}, Type: ${existingVote.type}` : '');

      if (existingVote) {
        if (existingVote.type === type) {
          console.log('🔵 [Votes API] Removing existing vote (same type)');
          // Remove vote if same type
          await prisma.vote.delete({
            where: { id: existingVote.id }
          });
        } else {
          console.log('🔵 [Votes API] Updating existing vote type');
          // Update vote type
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { type }
          });
        }
      } else {
        console.log('🔵 [Votes API] Creating new vote...');
        // Create new vote
        const newVote = await prisma.vote.create({
          data: {
            submissionId,
            voterId: user.id,
            type,
            elementId,
            elementType,
            commentId: null
          }
        });
        console.log('🔵 [Votes API] New vote created:', newVote.id);
      }

      // Get updated counts
      console.log('🔵 [Votes API] Getting updated vote counts...');
      const votes = await prisma.vote.findMany({
        where: {
          submissionId,
          elementId,
          elementType
        }
      });

      console.log('🔵 [Votes API] Found votes for counting:', votes.length);
      console.log('🔵 [Votes API] Vote details for counting:', votes.map(v => ({
        id: v.id,
        type: v.type,
        voterId: v.voterId
      })));

      const upvotes = votes.filter(v => v.type === 'UP').length;
      const downvotes = votes.filter(v => v.type === 'DOWN').length;

      console.log('🔵 [Votes API] Final counts:', { upvotes, downvotes });
      return NextResponse.json({ votes, upvotes, downvotes });
    }

    // For submission-level reactions, use the unified service
    console.log('🔵 [Votes API] Processing submission-level reaction...');
    console.log('🔵 [Votes API] Calling submissionInteractionService.addSubmissionLevelReaction with:', {
      submissionId,
      userId: user.id,
      type
    });
    
    const result = await submissionInteractionService.addSubmissionLevelReaction(submissionId, user.id, type);
    
    console.log('🔵 [Votes API] Submission-level reaction result:', result);
    
    if (!result.success) {
      console.error('🔴 [Votes API] Failed to add submission level reaction:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('🔵 [Votes API] Returning submission-level reaction data');
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('🔴 [Votes API] Error processing vote:', error);
    console.error('🔴 [Votes API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 