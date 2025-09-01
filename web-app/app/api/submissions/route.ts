import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// Types for submissions data from database
interface Submission {
  id: string;
  title: string;
  overview: string;
  sourceLink: string | null;
  submitter: {
    firstName: string | null;
    lastName: string | null;
  };
  directlyAddressedDPs: Array<{
    dp: string;
    summary: string;
  }>;
  clarificationsExtensions: Array<{
    dp: string;
    type: string;
    title: string;
    content: string;
    whyItMatters: string;
  }>;
  upvotes: number;
  downvotes: number;
}

interface SubmissionsData {
  meta: {
    total_submissions: number;
    description: string;
  };
  submissions: Submission[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dp = searchParams.get('dp'); // Filter by specific DP
    
    // TEMPORARY: Return mock data while testing NextAuth
    const mockSubmissions: Submission[] = [
      {
        id: 'mock-1',
        title: 'Test Submission',
        overview: 'This is a test submission while we test NextAuth',
        sourceLink: null,
        submitter: {
          firstName: 'Test',
          lastName: 'User',
        },
        directlyAddressedDPs: [],
        clarificationsExtensions: [],
        upvotes: 0,
        downvotes: 0,
      }
    ];
    
    const submissionsData: SubmissionsData = {
      meta: {
        total_submissions: mockSubmissions.length,
        description: 'Mock submissions data for NextAuth testing'
      },
      submissions: mockSubmissions
    };
    
    return NextResponse.json(submissionsData);
    
    // ORIGINAL CODE COMMENTED OUT FOR NEXTAUTH TESTING:
    /*
    // Fetch submissions from database with vote counts
    const submissions = await prisma.submission.findMany({
      include: {
        submitter: true,
        directlyAddressedDPs: true,
        clarificationsExtensions: true,
        votes: true, // Include votes
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform to match expected format with vote counts
    const transformedSubmissions = submissions.map(sub => {
      // Calculate vote counts
      const upvotes = sub.votes.filter(vote => vote.type === 'UP').length;
      const downvotes = sub.votes.filter(vote => vote.type === 'DOWN').length;
      
      return {
        id: sub.id,
        title: sub.title,
        overview: sub.overview,
        sourceLink: sub.sourceLink,
        submitter: {
          firstName: sub.submitter.firstName,
          lastName: sub.submitter.lastName,
        },
        directlyAddressedDPs: Array.isArray(sub.directlyAddressedDPs) ? sub.directlyAddressedDPs.map(dp => ({
          dp: dp.dp,
          summary: dp.summary,
        })) : [],
        clarificationsExtensions: Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.map(ce => ({
          dp: ce.dp,
          type: ce.type,
          title: ce.title,
          content: ce.content,
          whyItMatters: ce.whyItMatters,
        })) : [],
        upvotes,
        downvotes,
      };
    });
    
    // Filter by DP if provided
    let filteredSubmissions = transformedSubmissions;
    if (dp) {
      filteredSubmissions = transformedSubmissions.filter(submission => 
        submission.directlyAddressedDPs.some(addressedDP => 
          addressedDP.dp.toLowerCase().includes(dp.toLowerCase())
        ) ||
        submission.clarificationsExtensions.some(clarification => 
          clarification.dp.toLowerCase().includes(dp.toLowerCase())
        )
      );
    }
    
    const submissionsData: SubmissionsData = {
      meta: {
        total_submissions: filteredSubmissions.length,
        description: 'Submissions data from database'
      },
      submissions: filteredSubmissions
    };
    
    return NextResponse.json(submissionsData);
    */
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// Add a manual reload endpoint
export async function POST() {
  try {
    console.log('Manual reload requested...');
    // const count = await prisma.submission.count(); // This line was removed as per the edit hint
    return NextResponse.json({ 
      success: true, 
      message: 'Data reloaded successfully',
      // total_submissions: count // This line was removed as per the edit hint
    });
  } catch (error) {
    console.error('Error during manual reload:', error);
    return NextResponse.json(
      { error: 'Failed to reload data' },
      { status: 500 }
    );
  }
} 