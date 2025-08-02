#!/bin/bash

set -e

# Request sudo access at the beginning to avoid interruptions
echo "[INFO] Requesting sudo access for deployment..."
if ! sudo -n true 2>/dev/null; then
    echo "[INFO] Please enter your sudo password to continue with deployment..."
    sudo -v
fi

# Keep sudo alive for the duration of the script
while true; do
    sudo -n true
    sleep 50
    kill -0 "$$" || exit
done 2>/dev/null &

echo "[INFO] Starting deployment process..."

# Function to kill any processes using port 3000
kill_port_processes() {
    echo "[INFO] Checking for processes using port 3000..."
    
    # Method 1: Using lsof
    PORT_PIDS=$(sudo lsof -ti:3000 2>/dev/null || true)
    
    # Method 2: Using netstat if lsof doesn't work
    if [ -z "$PORT_PIDS" ]; then
        PORT_PIDS=$(sudo netstat -tulpn 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | grep -v "^-$" || true)
    fi
    
    # Method 3: Using ss if netstat doesn't work
    if [ -z "$PORT_PIDS" ]; then
        PORT_PIDS=$(sudo ss -tulpn 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | grep -v "^-$" || true)
    fi
    
    if [ ! -z "$PORT_PIDS" ]; then
        echo "[INFO] Found processes using port 3000: $PORT_PIDS"
        for pid in $PORT_PIDS; do
            if [ ! -z "$pid" ] && [ "$pid" != "-" ]; then
                echo "[INFO] Killing process $pid"
                sudo kill -9 $pid 2>/dev/null || true
            fi
        done
        sleep 3  # Give more time for processes to be killed
    else
        echo "[INFO] No processes found using port 3000"
    fi
    
    # Double-check that port is free
    if sudo lsof -ti:3000 >/dev/null 2>&1; then
        echo "[WARNING] Port 3000 is still in use after killing processes. Trying to kill all Node.js processes..."
        sudo pkill -f "node.*start" 2>/dev/null || true
        sudo pkill -f "next.*start" 2>/dev/null || true
        sleep 2
    fi
}

# Function to stop PM2 processes
stop_pm2_processes() {
    echo "[INFO] Stopping PM2 processes..."
    
    # Stop and delete the specific app
    sudo pm2 stop app-themetalayer 2>/dev/null || true
    sudo pm2 delete app-themetalayer 2>/dev/null || true
    
    # Also stop any other processes that might be running
    sudo pm2 stop all 2>/dev/null || true
    sudo pm2 delete all 2>/dev/null || true
    
    # Kill any remaining PM2 processes
    sudo pkill -f "pm2" 2>/dev/null || true
    
    sleep 3
}

# Function to start PM2 processes
start_pm2_processes() {
    echo "[INFO] Starting PM2 processes..."
    cd /var/www/app.themetalayer.org/public
    
    # Ensure port is free before starting
    if sudo lsof -ti:3000 >/dev/null 2>&1; then
        echo "[ERROR] Port 3000 is still in use! Cannot start application."
        exit 1
    fi
    
    sudo pm2 start npm --name "app-themetalayer" -- start
    sudo pm2 save
    sudo pm2 startup
    
    # Wait a moment for the process to start
    sleep 5
}

# Function to increment version
increment_version() {
    local version_file="version.json"
    if [ -f "$version_file" ]; then
        # Read current build number
        local current_build=$(jq -r '.build' "$version_file")
        local new_build=$((current_build + 1))
        
        # Update version.json with new build number and timestamp
        jq --arg build "$new_build" \
           --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
           '.build = $build | .timestamp = $timestamp' "$version_file" > "${version_file}.tmp"
        mv "${version_file}.tmp" "$version_file"
        
        echo "[INFO] Incremented build number to: $new_build"
    else
        echo "[ERROR] version.json not found!"
        exit 1
    fi
}

# Main deployment process
echo "[INFO] Incrementing version..."
increment_version

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

# Copy production environment variables to main .env file
echo "[INFO] Setting up production environment variables..."
sudo cp .env.production .env

# Start PM2 processes
start_pm2_processes

# Verification steps
echo "[INFO] Verifying deployment..."
echo "[INFO] Checking PM2 status..."
sudo pm2 status

# Verify version is deployed
echo "[INFO] Verifying version deployment..."
sleep 5  # Give the app time to start
VERSION_RESPONSE=$(curl -s https://app.themetalayer.org/api/version)
if echo "$VERSION_RESPONSE" | grep -q "build"; then
    echo "[INFO] ✅ Version API responding successfully"
    echo "[INFO] Version info: $VERSION_RESPONSE"
else
    echo "[ERROR] ❌ Version API not responding correctly"
    echo "[ERROR] Response: $VERSION_RESPONSE"
fi

# Clear browser cache by adding cache-busting headers
echo "[INFO] Adding cache-busting headers to force fresh content..."
sudo sed -i 's/add_header Cache-Control "public, max-age=3600";/add_header Cache-Control "no-cache, no-store, must-revalidate";/g' /etc/nginx/sites-available/app.themetalayer.org
sudo systemctl reload nginx

echo "[INFO] Verifying application is responding..."
if curl -f -s https://app.themetalayer.org > /dev/null; then
    echo "[INFO] ✅ Application is responding successfully"
else
    echo "[ERROR] ❌ Application is not responding!"
    exit 1
fi

echo "[INFO] Verifying critical files were deployed..."
if [ -f "/var/www/app.themetalayer.org/public/app/components/VoteButtons.tsx" ]; then
    echo "[INFO] ✅ VoteButtons.tsx deployed"
    if grep -q "voteType" /var/www/app.themetalayer.org/public/app/components/VoteButtons.tsx; then
        echo "[INFO] ✅ VoteButtons.tsx contains latest fixes"
    else
        echo "[WARNING] ⚠️  VoteButtons.tsx may not contain latest fixes"
    fi
else
    echo "[ERROR] ❌ VoteButtons.tsx not found!"
    exit 1
fi

echo "[INFO] Deployment completed successfully!"
echo "[INFO] Deployment finished. The application should now be running at https://app.themetalayer.org" 