import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    const data: SubmissionsData = {
      meta: {
        total_submissions: filteredSubmissions.length,
        description: 'Submissions from database'
      },
      submissions: filteredSubmissions
    };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading submissions:', error);
    return NextResponse.json(
      { error: 'Failed to load submissions' },
      { status: 500 }
    );
  }
}

// Add a manual reload endpoint
export async function POST() {
  try {
    console.log('Manual reload requested...');
    const count = await prisma.submission.count();
    return NextResponse.json({ 
      success: true, 
      message: 'Data reloaded successfully',
      total_submissions: count 
    });
  } catch (error) {
    console.error('Error during manual reload:', error);
    return NextResponse.json(
      { error: 'Failed to reload data' },
      { status: 500 }
    );
  }
} 