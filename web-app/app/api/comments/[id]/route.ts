import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    // Verify the request is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

    // TODO: Implement actual comment editing
    // For now, we'll just return success
    console.log('Comment edit received:', {
      commentId: id,
      userId,
      content,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Comment updated successfully'
    });

  } catch (error) {
    console.error('Error editing comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the request is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    if (!verifiedClaims) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

    // TODO: Implement actual comment deletion
    // For now, we'll just return success
    console.log('Comment deletion received:', {
      commentId: id,
      userId,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 