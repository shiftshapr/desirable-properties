# Desirable Properties - Meta-Layer Initiative

This repository contains the structured data, analysis tools, and documentation for the Meta-Layer Initiative's Desirable Properties project. It aggregates and processes community submissions that define the core properties desired for decentralized digital infrastructure.

## 📋 Project Overview

The Meta-Layer Initiative aims to create a decentralized layer for the internet that embodies community-defined desirable properties. This repository serves as the central hub for:

- **Community submissions** addressing specific Desirable Properties (DPs)
- **Structured data** in standardized JSON format
- **Analysis tools** for processing and understanding submissions
- **Compiled datasets** for research and development

## 🏗️ Repository Structure

```
desirable-properties/
├── compiled/                    # Processed and compiled data
│   ├── allstructured.json      # All submissions in unified format
│   ├── dp1.json - dp21.json    # Individual DP analysis files
│   └── categories.json         # Categorized submissions
├── scripts/                     # Data processing and analysis tools
│   ├── aggregate_structured_submissions.py
│   ├── verify_compiled_submissions.py
│   ├── generate_dp_files.py
│   ├── text2json.py
│   └── parse_eml_to_json.py
├── submissions/                 # Raw and processed submissions
│   ├── structured/             # Standardized JSON submissions
│   ├── txt_files/              # Original text submissions
│   ├── manual/                 # Manually processed submissions
│   └── interpreted/            # AI-interpreted submissions
└── docs/                       # Documentation and protocols
    ├── desirable_properties.md
    └── protocol_META-DP-EVAL-v1.3.md
```

## 🎯 Desirable Properties

The project currently tracks 21 core Desirable Properties for the Meta-Layer:

1. **DP1** - Federated Authentication & Accountability
2. **DP2** - Participant Agency and Empowerment
3. **DP3** - Adaptive Governance Supporting an Exponentially Growing Community
4. **DP4** - Data Sovereignty and Privacy
5. **DP5** - Consensus and Conflict Resolution
6. **DP6** - Incentive Alignment and Motivation
7. **DP7** - Simplicity and Interoperability
8. **DP8** - Collaborative Environment and Meta-Communities
9. **DP9** - Scalability and Performance
10. **DP10** - Education
11. **DP11** - Safe and Ethical AI
12. **DP12** - Decentralized Moderation
13. **DP13** - AI Containment
14. **DP14** - Trust and Transparency
15. **DP15** - Security and Provenance
16. **DP16** - Roadmap and Milestones
17. **DP17** - Sustainability and Longevity
18. **DP18** - Feedback Loops and Reputation
19. **DP19** - Amplifying Presence and Community Engagement
20. **DP20** - Community Ownership
21. **DP21** - Open Source and Accessibility

## 🔧 Usage

### Processing New Submissions

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

### Data Analysis

The `compiled/` directory contains ready-to-use datasets:

- **`allstructured.json`** - Complete dataset with all submissions
- **`dp{N}.json`** - Individual DP analysis with related submissions
- **`categories.json`** - Categorized view of submissions

### Standardized JSON Format

All submissions follow this structure:

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

## 📊 Current Statistics

- **43 total submissions** processed
- **21 Desirable Properties** defined
- **100% data integrity** across all submissions
- **183KB compiled dataset** ready for analysis

### Most Addressed Properties
1. **DP14** - Trust and Transparency (25 submissions)
2. **DP2** - Participant Agency and Empowerment (19 submissions)
3. **DP4** - Data Sovereignty and Privacy (19 submissions)
4. **DP7** - Simplicity and Interoperability (18 submissions)
5. **DP11** - Safe and Ethical AI (18 submissions)

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/desirable-properties.git
   cd desirable-properties
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt  # if requirements.txt exists
   ```

3. **Explore the data**:
   ```bash
   python scripts/verify_compiled_submissions.py
   ```

## 🤝 Contributing

We welcome contributions to the Desirable Properties project! Please:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Follow the standardized JSON format** for new submissions
4. **Run verification scripts** before submitting
5. **Submit a pull request** with a clear description

### Adding New Submissions

1. Place raw submissions in `submissions/txt_files/`
2. Run `python scripts/text2json.py` to convert to structured format
3. Run `python scripts/aggregate_structured_submissions.py` to compile
4. Run `python scripts/generate_dp_files.py` to update DP analysis files

## 📚 Documentation

- **[Desirable Properties Guide](docs/desirable_properties.md)** - Complete list and descriptions
- **[Protocol META-DP-EVAL-v1.3](docs/protocol_META-DP-EVAL-v1.3.md)** - Evaluation protocol
- **[JSON Format Guide](submissions/structured/README.md)** - Standardized format documentation

## 🔒 License

This project is open source and available under the [MIT License](LICENSE).

## 🌐 Meta-Layer Initiative

This repository is part of the broader Meta-Layer Initiative aimed at creating decentralized digital infrastructure that serves communities rather than corporations. Learn more at [themetalayer.org](https://themetalayer.org).

## 📧 Contact

For questions or collaboration opportunities, please reach out through:
- GitHub Issues
- Meta-Layer Initiative website
- Community forums

---

**Generated from community submissions via protocol META-DP-EVAL-v1.3** 