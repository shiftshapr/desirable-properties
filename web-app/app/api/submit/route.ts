import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types for submission data
interface SubmissionData {
  submitter: {
    first_name: string;
    last_name: string | null;
    email: string;
  };
  submission: {
    title: string;
    overview: string;
    source_link: string | null;
    raw_content: string;
  };
  directly_addressed_dps: Array<{
    dp: string;
    summary: string;
  }>;
  clarifications_and_extensions: Array<{
    dp: string;
    type: string;
    title: string;
    clarification?: string;
    extension?: string;
    why_it_matters: string;
  }>;
}

interface SubmissionsData {
  meta: {
    generated_at: string;
    total_submissions: number;
    source_directory: string;
    failed_files: string[];
    format_version: string;
    description: string;
  };
  submissions: SubmissionData[];
}

// File paths
const STRUCTURED_DIR = path.join(process.cwd(), '..', 'data', 'submissions', 'structured');
const ALLSTRUCTURED_FILE = path.join(process.cwd(), 'data', 'compiled', 'allstructured.json');
const PRODUCTION_FILE = '/var/www/app.themetalayer.org/public/data/allstructured.json';

// Get next submission number
function getNextSubmissionNumber(): number {
  try {
    const files = fs.readdirSync(STRUCTURED_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const numbers = jsonFiles.map(file => parseInt(file.replace('.json', '')));
    return Math.max(...numbers, 0) + 1;
  } catch (error) {
    console.error('Error getting next submission number:', error);
    return 1;
  }
}

// Save individual submission file
function saveIndividualSubmission(submissionData: SubmissionData, submissionNumber: number): void {
  const filePath = path.join(STRUCTURED_DIR, `${submissionNumber}.json`);
  
  const individualSubmission = {
    ...submissionData,
    _metadata: {
      source_file: `${submissionNumber}.json`,
      file_number: submissionNumber
    }
  };
  
  fs.writeFileSync(filePath, JSON.stringify(individualSubmission, null, 2));
  console.log(`Saved individual submission: ${filePath}`);
}

// Update allstructured.json
function updateAllStructuredJson(submissionData: SubmissionData, submissionNumber: number): void {
  // Read current data
  const data: SubmissionsData = JSON.parse(fs.readFileSync(ALLSTRUCTURED_FILE, 'utf8'));
  
  // Update meta information
  data.meta.total_submissions = submissionNumber;
  data.meta.generated_at = new Date().toISOString();
  
  // Add new submission with metadata
  const submissionWithMetadata = {
    ...submissionData,
    _metadata: {
      source_file: `${submissionNumber}.json`,
      file_number: submissionNumber
    }
  };
  
  data.submissions.push(submissionWithMetadata);
  
  // Write back to file
  fs.writeFileSync(ALLSTRUCTURED_FILE, JSON.stringify(data, null, 2));
  console.log(`Updated allstructured.json with submission ${submissionNumber}`);
  
  // Copy to production
  fs.copyFileSync(ALLSTRUCTURED_FILE, PRODUCTION_FILE);
  console.log(`Copied to production: ${PRODUCTION_FILE}`);
}

export async function POST(request: Request) {
  try {
    const submissionData: SubmissionData = await request.json();
    
    // Validate required fields
    if (!submissionData.submitter.first_name || !submissionData.submitter.email || !submissionData.submission.title) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, email, and title are required' },
        { status: 400 }
      );
    }
    
    if (submissionData.directly_addressed_dps.length === 0) {
      return NextResponse.json(
        { error: 'At least one Desirable Property must be addressed' },
        { status: 400 }
      );
    }
    
    // Get next submission number
    const submissionNumber = getNextSubmissionNumber();
    
    // Save individual submission
    saveIndividualSubmission(submissionData, submissionNumber);
    
    // Update allstructured.json
    updateAllStructuredJson(submissionData, submissionNumber);
    
    return NextResponse.json({
      success: true,
      message: 'Submission created successfully',
      submissionNumber,
      totalSubmissions: submissionNumber
    });
    
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
} 