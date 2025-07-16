# Data Directory

This directory contains all data related to the Meta-Layer Desirable Properties initiative, including raw submissions, structured data, and compiled datasets.

## Directory Structure

```
data/
├── submissions/           # Raw and processed submissions
│   ├── txt_files/        # Original text submissions
│   └── structured/       # JSON-formatted submissions
├── compiled/             # Processed and compiled datasets
│   ├── allstructured.json    # Complete dataset with all submissions
│   ├── dp1.json - dp21.json  # Individual DP analysis files
│   └── categories.json       # Categorized submissions
└── README.md             # This file
```

## Data Files

### Submissions

- **`submissions/txt_files/`**: Original text submissions from contributors
- **`submissions/structured/`**: JSON-formatted submissions following the META-DP-EVAL-v1.3 protocol

### Compiled Datasets

- **`allstructured.json`**: Complete dataset containing all submissions in unified format
- **`dp1.json` - `dp21.json`**: Individual Desirable Property analysis files containing all submissions that address each specific DP
- **`categories.json`**: Categorized view of submissions by type and theme

## Data Format

All structured submissions follow the standardized JSON format defined by protocol META-DP-EVAL-v1.3:

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
      "dp": "DP# - Name",
      "summary": "string"
    }
  ],
  "clarifications_and_extensions": [
    {
      "dp": "DP# – Name",
      "type": "Extension|Clarification",
      "title": "string",
      "extension": "string",
      "clarification": "string",
      "why_it_matters": "string"
    }
  ]
}
```

## Usage

### For Researchers
- Use `allstructured.json` for comprehensive analysis of all submissions
- Use individual `dp*.json` files for focused analysis on specific Desirable Properties
- Use `categories.json` for thematic analysis

### For Developers
- The web application in `../web-app/` uses these datasets to power the submission viewer and chat assistant
- Data is automatically loaded and processed by the Next.js application

### For Contributors
- New submissions should be added to `submissions/structured/` following the JSON format
- Run the processing scripts in `../scripts/` to update compiled datasets

## Processing Scripts

Use the scripts in the `../scripts/` directory to process and compile data:

```bash
# Convert raw submissions to structured format
python scripts/text2json.py

# Aggregate all structured submissions
python scripts/aggregate_structured_submissions.py

# Generate individual DP analysis files
python scripts/generate_dp_files.py

# Verify data integrity
python scripts/verify_compiled_submissions.py
```

## Statistics

- **Total Submissions**: 43
- **Desirable Properties**: 21
- **Data Integrity**: 100%
- **Compiled Dataset Size**: ~184KB

## Most Addressed Desirable Properties

1. DP14 - Trust and Transparency: 25 submissions
2. DP2 - Participant Agency and Empowerment: 19 submissions
3. DP4 - Data Sovereignty and Privacy: 19 submissions
4. DP7 - Simplicity and Interoperability: 18 submissions
5. DP11 - Safe and Ethical AI: 18 submissions

## License

This data is part of the Meta-Layer Initiative and is available under the MIT License.

## Contact

For questions about the data or to contribute new submissions, please refer to the main repository documentation or contact the Meta-Layer Initiative team. 