import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publicSubmitterWithEmail } from '@/lib/publicSubmitter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    console.log('🔵 [Submissions API] Fetching submission:', submissionId);

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            userName: true
          }
        },
        directlyAddressedDPs: true,
        clarificationsExtensions: true,
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
      }
    });

    if (!submission) {
      console.log('🔴 [Submissions API] Submission not found:', submissionId);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Calculate vote counts
    const upvotes = submission.votes.filter(v => v.type === 'UP').length;
    const downvotes = submission.votes.filter(v => v.type === 'DOWN').length;

    // Transform the data to match the expected format
    const transformedSubmission = {
      id: submission.id,
      title: submission.title,
      overview: submission.overview,
      sourceLink: submission.sourceLink,
      submitter: publicSubmitterWithEmail({
        firstName: submission.submitter.firstName,
        lastName: submission.submitter.lastName,
        email: submission.submitter.email,
      }),
      directlyAddressedDPs: submission.directlyAddressedDPs.map(dp => ({
        dp: dp.dp,
        summary: dp.summary
      })),
      clarificationsExtensions: submission.clarificationsExtensions.map(ce => ({
        dp: ce.dp,
        type: ce.type,
        title: ce.title,
        content: ce.content,
        whyItMatters: ce.whyItMatters
      })),
      upvotes,
      downvotes
    };

    console.log('🔵 [Submissions API] Returning submission:', submissionId);
    return NextResponse.json(transformedSubmission);

  } catch (error) {
    console.error('🔴 [Submissions API] Error fetching submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 