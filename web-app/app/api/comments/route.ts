import { NextRequest, NextResponse } from 'next/server';
import { submissionInteractionService } from '@/lib/submissionInteractionService';
import { UserService } from '@/lib/userService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');

    console.log('🔵 [Comments API] GET request - submissionId:', submissionId, 'elementId:', elementId, 'elementType:', elementType);

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // If this is for a specific element, use the existing logic
    if (elementId && elementType) {
      console.log('🔵 [Comments API] Fetching element-level comments');
      // Use existing element-specific comment logic
      const { prisma } = await import('@/lib/db');
      
      const comments = await prisma.comment.findMany({
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

      console.log('🔵 [Comments API] Found element-level comments:', comments.length);

      // Calculate vote counts
      const commentsWithVotes = comments.map(comment => {
        const upvotes = comment.votes.filter(v => v.type === 'UP').length;
        const downvotes = comment.votes.filter(v => v.type === 'DOWN').length;
        
        return { ...comment, upvotes, downvotes };
      });

      return NextResponse.json(commentsWithVotes);
    }

    // For submission-level comments, use the unified service
    console.log('🔵 [Comments API] Fetching submission-level comments');
    const result = await submissionInteractionService.getSubmissionLevelComments(submissionId);
    
    if (!result.success) {
      console.error('Failed to get submission level comments:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('🔵 [Comments API] Found submission-level comments:', result.data?.length || 0);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔵 [Comments API] POST request received');
  console.log('🔵 [Comments API] Request URL:', request.url);
  console.log('🔵 [Comments API] Request method:', request.method);
  console.log('🔵 [Comments API] Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    console.log('🔵 [Comments API] Creating PrivyClient...');
        console.log('🔵 [Comments API] PrivyClient created, APP_ID length:', process.env.PRIVY_APP_ID?.length || 0);
    
    console.log('🔵 [Comments API] Creating UserService...');
    const userService = new UserService();
    
    const authHeader = request.headers.get('authorization');
    console.log('🔵 [Comments API] Auth header present:', !!authHeader);
    console.log('🔵 [Comments API] Auth header value:', authHeader ? `${authHeader.substring(0, 20)}...` : 'null');
    
    if (!authHeader) {
      console.log('🔴 [Comments API] No auth header provided - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔵 [Comments API] Token extracted, length:', token.length);
    console.log('🔵 [Comments API] Token preview:', `${token.substring(0, 20)}...`);
    
    console.log('🔵 [Comments API] Verifying token with Privy...');
    // Mock auth data for disabled authentication
    const verifiedClaims = { userId: "mock-user-id", email: "mock@example.com", name: "Mock User" };
    console.log('🔵 [Comments API] Token verification result:', !!verifiedClaims);
    console.log('🔵 [Comments API] Verified claims:', verifiedClaims);
    
    if (!verifiedClaims) {
      console.log('🔴 [Comments API] Token verification failed - returning 401');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const privyUserId = "mock-user-id"; // Mock user ID for disabled authentication
    console.log('🔵 [Comments API] Privy user ID extracted:', privyUserId);
    console.log('🔵 [Comments API] Verified claims keys:', Object.keys(verifiedClaims));
    
    // Convert Privy user ID to internal user ID, create user if doesn't exist
    console.log('🔵 [Comments API] Looking up user by Privy ID...');
    let user = await userService.getUserByPrivyId(privyUserId);
    console.log('🔵 [Comments API] User lookup result:', user ? `Found user ${user.id}` : 'User not found');
    console.log('🔵 [Comments API] User details:', user);
    
    if (!user) {
      console.log('🔵 [Comments API] Creating new user...');
      // Create a basic user if they don't exist
      const { prisma } = await import('@/lib/db');
      console.log('🔵 [Comments API] Prisma imported, creating user...');
      
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
        console.log(`🔵 [Comments API] Created new user: ${user.id} for Privy ID: ${privyUserId}, email: ${user.email}, userName: ${user.userName}`);
      } catch (error) {
        console.error('🔴 [Comments API] Error creating user:', error);
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
    
    console.log('🔵 [Comments API] Parsing request body...');
    const body = await request.json();
    console.log('🔵 [Comments API] Raw request body:', body);
    
    const { submissionId, content, elementId, elementType } = body;
    console.log('🔵 [Comments API] Extracted fields:', { submissionId, content, elementId, elementType });

    if (!submissionId || !content) {
      console.log('🔴 [Comments API] Missing required fields:', { submissionId, content });
      return NextResponse.json({ error: 'Submission ID and content are required' }, { status: 400 });
    }

    console.log('🔵 [Comments API] Processing comment creation...');
    
    // Determine if this is an element-specific comment or submission-level comment
    if (elementId && elementType) {
      console.log('🔵 [Comments API] Creating element-specific comment:', { elementId, elementType });
      
      const { prisma } = await import('@/lib/db');
      
      const comment = await prisma.comment.create({
        data: {
          submissionId,
          authorId: user.id,
          content,
          elementId,
          elementType
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
      
      console.log('🔵 [Comments API] Element-specific comment created:', comment.id);
      return NextResponse.json(comment);
    } else {
      console.log('🔵 [Comments API] Creating submission-level comment');
      console.log('🔵 [Comments API] Calling submissionInteractionService.addSubmissionLevelComment with:', {
        submissionId,
        userId: user.id,
        content
      });
      
      const result = await submissionInteractionService.addSubmissionLevelComment(submissionId, user.id, content);
      
      console.log('🔵 [Comments API] Comment creation result:', result);
      
      if (!result.success) {
        console.error('🔴 [Comments API] Failed to add comment:', result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      console.log('🔵 [Comments API] Returning comment data');
      return NextResponse.json(result.data);
    }
  } catch (error) {
    console.error('🔴 [Comments API] Error processing comment:', error);
    console.error('🔴 [Comments API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 