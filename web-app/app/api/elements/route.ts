import { NextRequest, NextResponse } from 'next/server';
import { unifiedInteractionService } from '../../../lib/unifiedInteractionService';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const elementId = searchParams.get('elementId');
    const elementType = searchParams.get('elementType');
    const submissionId = searchParams.get('submissionId');
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!elementType) {
      return NextResponse.json({ error: 'Element type is required' }, { status: 400 });
    }

    let userId: string | undefined;
    if (authToken) {
      try {
        // For test authentication, use a consistent mock user ID
        const verifiedClaims = { userId: "test-user-123", email: "daveed@bridgit.io", name: "Daveed Benjamin" };
        userId = "test-user-123"; // Test user ID for authentication
      } catch (error) {
        console.error('Auth token verification failed:', error);
      }
    }

    if (elementId) {
      // Display specific element
      const element = await unifiedInteractionService.displayElement(
        elementId, 
        elementType, 
        submissionId || undefined, 
        userId
      );
      return NextResponse.json(element);
    } else if (submissionId) {
      // Get all elements of this type for a submission
      const elements = await unifiedInteractionService.getSubmissionElements(
        submissionId, 
        elementType, 
        userId
      );
      return NextResponse.json(elements);
    } else {
      return NextResponse.json({ error: 'Either elementId or submissionId is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in elements GET:', error);
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const element = await unifiedInteractionService.saveElement(body, authToken);
    return NextResponse.json(element);
  } catch (error) {
    console.error('Error in elements POST:', error);
    return NextResponse.json({ error: 'Failed to save element' }, { status: 500 });
  }
} 