#!/usr/bin/env python3
"""
Meta-Layer Structured Submissions Aggregator

This script aggregates all JSON files from the structured submissions folder
into a single compiled JSON file for easier processing and analysis.

Usage:
    python aggregate_structured_submissions.py
"""

import json
import os
from pathlib import Path
from datetime import datetime
import sys

def load_json_file(filepath):
    """Load and parse a JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error parsing {filepath}: {e}")
        return None
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None

def get_structured_submissions_path():
    """Get the path to the structured submissions folder."""
    # Get the script directory
    script_dir = Path(__file__).parent
    # Go up one level to desirable-properties, then to data/submissions/structured
    structured_path = script_dir.parent / "data" / "submissions" / "structured"
    
    if not structured_path.exists():
        print(f"Error: Structured submissions folder not found at {structured_path}")
        sys.exit(1)
    
    return structured_path

def get_compiled_output_path():
    """Get the path for the compiled output file."""
    script_dir = Path(__file__).parent
    compiled_dir = script_dir.parent / "data" / "submissions" / "structured"
    
    return compiled_dir / "allstructured.json"

def aggregate_submissions():
    """Aggregate all structured JSON submissions into a single file."""
    structured_path = get_structured_submissions_path()
    output_path = get_compiled_output_path()
    
    print(f"Reading submissions from: {structured_path}")
    print(f"Writing compiled output to: {output_path}")
    
    # Get all JSON files, excluding non-submission files
    json_files = []
    for file in structured_path.glob("*.json"):
        # Skip any non-submission files and the compiled file itself
        if file.name not in ['.DS_Store', 'allstructured.json']:
            json_files.append(file)
    
    # Sort files numerically
    json_files.sort(key=lambda x: int(x.stem) if x.stem.isdigit() else float('inf'))
    
    print(f"Found {len(json_files)} JSON files to process")
    
    # Load all submissions
    submissions = []
    failed_files = []
    
    for json_file in json_files:
        print(f"Processing {json_file.name}...")
        submission_data = load_json_file(json_file)
        
        if submission_data:
            # Add metadata about the source file
            submission_data['_metadata'] = {
                'source_file': json_file.name,
                'file_number': int(json_file.stem) if json_file.stem.isdigit() else json_file.stem
            }
            submissions.append(submission_data)
        else:
            failed_files.append(json_file.name)
    
    # Create the compiled structure
    compiled_data = {
        'meta': {
            'generated_at': datetime.now().isoformat(),
            'total_submissions': len(submissions),
            'source_directory': str(structured_path),
            'failed_files': failed_files,
            'format_version': '1.0',
            'description': 'Compiled Meta-Layer submissions in standardized JSON format'
        },
        'submissions': submissions
    }
    
    # Write the compiled file
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(compiled_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Successfully compiled {len(submissions)} submissions")
        print(f"📁 Output file: {output_path}")
        print(f"📊 File size: {output_path.stat().st_size / 1024:.1f} KB")
        
        if failed_files:
            print(f"⚠️  Failed to process {len(failed_files)} files: {', '.join(failed_files)}")
            
    except Exception as e:
        print(f"❌ Error writing compiled file: {e}")
        sys.exit(1)

def main():
    """Main function."""
    print("Meta-Layer Structured Submissions Aggregator")
    print("=" * 50)
    
    aggregate_submissions()
    
    print("\n✨ Aggregation complete!")

if __name__ == "__main__":
    main() 