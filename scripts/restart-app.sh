#!/bin/bash

# Script to cleanly restart the Meta-Layer app and resolve port 3000 conflicts

APP_NAME="app-themetalayer"
PORT=3000

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}
function print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}
function print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Stopping PM2 app: $APP_NAME..."
pm2 stop $APP_NAME || print_warning "App $APP_NAME was not running."

print_status "Checking for processes using port $PORT..."
PIDS=$(sudo lsof -ti:$PORT)
if [ -n "$PIDS" ]; then
  print_warning "Killing processes on port $PORT: $PIDS"
  sudo kill -9 $PIDS
else
  print_status "No processes found using port $PORT."
fi

print_status "Restarting PM2 app: $APP_NAME..."
pm2 start $APP_NAME

print_status "App status:"
pm2 status $APP_NAME

print_status "Done! The app should now be running cleanly on port $PORT." 