#!/bin/bash

# Script to recover .env file from production
# Run with: bash recover-env.sh

echo "=== Environment Variable Recovery Script ==="
echo ""
echo "Attempting to copy .env.production from production directory..."

# Check if production env exists
if [ -f "/var/www/app.themetalayer.org/public/.env.production" ]; then
    echo "✅ Found production .env.production file"
    echo ""
    echo "Choose recovery method:"
    echo "1. Copy to .env.local (development)"
    echo "2. Copy to .env.production (production builds)"
    echo "3. Just display the file contents"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            sudo cp /var/www/app.themetalayer.org/public/.env.production .env.local
            sudo chown ubuntu:ubuntu .env.local
            echo "✅ Copied to .env.local"
            ;;
        2)
            sudo cp /var/www/app.themetalayer.org/public/.env.production .env.production
            sudo chown ubuntu:ubuntu .env.production
            echo "✅ Copied to .env.production"
            ;;
        3)
            echo ""
            echo "=== Production .env.production contents ==="
            sudo cat /var/www/app.themetalayer.org/public/.env.production
            echo ""
            echo "=== End of file ==="
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
else
    echo "❌ Production .env.production not found"
    echo ""
    echo "You'll need to recreate it manually using ENV_RECOVERY_GUIDE.md"
    exit 1
fi

echo ""
echo "✅ Recovery complete! You can now try: npm run build"


















