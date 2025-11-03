#!/bin/bash

# Script to help find DATABASE_URL

echo "=== Finding DATABASE_URL ==="
echo ""

echo "Method 1: Check production environment file"
echo "Run: sudo cat /var/www/app.themetalayer.org/public/.env.production | grep DATABASE"
echo ""

echo "Method 2: Check if using local PostgreSQL"
echo "Local PostgreSQL is running. Common formats:"
echo "  postgresql://postgres:password@localhost:5432/desirable_properties"
echo "  postgresql://ubuntu:password@localhost:5432/desirable_properties"
echo ""

echo "Method 3: Check database name"
echo "Checking common database names..."

# Try to list databases
sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -v template | grep -v "^$" | while read db; do
    if [[ "$db" =~ (desirable|properties|nextauth|prisma|postgres) ]]; then
        echo "  Found: $db"
    fi
done

echo ""
echo "Method 4: Check if using Supabase or other hosted service"
echo "If using Supabase, DATABASE_URL format is:"
echo "  postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
echo ""

echo "Once you find it, update .env.local with:"
echo "  DATABASE_URL=your-connection-string-here"

