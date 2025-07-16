# Desirable Properties - Meta-Layer Initiative

This repository contains the structured data, analysis tools, web application, and documentation for the Meta-Layer Initiative's Desirable Properties project. It aggregates and processes community submissions that define the core properties desired for decentralized digital infrastructure.

## 📋 Project Overview

The Meta-Layer Initiative aims to create a decentralized layer for the internet that embodies community-defined desirable properties. This repository serves as the central hub for:

* **Community submissions** addressing specific Desirable Properties (DPs)
* **Structured data** in standardized JSON format
* **Web application** for exploring and interacting with the data
* **Analysis tools** for processing and understanding submissions
* **Compiled datasets** for research and development

## 🏗️ Repository Structure

```
desirable-properties/
├── data/                          # All data-related content
│   ├── submissions/               # Raw and processed submissions
│   │   ├── txt_files/            # Original text submissions
│   │   └── structured/           # JSON-formatted submissions
│   ├── compiled/                  # Processed and compiled datasets
│   │   ├── allstructured.json    # Complete dataset with all submissions
│   │   ├── dp1.json - dp21.json  # Individual DP analysis files
│   │   └── categories.json       # Categorized submissions
│   └── README.md                 # Data documentation
├── web-app/                       # Next.js web application
│   ├── app/                      # Next.js app directory
│   ├── components/               # React components
│   ├── lib/                      # Utility functions
│   ├── public/                   # Static assets
│   ├── package.json
│   ├── README.md                 # Web app documentation
│   └── DEPLOYMENT.md             # Deployment instructions
├── scripts/                       # Data processing and analysis tools
├── docs/                          # Documentation and protocols
│   ├── desirable_properties.md   # DP definitions
│   ├── protocol_META-DP-EVAL-v1.3.md
│   └── gpt_instructions.md
└── README.md                      # This file
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
21. **DP21** - Multi-modal

## 🌐 Web Application

The repository includes a full-featured Next.js web application at `web-app/` that provides:

- **Submission Browser**: View and search through all community submissions
- **Desirable Properties Explorer**: Browse submissions by specific DPs
- **Interactive Chat Assistant**: AI-powered assistant using DeepSeek API
- **Submission Form**: Submit new contributions to the initiative
- **Hot Reloading**: Real-time updates when data changes
- **Responsive Design**: Works on desktop and mobile devices

### Quick Start (Web App)

```bash
cd web-app
npm install
npm run dev
```

Visit `http://localhost:3000` to explore the application.

For detailed web app documentation, see [web-app/README.md](web-app/README.md).

## 🔧 Data Processing

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

### Adding New Submissions

#### Option 1: Automated Script (Recommended)

```bash
# Add a new submission from a JSON file
node scripts/add-submission.js new-submission.json
```

The script will:
1. Save the individual JSON to `data/submissions/structured/[next_number].json`
2. Update `data/compiled/allstructured.json`
3. Copy to production automatically
4. **No server restart needed** - hot reloading enabled!

#### Option 2: Manual Process

1. **Create structured JSON** in `data/submissions/structured/[number].json` following the META-DP-EVAL-v1.3 protocol
2. **Run processing scripts** to update compiled datasets
3. **Restart web app** if needed (or use hot reloading)

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

* **43 total submissions** processed
* **21 Desirable Properties** defined
* **100% data integrity** across all submissions
* **184KB compiled dataset** ready for analysis

## 📋 Most Addressed Desirable Properties

1. DP14 - Trust and Transparency: 25 submissions
2. DP2 - Participant Agency and Empowerment: 19 submissions
3. DP4 - Data Sovereignty and Privacy: 19 submissions
4. DP7 - Simplicity and Interoperability: 18 submissions
5. DP11 - Safe and Ethical AI: 18 submissions

## 🚀 Deployment

### Web Application Deployment

The web app is deployed at [app.themetalayer.org](https://app.themetalayer.org) using:

- **PM2** for process management
- **Nginx** for reverse proxy
- **Vultr** for hosting

### Update Workflow

#### **Web App Updates**
```bash
# 1. Edit files in development
cd /home/ubuntu/desirable-properties/web-app/
# Make your changes...

# 2. Deploy to production
./deploy.sh

# 3. Verify deployment
pm2 status
```

#### **Data Updates**
```bash
# 1. Add new submissions
# Edit files in data/submissions/structured/

# 2. Process data (if needed)
python scripts/aggregate_structured_submissions.py

# 3. Hot reloading - no deployment needed!
# The app automatically picks up changes
```

### Directory Structure

- **Development**: `/home/ubuntu/desirable-properties/web-app/` ← Edit here
- **Production**: `/var/www/app.themetalayer.org/public/` ← Users see this
- **Data**: `/home/ubuntu/desirable-properties/data/` ← Hot-reloaded

For detailed deployment instructions, see [web-app/README.md](web-app/README.md).

### Hot Reloading System

The app includes **hot reloading** - no server restarts needed for data updates!

- **File watching**: The app watches for changes to data files
- **In-memory caching**: Data is cached and automatically reloaded when files change
- **Automatic updates**: Just save the JSON file and the app picks up changes immediately

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Python 3.8+ (for data processing scripts)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/shiftshapr/desirable-properties.git
cd desirable-properties

# Install web app dependencies
cd web-app
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DeepSeek API key

# Run development server
npm run dev
```

### Useful Commands

```bash
# Web app development
cd web-app
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
./deploy.sh         # Deploy to production

# Data processing
python scripts/text2json.py
python scripts/aggregate_structured_submissions.py

# Deployment and monitoring
pm2 status          # Check app status
pm2 logs app-themetalayer  # View logs
pm2 restart app-themetalayer  # Restart app
pm2 monit           # Monitor resources

# Production directory
ls /var/www/app.themetalayer.org/public/  # View production files
```

## 🤝 Contributing

We welcome contributions to the Desirable Properties project! Please:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Follow the standardized JSON format** for new submissions
4. **Run verification scripts** before submitting
5. **Submit a pull request** with a clear description

### Adding New Submissions

1. Place raw submissions in `data/submissions/txt_files/`
2. Run `python scripts/text2json.py` to convert to structured format
3. Run `python scripts/aggregate_structured_submissions.py` to compile
4. Run `python scripts/generate_dp_files.py` to update DP analysis files

## 📚 Documentation

* **[Data Documentation](data/README.md)** - Complete data structure and usage guide
* **[Web App Documentation](web-app/README.md)** - Application setup and deployment
* **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Comprehensive deployment instructions
* **[Desirable Properties Guide](docs/desirable_properties.md)** - Complete list and descriptions
* **[Protocol META-DP-EVAL-v1.3](docs/protocol_META-DP-EVAL-v1.3.md)** - Evaluation protocol
* **[GPT Instructions](docs/gpt_instructions.md)** - AI assistant guidelines

## 🔒 License

This project is open source and available under the MIT License.

## 🌐 Meta-Layer Initiative

This repository is part of the broader Meta-Layer Initiative aimed at creating decentralized digital infrastructure that serves communities rather than corporations. Learn more at themetalayer.org.

## 📧 Contact

For questions or collaboration opportunities, please reach out through:

* GitHub Issues
* Meta-Layer Initiative website
* Community forums

---

**Generated from community submissions via protocol META-DP-EVAL-v1.3** 