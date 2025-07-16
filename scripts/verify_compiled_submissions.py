#!/usr/bin/env python3
"""
Meta-Layer Compiled Submissions Verifier

This script verifies and analyzes the compiled submissions file,
providing statistics and integrity checks.

Usage:
    python verify_compiled_submissions.py
"""

import json
from pathlib import Path
from collections import Counter
import sys

def load_compiled_file():
    """Load the compiled submissions file."""
    script_dir = Path(__file__).parent
    compiled_file = script_dir.parent / "compiled" / "allstructured.json"
    
    if not compiled_file.exists():
        print(f"Error: Compiled file not found at {compiled_file}")
        sys.exit(1)
    
    try:
        with open(compiled_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading compiled file: {e}")
        sys.exit(1)

def analyze_submissions(data):
    """Analyze the compiled submissions data."""
    print("📊 Compiled Submissions Analysis")
    print("=" * 40)
    
    # Basic metadata
    meta = data.get('meta', {})
    submissions = data.get('submissions', [])
    
    print(f"📅 Generated: {meta.get('generated_at', 'Unknown')}")
    print(f"📁 Total submissions: {meta.get('total_submissions', 0)}")
    print(f"🔢 Submissions in array: {len(submissions)}")
    print(f"❌ Failed files: {len(meta.get('failed_files', []))}")
    
    if meta.get('failed_files'):
        print(f"   Failed: {', '.join(meta['failed_files'])}")
    
    print()
    
    # Analyze submissions
    submitter_stats = {"with_names": 0, "email_only": 0, "total_emails": 0}
    dp_counter = Counter()
    extension_counter = Counter()
    clarification_counter = Counter()
    
    for submission in submissions:
        # Submitter analysis
        submitter = submission.get('submitter', {})
        if submitter.get('first_name') and submitter.get('last_name'):
            submitter_stats['with_names'] += 1
        if submitter.get('email'):
            submitter_stats['total_emails'] += 1
            if not (submitter.get('first_name') and submitter.get('last_name')):
                submitter_stats['email_only'] += 1
        
        # DP analysis
        for dp_item in submission.get('directly_addressed_dps', []):
            dp_counter[dp_item.get('dp', 'Unknown')] += 1
        
        # Extensions and clarifications
        for item in submission.get('clarifications_and_extensions', []):
            if item.get('type') == 'Extension':
                extension_counter[item.get('dp', 'Unknown')] += 1
            elif item.get('type') == 'Clarification':
                clarification_counter[item.get('dp', 'Unknown')] += 1
    
    # Print submitter stats
    print("👤 Submitter Statistics")
    print("-" * 25)
    print(f"With full names: {submitter_stats['with_names']}")
    print(f"Email only: {submitter_stats['email_only']}")
    print(f"Total with emails: {submitter_stats['total_emails']}")
    print()
    
    # Print DP stats
    print("📋 Most Addressed Desirable Properties")
    print("-" * 40)
    for dp, count in dp_counter.most_common(10):
        print(f"{dp}: {count}")
    print()
    
    # Print extension stats
    print("🔧 Most Extended DPs")
    print("-" * 20)
    for dp, count in extension_counter.most_common(5):
        print(f"{dp}: {count}")
    print()
    
    # Print clarification stats
    print("💡 Most Clarified DPs")
    print("-" * 22)
    for dp, count in clarification_counter.most_common(5):
        print(f"{dp}: {count}")
    print()
    
    # Integrity checks
    print("🔍 Integrity Checks")
    print("-" * 18)
    
    # Check for missing required fields
    issues = []
    for i, submission in enumerate(submissions):
        file_num = submission.get('_metadata', {}).get('file_number', i+1)
        
        if not submission.get('submitter'):
            issues.append(f"File {file_num}: Missing submitter")
        if not submission.get('submission'):
            issues.append(f"File {file_num}: Missing submission")
        if not submission.get('directly_addressed_dps'):
            issues.append(f"File {file_num}: Missing directly_addressed_dps")
        if not submission.get('clarifications_and_extensions'):
            issues.append(f"File {file_num}: Missing clarifications_and_extensions")
    
    if issues:
        print("❌ Issues found:")
        for issue in issues[:10]:  # Show first 10 issues
            print(f"   {issue}")
        if len(issues) > 10:
            print(f"   ... and {len(issues) - 10} more")
    else:
        print("✅ All submissions have required fields")
    
    print()
    print("📁 File Information")
    print("-" * 18)
    file_size = Path(__file__).parent.parent / "compiled" / "allstructured.json"
    if file_size.exists():
        size_kb = file_size.stat().st_size / 1024
        size_mb = size_kb / 1024
        print(f"File size: {size_kb:.1f} KB ({size_mb:.2f} MB)")
    
    return len(issues) == 0

def main():
    """Main function."""
    print("Meta-Layer Compiled Submissions Verifier")
    print("=" * 45)
    print()
    
    data = load_compiled_file()
    is_valid = analyze_submissions(data)
    
    print()
    if is_valid:
        print("✅ Verification complete - All submissions are valid!")
    else:
        print("⚠️  Verification complete - Some issues found")
        sys.exit(1)

if __name__ == "__main__":
    main() 