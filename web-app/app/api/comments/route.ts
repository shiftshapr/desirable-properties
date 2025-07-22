import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  replies: Comment[];
  parentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { elementId, elementType, submissionId, content, parentId } = body;

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

    // TODO: Implement actual comment storage
    // For now, we'll just return success
    const comment: Comment = {
      id: Date.now().toString(),
      userId,
      userName: 'User', // TODO: Get actual user name
      content,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      replies: [],
      parentId
    };

    console.log('Comment received:', {
      userId,
      elementId,
      elementType,
      submissionId,
      content,
      parentId,
    });

    return NextResponse.json({ 
      success: true,
      comment,
      message: 'Comment posted successfully'
    });

  } catch (error) {
    console.error('Error processing comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');
    const submissionId = searchParams.get('submissionId');

    if (!elementId || !elementType || !submissionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // TODO: Implement actual comment retrieval
    // For now, return mock data
    const mockComments: Comment[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'Alice',
        content: 'This is a great submission! I particularly like how it addresses the decentralization aspects.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        upvotes: 12,
        downvotes: 2,
        replies: [
          {
            id: '1-1',
            userId: 'user2',
            userName: 'Bob',
            content: 'I agree! The implementation details are well thought out.',
            createdAt: new Date(Date.now() - 43200000).toISOString(),
            upvotes: 5,
            downvotes: 0,
            replies: [],
            parentId: '1'
          }
        ]
      },
      {
        id: '2',
        userId: 'user3',
        userName: 'Charlie',
        content: 'I have some concerns about the scalability aspects. Has this been tested at scale?',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        upvotes: 8,
        downvotes: 3,
        replies: []
      }
    ];

    return NextResponse.json(mockComments);

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 