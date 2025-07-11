#!/usr/bin/env python3
"""
Meta-Layer DP File Generator

This script generates individual JSON files for each Desirable Property (DP)
that aggregate all alignments, clarifications, and extensions for that DP.

Usage:
    python generate_dp_files.py
"""

import json
import os
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime
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

def extract_dp_number(dp_string):
    """Extract the DP number from a DP string like 'DP1 - Name' or 'DP10 – Name'."""
    if not dp_string:
        return None
    
    # Match patterns like "DP1", "DP10", etc.
    match = re.match(r'DP(\d+)', dp_string.strip())
    if match:
        return int(match.group(1))
    return None

def get_compiled_output_path():
    """Get the path for the compiled output directory."""
    script_dir = Path(__file__).parent
    compiled_dir = script_dir.parent / "compiled"
    return compiled_dir

def generate_dp_files(data):
    """Generate individual DP files from compiled data."""
    submissions = data.get('submissions', [])
    output_dir = get_compiled_output_path()
    
    print(f"Processing {len(submissions)} submissions...")
    
    # Dictionary to store data for each DP
    dp_data = defaultdict(lambda: {
        'alignments': [],
        'clarifications': [],  
        'extensions': []
    })
    
    # Process each submission
    for submission in submissions:
        submitter = submission.get('submitter', {})
        submission_info = submission.get('submission', {})
        metadata = submission.get('_metadata', {})
        
        # Common submission context
        submission_context = {
            'submission_title': submission_info.get('title', ''),
            'submission_overview': submission_info.get('overview', ''),
            'submitter_name': f"{submitter.get('first_name', '')} {submitter.get('last_name', '')}".strip(),
            'submitter_email': submitter.get('email', ''),
            'source_file': metadata.get('source_file', '')
        }
        
        # Process directly addressed DPs (alignments)
        for dp_item in submission.get('directly_addressed_dps', []):
            dp_num = extract_dp_number(dp_item.get('dp', ''))
            if dp_num:
                alignment_entry = {
                    'summary': dp_item.get('summary', ''),
                    **submission_context
                }
                dp_data[dp_num]['alignments'].append(alignment_entry)
                # Store the DP name for the meta section
                if 'dp_name' not in dp_data[dp_num]:
                    dp_data[dp_num]['dp_name'] = dp_item.get('dp', f'DP{dp_num}')
        
        # Process clarifications and extensions
        for item in submission.get('clarifications_and_extensions', []):
            dp_num = extract_dp_number(item.get('dp', ''))
            if dp_num:
                base_entry = {
                    'title': item.get('title', ''),
                    'why_it_matters': item.get('why_it_matters', ''),
                    **submission_context
                }
                
                # Store the DP name for the meta section
                if 'dp_name' not in dp_data[dp_num]:
                    dp_data[dp_num]['dp_name'] = item.get('dp', f'DP{dp_num}')
                
                if item.get('type') == 'Extension':
                    extension_entry = {
                        **base_entry,
                        'extension': item.get('extension', '')
                    }
                    dp_data[dp_num]['extensions'].append(extension_entry)
                    
                elif item.get('type') == 'Clarification':
                    clarification_entry = {
                        **base_entry,
                        'clarification': item.get('clarification', '')
                    }
                    dp_data[dp_num]['clarifications'].append(clarification_entry)
    
    # Generate individual DP files
    generated_files = []
    
    for dp_num in sorted(dp_data.keys()):
        dp_info = dp_data[dp_num]
        
        # Get the DP name
        dp_name = dp_info.get('dp_name', f'DP{dp_num}')
        
        # Create the DP file structure
        dp_file_data = {
            'meta': {
                'dp_number': dp_num,
                'dp': dp_name,
                'generated_at': datetime.now().isoformat(),
                'total_alignments': len(dp_info['alignments']),
                'total_clarifications': len(dp_info['clarifications']),
                'total_extensions': len(dp_info['extensions']),
                'source_compiled_file': 'allstructured.json'
            },
            'alignments': dp_info['alignments'],
            'clarifications': dp_info['clarifications'],
            'extensions': dp_info['extensions']
        }
        
        # Write the DP file
        output_file = output_dir / f"dp{dp_num}.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(dp_file_data, f, indent=2, ensure_ascii=False)
            
            generated_files.append(f"dp{dp_num}.json")
            print(f"✅ Generated {output_file.name}: {dp_file_data['meta']['total_alignments']} alignments, {dp_file_data['meta']['total_clarifications']} clarifications, {dp_file_data['meta']['total_extensions']} extensions")
            
        except Exception as e:
            print(f"❌ Error writing {output_file}: {e}")
    
    return generated_files

def main():
    """Main function."""
    print("Meta-Layer DP File Generator")
    print("=" * 35)
    
    # Load compiled data
    data = load_compiled_file()
    
    # Generate DP files
    generated_files = generate_dp_files(data)
    
    print(f"\n✨ Generated {len(generated_files)} DP files:")
    for filename in generated_files:
        print(f"   📄 {filename}")
    
    print("\n🎉 DP file generation complete!")

if __name__ == "__main__":
    main()
