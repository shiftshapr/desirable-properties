import { NextRequest, NextResponse } from 'next/server';
import { submissionInteractionService } from '@/lib/submissionInteractionService';
import { UserService } from '@/lib/userService';
import { prisma } from '@/lib/db';

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
      return NextResponse.json({ error: 'Submission ID is required' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Try to get user authentication if available
    let userId: string | undefined;
    const authHeader = request.headers.get('authorization');
    
    // Force logging by writing debug info to response headers
    const debugInfo: string[] = [];
    debugInfo.push(`Auth header: ${authHeader || 'none'}`);
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        debugInfo.push(`Token: ${token}`);
        
        // For test mode, accept any token that starts with "test-"
        if (token.startsWith('test-')) {
          debugInfo.push('Test token detected');
          // Map test tokens to existing users
          if (token === 'test-user-123') {
            debugInfo.push('Mapping test-user-123 to Daveed');
            // Use Daveed's user for testing
            const testUser = await prisma.user.findFirst({
              where: { email: 'daveed@bridgit.io' }
            });
            debugInfo.push(`Found test user: ${testUser ? 'YES' : 'NO'}, id: ${testUser?.id}`);
            userId = testUser?.id;
          } else {
            userId = token; // Use token as user ID for other test tokens
          }
          
          debugInfo.push(`Final userId: ${userId || 'undefined'}`);
          
          if (!userId) {
            return NextResponse.json({ error: 'Test user not found' }, { 
              status: 401,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'X-Debug-Info': debugInfo.join(' | '),
              }
            });
          }
        }
      } catch (error) {
        debugInfo.push(`Auth error: ${error}`);
        // Continue without user authentication
      }
    }

    // If this is for a comment, use commentId
    if (commentId) {
      
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

      return NextResponse.json({ votes, upvotes, downvotes, userVote }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // If this is for a specific element (not comment), use the existing logic
    if (elementId && elementType) {
      
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
        console.log('🔍 [DEBUG] Looking for user vote. userId:', userId, 'votes:', votes.map(v => ({ id: v.id, voterId: v.voterId, type: v.type })));
        const userVoteRecord = votes.find(v => v.voterId === userId);
        console.log('🔍 [DEBUG] Found user vote record:', userVoteRecord);
        userVote = userVoteRecord?.type || null;
      } else {
        debugInfo.push('No userId available for user vote lookup');
      }

      return NextResponse.json({ votes, upvotes, downvotes, userVote }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Debug-Info': debugInfo.join(' | '),
        }
      });
    }

    // For submission-level reactions, get ALL votes for the submission
    
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

          return NextResponse.json({ votes, upvotes, downvotes, userVote }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
  } catch (error) {
    console.error('🔴 [Votes API] Error fetching reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !token.startsWith('test-')) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Map test tokens to actual user IDs
    let voterId;
    if (token === 'test-user-123') {
      // Use Daveed's user for testing
      const testUser = await prisma.user.findFirst({
        where: { email: 'daveed@bridgit.io' }
      });
      voterId = testUser?.id;
    } else {
      voterId = token; // Use token as user ID for other test tokens
    }

    if (!voterId) {
      return NextResponse.json({ error: 'Test user not found' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const { elementId, voteType, submissionId, elementType, commentId } = await request.json();
    if (!['UP', 'DOWN'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Validate that we have at least one target (elementId, commentId, or submissionId)
    if (!elementId && !commentId && !submissionId) {
      return NextResponse.json({ error: 'Must specify elementId, commentId, or submissionId' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Build query based on vote target type
    let whereClause: any = { voterId: voterId };
    
    if (commentId) {
      // Vote on a comment
      whereClause.commentId = commentId;
    } else if (elementId && elementType) {
      // Vote on an element (alignment, clarification, extension)
      whereClause.elementId = elementId;
      whereClause.elementType = elementType;
      if (submissionId) whereClause.submissionId = submissionId;
    } else if (submissionId) {
      // Vote on submission itself
      whereClause.submissionId = submissionId;
      whereClause.elementId = null;
      whereClause.elementType = null;
      whereClause.commentId = null;
    }

    console.log('🔵 [Votes API] Looking for existing vote with criteria:', whereClause);

    // Check existing vote
    const existingVote = await prisma.vote.findFirst({
      where: whereClause
    });

    if (existingVote) {
      if (existingVote.type === voteType) {
        // Remove vote if same type clicked
        await prisma.vote.delete({ where: { id: existingVote.id } });
      } else {
        // Switch vote type
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type: voteType }
        });
      }
    } else {
      // Create new vote based on target type
      let voteData: any = { 
        voterId: voterId, 
        type: voteType
      };
      
      if (commentId) {
        voteData.commentId = commentId;
        if (submissionId) voteData.submissionId = submissionId;
      } else if (elementId && elementType) {
        voteData.elementId = elementId;
        voteData.elementType = elementType;
        if (submissionId) voteData.submissionId = submissionId;
      } else if (submissionId) {
        voteData.submissionId = submissionId;
      }

      console.log('🔵 [Votes API] Creating new vote with data:', voteData);
      
      await prisma.vote.create({
        data: voteData
      });
    }

    // Get updated counts based on target type
    let countWhereClause: any = { type: 'UP' };
    let downvoteWhereClause: any = { type: 'DOWN' };
    
    if (commentId) {
      countWhereClause.commentId = commentId;
      downvoteWhereClause.commentId = commentId;
    } else if (elementId) {
      countWhereClause.elementId = elementId;
      downvoteWhereClause.elementId = elementId;
      if (elementType) {
        countWhereClause.elementType = elementType;
        downvoteWhereClause.elementType = elementType;
      }
    } else if (submissionId) {
      countWhereClause.submissionId = submissionId;
      countWhereClause.elementId = null;
      countWhereClause.commentId = null;
      downvoteWhereClause.submissionId = submissionId;
      downvoteWhereClause.elementId = null;
      downvoteWhereClause.commentId = null;
    }

    const upvotes = await prisma.vote.count({
      where: countWhereClause
    });
    
    const downvotes = await prisma.vote.count({
      where: downvoteWhereClause
    });

    // Get user's current vote after the operation
    let userVote: 'UP' | 'DOWN' | null = null;
    const currentUserVote = await prisma.vote.findFirst({
      where: {
        voterId: voterId,
        ...whereClause
      }
    });
    userVote = currentUserVote?.type || null;

    return NextResponse.json({ upvotes, downvotes, userVote }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}