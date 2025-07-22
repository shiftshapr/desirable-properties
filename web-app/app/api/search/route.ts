import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';

// Load data helper functions
function loadDesirableProperties() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'compiled', 'desirable-properties.json');
    console.log('Loading DPs from:', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log(`Loaded ${data.desirable_properties?.length || 0} DPs`);
    return data;
  } catch (error) {
    console.error('Error loading DPs:', error);
    return { desirable_properties: [] };
  }
}

function loadSubmissions() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'compiled', 'allstructured.json');
    console.log('Loading submissions from:', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log(`Loaded ${data.submissions?.length || 0} submissions`);
    return data;
  } catch (error) {
    console.error('Error loading submissions:', error);
    return { submissions: [] };
  }
}

function loadCategories() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'compiled', 'categories.json');
    console.log('Loading categories from:', filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    console.log(`Loaded ${data.categories?.length || 0} categories`);
    return data;
  } catch (error) {
    console.error('Error loading categories:', error);
    return { categories: [] };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    console.log('Search request received with query:', query);
    
    if (!query) {
      console.log('No query provided, returning error');
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }
    
    console.log('Loading data for search...');
    const dpData = loadDesirableProperties();
    const submissionsData = loadSubmissions();
    const categoriesData = loadCategories();
    
    console.log('Configuring Fuse.js for search...');
    
    // Configure Fuse.js for DPs
    const dpFuse = new Fuse(dpData.desirable_properties || [], {
      keys: [
        'name',
        'description',
        'category',
        'elements.name',
        'elements.description'
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
    });
    
    // Configure Fuse.js for submissions with expanded search fields
    const submissionsFuse = new Fuse(submissionsData.submissions || [], {
      keys: [
        'submission.title',
        'submission.overview',
        'submitter.first_name',
        'submitter.last_name',
        'submitter.email',
        'directly_addressed_dps.dp',
        'directly_addressed_dps.summary',
        'clarifications_and_extensions.title',
        'clarifications_and_extensions.clarification',
        'clarifications_and_extensions.extension',
        'clarifications_and_extensions.why_it_matters'
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
    });
    
    // Configure Fuse.js for categories
    const categoriesFuse = new Fuse(categoriesData.categories || [], {
      keys: [
        'name',
        'description'
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
    });
    
    console.log('Performing searches...');
    
    // Perform searches
    const dpResults = dpFuse.search(query);
    const submissionResults = submissionsFuse.search(query);
    const categoryResults = categoriesFuse.search(query);
    
    console.log(`Search results: ${dpResults.length} DPs, ${submissionResults.length} submissions, ${categoryResults.length} categories`);
    
    const response = {
      query,
      results: {
        desirable_properties: dpResults.map(result => ({
          item: result.item,
          score: result.score,
          matches: result.matches
        })),
        submissions: submissionResults.map(result => ({
          item: result.item,
          score: result.score,
          matches: result.matches
        })),
        categories: categoryResults.map(result => ({
          item: result.item,
          score: result.score,
          matches: result.matches
        }))
      },
      total_results: dpResults.length + submissionResults.length + categoryResults.length
    };
    
    console.log('Returning search results:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 