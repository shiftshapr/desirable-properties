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
      return NextResponse.json({ error: 'Submission ID is required' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
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

      return NextResponse.json(commentsWithVotes, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // For submission-level comments, use the unified service
    console.log('🔵 [Comments API] Fetching submission-level comments');
    const result = await submissionInteractionService.getSubmissionLevelComments(submissionId);
    
    if (!result.success) {
      console.error('Failed to get submission level comments:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('🔵 [Comments API] Found submission-level comments:', result.data?.length || 0);
    return NextResponse.json(result.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
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
    // For test authentication, use a consistent mock user ID
    const verifiedClaims = { userId: "test-user-123", email: "noreply@themetalayer.org", name: "Anon" };
    console.log('🔵 [Comments API] Token verification result:', !!verifiedClaims);
    console.log('🔵 [Comments API] Verified claims:', verifiedClaims);
    
    if (!verifiedClaims) {
      console.log('🔴 [Comments API] Token verification failed - returning 401');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Map test tokens to actual user IDs
    let user;
    if (token === 'test-user-123') {
      // Use Anon's user for testing
      const { prisma } = await import('@/lib/db');
      user = await prisma.user.findFirst({
        where: { email: 'noreply@themetalayer.org' }
      });
      
      if (!user) {
        console.error('🔴 [Comments API] Test user (Anon) not found');
        return NextResponse.json({ error: 'Test user not found' }, { status: 401 });
      }
      
      console.log(`🔵 [Comments API] Using test user: ${user.id} (${user.email})`);
      
      // Update last activity
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActivity: new Date() }
      });
    } else {
      // For other test tokens, try to find by privyId
      console.log('🔵 [Comments API] Looking up user by Privy ID...');
      user = await userService.getUserByPrivyId(token);
      
      if (!user) {
        console.log('🔵 [Comments API] Creating new user for token:', token);
        // Create a basic user if they don't exist
        const { prisma } = await import('@/lib/db');
        
        try {
          user = await prisma.user.create({
            data: {
              privyId: token,
              email: `${token}@temp.com`,
              userName: `User-${token.slice(-6)}`,
              signupDate: new Date(),
              lastActivity: new Date()
            }
          });
          console.log(`🔵 [Comments API] Created new user: ${user.id} for token: ${token}`);
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