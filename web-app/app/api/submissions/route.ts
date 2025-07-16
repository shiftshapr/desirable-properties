import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { watch } from 'fs';

// Types for submissions data
interface Submission {
  submitter: {
    first_name: string | null;
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
  _metadata: {
    source_file: string;
    file_number: number;
  };
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
  submissions: Submission[];
}

// In-memory cache for submissions data
let cachedSubmissions: SubmissionsData | null = null;
let lastModified: number = 0;

// File path for the data
const dataFilePath = path.join(process.cwd(), 'data', 'compiled', 'allstructured.json');

// Load submissions data from JSON file
function loadSubmissions(): SubmissionsData {
  const fileContent = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(fileContent);
}

// Check if file has been modified and reload if necessary
function getSubmissionsData(): SubmissionsData {
  try {
    const stats = fs.statSync(dataFilePath);
    const currentModified = stats.mtime.getTime();
    
    // If file has been modified or cache is empty, reload
    if (!cachedSubmissions || currentModified > lastModified) {
      console.log('Reloading submissions data from file...');
      cachedSubmissions = loadSubmissions();
      lastModified = currentModified;
    }
    
    return cachedSubmissions;
  } catch (error) {
    console.error('Error loading submissions data:', error);
    throw error;
  }
}

// Set up file watching for hot reloading
if (typeof window === 'undefined') { // Only run on server side
  try {
    // Watch the data file for changes
    watch(dataFilePath, (eventType) => {
      if (eventType === 'change') {
        console.log('Submissions data file changed, clearing cache...');
        cachedSubmissions = null; // Clear cache to force reload on next request
      }
    });
    console.log('File watching enabled for hot reloading');
  } catch (error) {
    console.warn('Could not set up file watching:', error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dp = searchParams.get('dp'); // Filter by specific DP
    
    const data = getSubmissionsData();
    
    // Filter by DP if provided
    if (dp) {
      data.submissions = data.submissions.filter(submission => 
        submission.directly_addressed_dps.some(addressedDP => 
          addressedDP.dp.toLowerCase().includes(dp.toLowerCase())
        ) ||
        submission.clarifications_and_extensions.some(clarification => 
          clarification.dp.toLowerCase().includes(dp.toLowerCase())
        )
      );
    }
    
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
    cachedSubmissions = null; // Clear cache
    const data = getSubmissionsData();
    return NextResponse.json({ 
      success: true, 
      message: 'Data reloaded successfully',
      total_submissions: data.meta.total_submissions 
    });
  } catch (error) {
    console.error('Error during manual reload:', error);
    return NextResponse.json(
      { error: 'Failed to reload data' },
      { status: 500 }
    );
  }
} 