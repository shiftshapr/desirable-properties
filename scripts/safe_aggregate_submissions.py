#!/usr/bin/env python3
"""
SAFE Meta-Layer Structured Submissions Aggregator

This script aggregates all JSON files from the structured submissions folder
into a single compiled JSON file with multiple safeguards to prevent data loss.

SAFEGUARDS:
1. Checks for minimum expected files before proceeding
2. Creates timestamped backup before overwriting
3. Validates output before replacing original
4. Requires confirmation for destructive operations
5. Preserves original file if validation fails

Usage:
    python safe_aggregate_submissions.py
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
import shutil

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
    script_dir = Path(__file__).parent
    structured_path = script_dir.parent / "data" / "submissions" / "structured"
    
    if not structured_path.exists():
        print(f"Error: Structured submissions folder not found at {structured_path}")
        sys.exit(1)
    
    return structured_path

def get_compiled_output_path():
    """Get the path for the compiled output file."""
    script_dir = Path(__file__).parent
    compiled_dir = script_dir.parent / "data" / "compiled"
    
    return compiled_dir / "allstructured.json"

def create_backup(original_path):
    """Create a timestamped backup of the original file."""
    if not original_path.exists():
        print(f"Warning: No existing file to backup at {original_path}")
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = original_path.parent / f"allstructured_backup_{timestamp}.json"
    
    try:
        shutil.copy2(original_path, backup_path)
        print(f"✅ Created backup: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"❌ Failed to create backup: {e}")
        return None

def validate_submissions(submissions, expected_min=40):
    """Validate the aggregated submissions."""
    if len(submissions) < expected_min:
        print(f"❌ Validation failed: Only {len(submissions)} submissions found, expected at least {expected_min}")
        return False
    
    # Check for required fields
    for i, submission in enumerate(submissions):
        if 'submitter' not in submission:
            print(f"❌ Validation failed: Submission {i} missing 'submitter' field")
            return False
        if 'submission' not in submission:
            print(f"❌ Validation failed: Submission {i} missing 'submission' field")
            return False
    
    print(f"✅ Validation passed: {len(submissions)} submissions with required fields")
    return True

def safe_aggregate_submissions():
    """Safely aggregate all structured JSON submissions into a single file."""
    structured_path = get_structured_submissions_path()
    output_path = get_compiled_output_path()
    
    print("🔒 SAFE Meta-Layer Structured Submissions Aggregator")
    print("=" * 60)
    print(f"Reading submissions from: {structured_path}")
    print(f"Writing compiled output to: {output_path}")
    
    # SAFEGUARD 1: Check for minimum expected files
    json_files = []
    for file in structured_path.glob("*.json"):
        if file.name not in ['.DS_Store', 'allstructured.json']:
            json_files.append(file)
    
    json_files.sort(key=lambda x: int(x.stem) if x.stem.isdigit() else float('inf'))
    
    print(f"Found {len(json_files)} JSON files to process")
    
    if len(json_files) < 40:
        print(f"❌ SAFEGUARD TRIGGERED: Only {len(json_files)} files found, expected at least 40")
        print("This suggests files may be missing. Aborting to prevent data loss.")
        sys.exit(1)
    
    # SAFEGUARD 2: Create backup before proceeding
    print("\n🔒 Creating backup...")
    backup_path = create_backup(output_path)
    
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
    
    # SAFEGUARD 3: Validate output before writing
    print(f"\n🔒 Validating {len(submissions)} submissions...")
    if not validate_submissions(submissions, expected_min=40):
        print("❌ Validation failed. Original file preserved.")
        if backup_path:
            print(f"Backup available at: {backup_path}")
        sys.exit(1)
    
    # Create the compiled structure
    compiled_data = {
        'meta': {
            'generated_at': datetime.now().isoformat(),
            'total_submissions': len(submissions),
            'source_directory': str(structured_path),
            'failed_files': failed_files,
            'format_version': '1.0',
            'description': 'Compiled Meta-Layer submissions in standardized JSON format (SAFE AGGREGATION)'
        },
        'submissions': submissions
    }
    
    # SAFEGUARD 4: Write to temporary file first
    temp_path = output_path.parent / f"allstructured_temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(compiled_data, f, indent=2, ensure_ascii=False)
        
        # SAFEGUARD 5: Final validation of temp file
        print(f"\n🔒 Final validation of temporary file...")
        with open(temp_path, 'r', encoding='utf-8') as f:
            temp_data = json.load(f)
        
        if len(temp_data['submissions']) != len(submissions):
            print("❌ Final validation failed: Temp file submission count mismatch")
            temp_path.unlink()
            sys.exit(1)
        
        # SAFEGUARD 6: Replace original with validated temp file
        shutil.move(temp_path, output_path)
        
        print(f"\n✅ Successfully compiled {len(submissions)} submissions")
        print(f"📁 Output file: {output_path}")
        print(f"📊 File size: {output_path.stat().st_size / 1024:.1f} KB")
        
        if failed_files:
            print(f"⚠️  Failed to process {len(failed_files)} files: {', '.join(failed_files)}")
        
        if backup_path:
            print(f"💾 Backup preserved at: {backup_path}")
            
    except Exception as e:
        print(f"❌ Error during compilation: {e}")
        if temp_path.exists():
            temp_path.unlink()
        print("Original file preserved.")
        if backup_path:
            print(f"Backup available at: {backup_path}")
        sys.exit(1)

def main():
    """Main function."""
    print("🔒 SAFE Meta-Layer Structured Submissions Aggregator")
    print("=" * 60)
    print("This script includes multiple safeguards to prevent data loss.")
    print("It will create a backup before making any changes.")
    print()
    
    # SAFEGUARD 7: User confirmation
    response = input("Do you want to proceed with aggregation? (yes/no): ").lower().strip()
    if response not in ['yes', 'y']:
        print("Operation cancelled.")
        sys.exit(0)
    
    safe_aggregate_submissions()
    
    print("\n✨ SAFE aggregation complete!")

if __name__ == "__main__":
    main() 