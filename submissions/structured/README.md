# Meta-Layer Submissions - Standardized JSON Format

## Overview

This directory contains Meta-Layer submissions in a unified JSON format. All 43 submission files have been standardized to ensure consistency and enable systematic processing.

## Standardized JSON Structure

All submission files follow this exact structure:

```json
{
  "submitter": {
    "first_name": "string",
    "last_name": "string", 
    "email": "string"
  },
  "submission": {
    "title": "string",
    "overview": "string",
    "source_link": "string (optional)",
    "raw_content": "string (optional)"
  },
  "directly_addressed_dps": [
    {
      "dp": "string (format: 'DP# - Name')",
      "summary": "string"
    }
  ],
  "clarifications_and_extensions": [
    {
      "dp": "string (format: 'DP# – Name')",
      "type": "string ('Extension' or 'Clarification')",
      "title": "string",
      "extension": "string (for extensions)",
      "clarification": "string (for clarifications)", 
      "why_it_matters": "string"
    }
  ]
}
```

## Field Descriptions

### Submitter Object
- **first_name**: Submitter's first name
- **last_name**: Submitter's last name  
- **email**: Submitter's email address

### Submission Object
- **title**: Title of the submission
- **overview**: Detailed description of the submission
- **source_link**: URL to external source (optional)
- **raw_content**: Full text content when available (optional)

### Directly Addressed DPs Array
Contains DPs (Desirable Properties) that the submission directly addresses:
- **dp**: Desirable Property identifier and name (format: "DP# - Name")
- **summary**: Summary of how the submission addresses this DP

### Clarifications and Extensions Array
Contains additional clarifications or extensions to existing DPs:
- **dp**: Desirable Property identifier and name (format: "DP# – Name")
- **type**: Either "Extension" or "Clarification"
- **title**: Title of the clarification/extension
- **extension**: Description of the extension (for type "Extension")
- **clarification**: Description of the clarification (for type "Clarification")
- **why_it_matters**: Explanation of the importance/relevance

## Example

```json
{
  "submitter": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com"
  },
  "submission": {
    "title": "Enhanced Meta-Layer Architecture",
    "overview": "A comprehensive approach to improving meta-layer functionality...",
    "source_link": "https://github.com/example/meta-layer",
    "raw_content": "Full detailed content here..."
  },
  "directly_addressed_dps": [
    {
      "dp": "DP1 - Scalability",
      "summary": "Addresses scalability through distributed architecture"
    }
  ],
  "clarifications_and_extensions": [
    {
      "dp": "DP2 – Security",
      "type": "Extension",
      "title": "Multi-layer Security Model",
      "extension": "Extends security requirements to include quantum-resistant encryption",
      "why_it_matters": "Future-proofs the system against quantum computing threats"
    }
  ]
}
```

## Format Conversion Guidelines

If you encounter submissions in different formats, convert them to the standard format using these mappings:

### Common Field Name Mappings
- `directly_addressed_desirable_properties` → `directly_addressed_dps`
- `clarifications_extensions` → `clarifications_and_extensions`
- `contribution_overview` → `overview`
- `submitter_first_name` → `submitter.first_name`
- `submitter_last_name` → `submitter.last_name`
- `submitter_email` → `submitter.email`

### Website Form Format Conversion
Remove these fields if present:
- `website`
- `form_name`
- `preferences`
- `timestamp`
- `ip_address`
- Any other form metadata

### Nested Structure Flattening
If you encounter nested `contribute_an_idea` structures, flatten them by moving the nested content to the root level.

## Validation Checklist

Before adding new submissions, ensure:

1. ✅ **Structure**: Follows the exact JSON structure above
2. ✅ **Required Fields**: All required fields are present
3. ✅ **Field Names**: Use exact field names (case-sensitive)
4. ✅ **Data Types**: Arrays are arrays, objects are objects, strings are strings
5. ✅ **DP Format**: DP identifiers follow "DP# - Name" or "DP# – Name" format
6. ✅ **JSON Syntax**: Valid JSON (no syntax errors, properly escaped quotes)
7. ✅ **Content Integrity**: All original content is preserved

## File Naming Convention

JSON files should be named numerically: `1.json`, `2.json`, `3.json`, etc.

## Tools and Scripts

For systematic processing, this standardized format enables:
- Automated data extraction
- Consistent analysis across all submissions
- Easy integration with processing pipelines
- Reliable data validation

## Maintenance

To maintain consistency:
1. Always validate new submissions against this format
2. Convert any non-conforming submissions before adding them
3. Update this README if the format evolves
4. Preserve all original content during format conversions

## Last Updated

This format was established and all 43 files were unified on [Current Date]. All submissions maintain their original content while following this consistent structure. 