#!/bin/bash

# Script to update JWT_SECRET in .env.local
# Run: bash update-env-secrets.sh

ENV_FILE=".env.local"
JWT_SECRET=$(openssl rand -base64 32)

echo "=== Updating .env.local ==="
echo ""

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

# Generate new JWT secret
echo "Generated new JWT_SECRET: $JWT_SECRET"
echo ""

# Update JWT_SECRET in .env.local
if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    # Replace existing JWT_SECRET
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    echo "✅ Updated JWT_SECRET in $ENV_FILE"
else
    # Add JWT_SECRET if not present
    echo "JWT_SECRET=$JWT_SECRET" >> "$ENV_FILE"
    echo "✅ Added JWT_SECRET to $ENV_FILE"
fi

# Verify DATABASE_URL has correct password
if grep -q "^DATABASE_URL=postgresql://postgres:postgres@" "$ENV_FILE"; then
    echo "✅ DATABASE_URL already configured with postgres password"
else
    echo "⚠️  DATABASE_URL may need updating - current value:"
    grep "^DATABASE_URL=" "$ENV_FILE" || echo "DATABASE_URL not found"
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "Current DATABASE_URL:"
grep "^DATABASE_URL=" "$ENV_FILE" || echo "Not found"
echo ""
echo "New JWT_SECRET:"
grep "^JWT_SECRET=" "$ENV_FILE" || echo "Not found"

