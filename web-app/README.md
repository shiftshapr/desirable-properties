# Meta-Layer Desirable Properties Web Application

A Next.js web application for exploring and interacting with the Meta-Layer Desirable Properties initiative data.

## Features

- **Submission Browser**: View and search through all community submissions
- **Desirable Properties Explorer**: Browse submissions by specific DPs
- **Interactive Chat Assistant**: AI-powered assistant using DeepSeek API
- **Submission Form**: Submit new contributions to the initiative
- **Hot Reloading**: Real-time updates when data changes
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **AI Integration**: DeepSeek API for chat assistant
- **Deployment**: PM2 + Nginx on Vultr
- **Data**: JSON datasets from `../data/` directory

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to DeepSeek API (for chat functionality)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DeepSeek API key

# Run development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```env
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SUBMISSIONS=true

# App Configuration
NEXT_PUBLIC_APP_NAME="Meta-Layer Desirable Properties"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
web-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Chat assistant endpoint
│   │   ├── submissions/   # Submissions API
│   │   └── desirable-properties/ # DP data endpoint
│   ├── submissions/       # Submission pages
│   ├── chat/              # Chat interface
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── ChatModal.tsx     # Chat assistant modal
│   └── SubmissionForm.tsx # Submission form
├── lib/                  # Utility functions
│   ├── api.ts           # API client functions
│   └── data.ts          # Data loading utilities
├── public/              # Static assets
└── data/                # Data files (symlinked from ../data/)
```

## API Endpoints

### `/api/desirable-properties`
Returns all compiled data including submissions and DP analysis.

### `/api/submissions`
Handles new submission creation and retrieval.

### `/api/chat`
DeepSeek-powered chat assistant for answering questions about the Meta-Layer.

## Development

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

### Data Updates

The app automatically loads data from the `../data/` directory. To update the data:

1. Add new submissions to `../data/submissions/structured/`
2. Run processing scripts in `../scripts/`
3. Restart the development server

## Deployment

### Quick Deployment (Recommended)

For regular updates to the web application:

```bash
# From the web-app directory
./deploy.sh
```

This script will:
1. ✅ Build the application locally
2. ✅ Sync files to production directory
3. ✅ Install production dependencies
4. ✅ Start PM2 processes
5. ✅ **Verify application is responding**
6. ✅ **Check critical files were deployed correctly**

### Deployment Verification

The deploy script now includes automatic verification:

- **Application Response**: Tests if the app is responding at https://app.themetalayer.org
- **Critical Files**: Verifies that important files like VoteButtons.tsx were deployed
- **Latest Fixes**: Checks for specific code patterns to ensure latest fixes are deployed
- **PM2 Status**: Confirms the process is running correctly

### Manual Verification

If you need to verify deployment manually:

```bash
# Check PM2 status
pm2 status

# Test application response
curl -I https://app.themetalayer.org

# Verify critical files
ls -la /var/www/app.themetalayer.org/public/app/components/VoteButtons.tsx

# Check for latest fixes
grep -n "voteType" /var/www/app.themetalayer.org/public/app/components/VoteButtons.tsx
```

### Initial Server Setup

For first-time server setup:

```bash
chmod +x setup-server.sh
./setup-server.sh
```

### Manual Deployment

1. Build the application: `npm run build`
2. Copy to production: `sudo cp -r * /var/www/app.themetalayer.org/public/`
3. Install dependencies: `cd /var/www/app.themetalayer.org/public && npm install --production`
4. Build in production: `npm run build`
5. Restart PM2: `pm2 restart app-themetalayer`

### Automated Deployment (GitHub Actions)

When you push changes to the main branch, GitHub Actions will automatically deploy:

```bash
git add .
git commit -m "Update web app"
git push origin main
```

### Development vs Production

- **Development**: `/home/ubuntu/desirable-properties/web-app/` (edit here)
- **Production**: `/var/www/app.themetalayer.org/public/` (users see this)
- **PM2 Process**: Manages the running application
- **Nginx**: Serves the application at app.themetalayer.org

### Environment Setup

For production deployment:

```bash
# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
PORT=3000
DEEPSEEK_API_KEY=your_production_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SUBMISSIONS=true
EOF
```

## Monitoring and Maintenance

### PM2 Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs app-themetalayer

# Restart app
pm2 restart app-themetalayer

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

## Troubleshooting

### Common Issues

1. **Chat not working**: Check DeepSeek API key and feature flags
2. **Data not loading**: Verify data files exist in `../data/compiled/`
3. **Build errors**: Check Node.js version and dependencies
4. **Deployment issues**: Review PM2 and Nginx logs
5. **404 errors on static files**: Ensure static files are copied to `_next/static/` not `static/`

### Static Files Issues

If you see 404 errors for static files (like `_next/static/chunks/...`), the issue is likely that static files are being copied to the wrong location. The deploy script should copy files to `_next/static/` not `static/`.

**Fix**: Update the deploy script to use the correct path:
```bash
# Correct path for Next.js static files
sudo mkdir -p /var/www/app.themetalayer.org/public/_next/static
sudo cp -r /var/www/app.themetalayer.org/public/.next/static/* /var/www/app.themetalayer.org/public/_next/static/
```

### Log Locations

- **PM2 logs**: `pm2 logs app-themetalayer`
- **Nginx logs**: `/var/log/nginx/error.log`
- **Application logs**: Check PM2 logs for detailed error information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a pull request

## License

This project is part of the Meta-Layer Initiative and is available under the MIT License.

## Support

For issues and questions:
- Check the main repository documentation
- Review the deployment guide in `DEPLOYMENT.md`
- Contact the Meta-Layer Initiative team
