import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { watch } from 'fs';

// Types for the data structure
interface DesirableProperty {
  id: string;
  name: string;
  category: string;
  description: string;
  elements: Array<{
    name: string;
    description: string;
  }>;
}

interface DesirablePropertiesData {
  meta: {
    title: string;
    description: string;
    version: string;
    total_properties: number;
    categories: string[];
  };
  desirable_properties: DesirableProperty[];
}

// In-memory cache for desirable properties data
let cachedDesirableProperties: DesirablePropertiesData | null = null;
let lastModified: number = 0;

// File path for the data
const dataFilePath = path.join(process.cwd(), 'data', 'compiled', 'desirable-properties.json');

// Load data from JSON file
function loadDesirableProperties(): DesirablePropertiesData {
  const fileContent = fs.readFileSync(dataFilePath, 'utf8');
  const data = JSON.parse(fileContent);
  console.log('Loaded desirable properties data:', {
    total_properties: data.desirable_properties.length,
    sample_dp: data.desirable_properties[0] ? {
      id: data.desirable_properties[0].id,
      name: data.desirable_properties[0].name,
      has_landing_title: !!data.desirable_properties[0].landing_title,
      has_landing_subtitle: !!data.desirable_properties[0].landing_subtitle,
      has_landing_text: !!data.desirable_properties[0].landing_text
    } : null
  });
  return data;
}

// Check if file has been modified and reload if necessary
function getDesirablePropertiesData(): DesirablePropertiesData {
  try {
    const stats = fs.statSync(dataFilePath);
    const currentModified = stats.mtime.getTime();
    
    // If file has been modified or cache is empty, reload
    if (!cachedDesirableProperties || currentModified > lastModified) {
      console.log('Reloading desirable properties data from file...');
      cachedDesirableProperties = loadDesirableProperties();
      lastModified = currentModified;
    }
    
    return cachedDesirableProperties;
  } catch (error) {
    console.error('Error loading desirable properties data:', error);
    throw error;
  }
}

// Set up file watching for hot reloading
if (typeof window === 'undefined') { // Only run on server side
  try {
    // Watch the data file for changes
    watch(dataFilePath, (eventType) => {
      if (eventType === 'change') {
        console.log('Desirable properties data file changed, clearing cache...');
        cachedDesirableProperties = null; // Clear cache to force reload on next request
      }
    });
    console.log('File watching enabled for desirable properties hot reloading');
  } catch (error) {
    console.warn('Could not set up file watching for desirable properties:', error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    const data = getDesirablePropertiesData();
    
    // Filter by category if provided
    if (category && category !== 'all') {
      data.desirable_properties = data.desirable_properties.filter(
        dp => dp.category === category
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading desirable properties:', error);
    return NextResponse.json(
      { error: 'Failed to load desirable properties' },
      { status: 500 }
    );
  }
}

// Add a manual reload endpoint
export async function POST() {
  try {
    console.log('Manual reload requested for desirable properties...');
    cachedDesirableProperties = null; // Clear cache
    const data = getDesirablePropertiesData();
    return NextResponse.json({ 
      success: true, 
      message: 'Desirable properties data reloaded successfully',
      total_properties: data.meta.total_properties 
    });
  } catch (error) {
    console.error('Error during manual reload:', error);
    return NextResponse.json(
      { error: 'Failed to reload desirable properties data' },
      { status: 500 }
    );
  }
} 