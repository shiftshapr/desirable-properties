#!/bin/bash

# Server Setup Script for app.themetalayer.org
# Run this script on your Vultr server after uploading the files

set -e

echo "🚀 Setting up Meta-Layer Desirable Properties Web App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    echo "Run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
fi

# Create directories
print_status "Creating directories..."
sudo mkdir -p /var/www/app.themetalayer.org

# Copy files to production directory
print_status "Copying files to production directory..."
# Use rsync to avoid overwriting .env and .env.production
sudo rsync -av --delete --exclude='.env' --exclude='.env.production' /home/ubuntu/desirable-properties/web-app/ /var/www/app.themetalayer.org/public/

# Set ownership
print_status "Setting proper ownership..."
sudo chown -R ubuntu:ubuntu /var/www/app.themetalayer.org

# Install dependencies
print_status "Installing production dependencies..."
cd /var/www/app.themetalayer.org/public
npm install --production

# Build the application
print_status "Building application..."
npm run build

# Create environment file
print_status "Creating environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
PORT=3000
EOF

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'app-themetalayer',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/app.themetalayer.org/public',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Stop any existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop app-themetalayer 2>/dev/null || true
pm2 delete app-themetalayer 2>/dev/null || true

# Start the application
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
print_status "Setting up PM2 startup..."
pm2 startup | grep "sudo" | sh

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    print_warning "Nginx is not installed. Installing..."
    sudo apt update
    sudo apt install -y nginx
fi

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/app.themetalayer.org << EOF
server {
    listen 80;
    server_name app.themetalayer.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/app.themetalayer.org /etc/nginx/sites-enabled/

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Enable Nginx autostart
sudo systemctl enable nginx

print_status "Waiting for application to start..."
sleep 5

# Test the application
print_status "Testing application..."
if curl -f http://localhost:3000/api/desirable-properties > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
else
    print_error "❌ Application is not responding. Check PM2 logs: pm2 logs app-themetalayer"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Make sure your domain DNS points to this server IP"
echo "2. Visit http://app.themetalayer.org to test"
echo "3. Consider setting up SSL: sudo certbot --nginx -d app.themetalayer.org"
echo ""
echo "Useful commands:"
echo "  - Check app status: pm2 status"
echo "  - View logs: pm2 logs app-themetalayer"
echo "  - Restart app: pm2 restart app-themetalayer"
echo "  - Monitor: pm2 monit"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}" 