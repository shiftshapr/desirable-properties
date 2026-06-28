import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publicSubmitterNames } from '@/lib/publicSubmitter';

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
    
    // Avoid loading every Vote row (can hang the server at scale). Aggregate in one query.
    const submissions = await prisma.submission.findMany({
      include: {
        submitter: true,
        directlyAddressedDPs: true,
        clarificationsExtensions: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const submissionIds = submissions.map((s) => s.id);
    const voteAgg =
      submissionIds.length === 0
        ? []
        : await prisma.vote.groupBy({
            by: ['submissionId', 'type'],
            where: { submissionId: { in: submissionIds } },
            _count: true,
          });

    const voteTotals = new Map<string, { upvotes: number; downvotes: number }>();
    for (const row of voteAgg) {
      if (!row.submissionId) continue;
      const cur = voteTotals.get(row.submissionId) ?? { upvotes: 0, downvotes: 0 };
      if (row.type === 'UP') cur.upvotes = row._count;
      else if (row.type === 'DOWN') cur.downvotes = row._count;
      voteTotals.set(row.submissionId, cur);
    }

    // Transform to match expected format with vote counts
    const transformedSubmissions = submissions.map(sub => {
      const counts = voteTotals.get(sub.id) ?? { upvotes: 0, downvotes: 0 };
      const upvotes = counts.upvotes;
      const downvotes = counts.downvotes;
      
      return {
        id: sub.id,
        title: sub.title,
        overview: sub.overview,
        sourceLink: sub.sourceLink,
        submitter: publicSubmitterNames(
          sub.submitter.firstName,
          sub.submitter.lastName,
          sub.submitter.email
        ),
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
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('Manual reload requested...');
    const count = await prisma.submission.count();
    return NextResponse.json({ 
      success: true, 
      message: 'Data reloaded successfully',
      total_submissions: count 
    });
  } catch (error) {
    console.error('Error reloading data:', error);
    return NextResponse.json(
      { error: 'Failed to reload data' },
      { status: 500 }
    );
  }
} 