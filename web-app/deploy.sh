#!/bin/bash

# Quick deployment script for web app updates
# Run this from the web-app directory

set -e

echo "🚀 Deploying web app updates..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the web-app directory"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Copying files to production..."
sudo cp -r * /var/www/app.themetalayer.org/public/

echo -e "${GREEN}[INFO]${NC} Ensuring .next directory is copied..."
sudo cp -r .next /var/www/app.themetalayer.org/public/ 2>/dev/null || echo "Warning: .next directory not found in source"

echo -e "${GREEN}[INFO]${NC} Installing dependencies..."
cd /var/www/app.themetalayer.org/public
npm install

echo -e "${GREEN}[INFO]${NC} Building application..."
npm run build

echo -e "${GREEN}[INFO]${NC} Restarting application..."
pm2 restart app-themetalayer

echo -e "${GREEN}[INFO]${NC} Checking status..."
pm2 status

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}Visit: https://app.themetalayer.org${NC}" 