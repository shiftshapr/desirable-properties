#!/bin/bash

set -e

echo "[INFO] Starting deployment process..."

# Function to kill any processes using port 3000
kill_port_processes() {
    echo "[INFO] Checking for processes using port 3000..."
    PORT_PIDS=$(sudo netstat -tulpn 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | grep -v "^-$" || true)
    
    if [ ! -z "$PORT_PIDS" ]; then
        echo "[INFO] Found processes using port 3000: $PORT_PIDS"
        for pid in $PORT_PIDS; do
            if [ ! -z "$pid" ] && [ "$pid" != "-" ]; then
                echo "[INFO] Killing process $pid"
                sudo kill -9 $pid 2>/dev/null || true
            fi
        done
        sleep 2
    else
        echo "[INFO] No processes found using port 3000"
    fi
}

# Function to stop PM2 processes
stop_pm2_processes() {
    echo "[INFO] Stopping PM2 processes..."
    sudo pm2 stop app-themetalayer 2>/dev/null || true
    sudo pm2 delete app-themetalayer 2>/dev/null || true
    sleep 2
}

# Function to start PM2 processes
start_pm2_processes() {
    echo "[INFO] Starting PM2 processes..."
    cd /var/www/app.themetalayer.org/public
    sudo pm2 start npm --name "app-themetalayer" -- start
    sudo pm2 save
    sudo pm2 startup
}

# Main deployment process
echo "[INFO] Installing dependencies and building locally..."

# Install dependencies
npm install

# Build the application
npm run build

echo "[INFO] Build completed successfully"

# Kill any processes using port 3000
kill_port_processes

# Stop existing PM2 processes
stop_pm2_processes

# Sync ALL necessary files to production (zero-downtime deployment)
echo "[INFO] Syncing files to production..."
sudo rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='.env.local' \
    --exclude='.env.development' \
    . /var/www/app.themetalayer.org/public/

# Copy build files separately
echo "[INFO] Syncing build files..."
sudo rsync -av --delete .next/ /var/www/app.themetalayer.org/public/.next/

# Copy static files to the correct location for Next.js
echo "[INFO] Copying static files..."
sudo mkdir -p /var/www/app.themetalayer.org/public/_next/static
sudo cp -r /var/www/app.themetalayer.org/public/.next/static/* /var/www/app.themetalayer.org/public/_next/static/

# Verify static files were copied correctly
echo "[INFO] Verifying static files..."
if [ -d "/var/www/app.themetalayer.org/public/_next/static/chunks/app/submit/" ] && [ -d "/var/www/app.themetalayer.org/public/_next/static/chunks/app/leaderboard/" ]; then
    echo "[INFO] Static files verified successfully"
else
    echo "[ERROR] Static files verification failed!"
    exit 1
fi

# Install production dependencies in production directory
echo "[INFO] Installing production dependencies..."
cd /var/www/app.themetalayer.org/public
sudo npm install --production

# Start PM2 processes
start_pm2_processes

echo "[INFO] Deployment completed successfully!"
echo "[INFO] Checking PM2 status..."
sudo pm2 status

echo "[INFO] Deployment finished. The application should now be running at https://app.themetalayer.org" 