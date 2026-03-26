import { NextRequest, NextResponse } from 'next/server';


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    console.log('🔴 [API] PUT /api/comments/[id] called:', { id, content });

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('🔴 [API] No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔴 [API] Token received:', token);
    
    if (!token.startsWith('test-')) {
      console.log('🔴 [API] Invalid token format');
      return NextResponse.json({ error: 'Invalid token' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Map test tokens to actual user IDs
    let userId;
    if (token === 'test-user-123') {
      // Use Anon's user for testing
      const { prisma } = await import('@/lib/db');
      const testUser = await prisma.user.findFirst({
        where: { email: 'noreply@themetalayer.org' }
      });
      userId = testUser?.id;
      console.log('🔴 [API] Test user lookup:', { 
        token, 
        testUserEmail: 'noreply@themetalayer.org', 
        foundUser: testUser,
        mappedUserId: userId 
      });
    } else {
      userId = token; // Use token as user ID for other test tokens
      console.log('🔴 [API] Using token as userId:', userId);
    }

    if (!userId) {
      console.log('🔴 [API] No userId found');
      return NextResponse.json({ error: 'Test user not found' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const { prisma } = await import('@/lib/db');
    
    // 1. Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    console.log('🔴 [API] Comment lookup:', { 
      commentId: id, 
      foundComment: comment,
      commentAuthorId: comment?.authorId,
      requestingUserId: userId,
      isOwner: comment?.authorId === userId
    });

    if (!comment) {
      console.log('🔴 [API] Comment not found');
      return NextResponse.json({ error: 'Comment not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (comment.authorId !== userId) {
      console.log('🔴 [API] Not comment owner:', { 
        commentAuthorId: comment.authorId, 
        requestingUserId: userId 
      });
      return NextResponse.json({ error: 'Not comment owner' }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 2. Check edit window (configurable via env)
    const editWindowHours = parseInt(process.env.COMMENT_EDIT_WINDOW_HOURS || '1');
    const commentDate = new Date(comment.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
    
    console.log('🔴 [API] Edit window check:', {
      commentCreatedAt: comment.createdAt,
      commentDate: commentDate.toISOString(),
      now: now.toISOString(),
      diffInHours,
      editWindowHours,
      canEdit: diffInHours <= editWindowHours
    });
    
    if (diffInHours > editWindowHours) {
      console.log('🔴 [API] Edit window expired');
      return NextResponse.json({ error: `Edit window expired (${editWindowHours} hour${editWindowHours !== 1 ? 's' : ''})` }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 3. Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        content
      }
    });

    console.log('🔴 [API] Comment updated successfully:', updatedComment);

    return NextResponse.json({ 
      success: true,
      comment: updatedComment
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('🔴 [API] Error editing comment:', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🔴 [API] DELETE /api/comments/[id] called:', { id });

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('🔴 [API] No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔴 [API] Token received:', token);
    
    if (!token.startsWith('test-')) {
      console.log('🔴 [API] Invalid token format');
      return NextResponse.json({ error: 'Invalid token' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Map test tokens to actual user IDs
    let userId;
    if (token === 'test-user-123') {
      // Use Anon's user for testing
      const { prisma } = await import('@/lib/db');
      const testUser = await prisma.user.findFirst({
        where: { email: 'noreply@themetalayer.org' }
      });
      userId = testUser?.id;
      console.log('🔴 [API] Test user lookup:', { 
        token, 
        testUserEmail: 'noreply@themetalayer.org', 
        foundUser: testUser,
        mappedUserId: userId 
      });
    } else {
      userId = token; // Use token as user ID for other test tokens
      console.log('🔴 [API] Using token as userId:', userId);
    }

    if (!userId) {
      console.log('🔴 [API] No userId found');
      return NextResponse.json({ error: 'Test user not found' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const { prisma } = await import('@/lib/db');
    
    // 1. Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    console.log('🔴 [API] Comment lookup:', { 
      commentId: id, 
      foundComment: comment,
      commentAuthorId: comment?.authorId,
      requestingUserId: userId,
      isOwner: comment?.authorId === userId
    });

    if (!comment) {
      console.log('🔴 [API] Comment not found');
      return NextResponse.json({ error: 'Comment not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (comment.authorId !== userId) {
      console.log('🔴 [API] Not comment owner:', { 
        commentAuthorId: comment.authorId, 
        requestingUserId: userId 
      });
      return NextResponse.json({ error: 'Not comment owner' }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 2. Check delete window (configurable via env)
    const deleteWindowHours = parseInt(process.env.COMMENT_DELETE_WINDOW_HOURS || '1');
    const commentDate = new Date(comment.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
    
    console.log('🔴 [API] Delete window check:', {
      commentCreatedAt: comment.createdAt,
      commentDate: commentDate.toISOString(),
      now: now.toISOString(),
      diffInHours,
      deleteWindowHours,
      canDelete: diffInHours <= deleteWindowHours
    });
    
    if (diffInHours > deleteWindowHours) {
      console.log('🔴 [API] Delete window expired');
      return NextResponse.json({ error: `Delete window expired (${deleteWindowHours} hour${deleteWindowHours !== 1 ? 's' : ''})` }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // 3. Delete comment
    await prisma.comment.delete({
      where: { id }
    });

    console.log('🔴 [API] Comment deleted successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('🔴 [API] Error deleting comment:', error);
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