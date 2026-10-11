#!/bin/bash

# Script to create .env.local file with minimal configuration
# Run: bash create-env.sh

ENV_FILE=".env.local"

echo "Creating .env.local file..."

cat > "$ENV_FILE" << 'EOF'
# Desirable Properties Web App - Environment Variables
# Minimal configuration - only what's actually used

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_NAME="Meta-Layer Desirable Properties"
NEXT_PUBLIC_APP_URL=https://app.themetalayer.org
NEXTAUTH_URL=https://app.themetalayer.org

# ============================================
# DATABASE (Prisma/PostgreSQL)
# ============================================
# Default local PostgreSQL connection - adjust as needed
DATABASE_URL=postgresql://postgres:password@localhost:5432/desirable_properties

# ============================================
# EMAIL SERVICE (Resend)
# ============================================
# RESEND_API_KEY is appended below from your environment (never commit a key)
EMAIL_FROM=noreply@themetalayer.org

# ============================================
# AI/CHAT (DeepSeek)
# ============================================
# TODO: Add your DeepSeek API key when you have it
# DEEPSEEK_API_KEY=sk-your-deepseek-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# ============================================
# FEATURE FLAGS
# ============================================
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SUBMISSIONS=true

# ============================================
# COMMENT SYSTEM
# ============================================
NEXT_PUBLIC_COMMENT_EDIT_WINDOW_HOURS=1
NEXT_PUBLIC_COMMENT_DELETE_WINDOW_HOURS=1
COMMENT_EDIT_WINDOW_HOURS=1
COMMENT_DELETE_WINDOW_HOURS=1

# ============================================
# AUTHENTICATION
# ============================================
# Using Magic Link Auth (no NextAuth or Privy needed)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# ============================================
# NOTES:
# ============================================
# - NextAuth and Privy are NOT used (references in code are legacy)
# - Authentication uses Magic Link via Resend emails
# - Database uses Prisma with PostgreSQL (DATABASE_URL needed)
# - Update DATABASE_URL with your actual database credentials
EOF

# Read the Resend key from the environment; leave it empty if unset.
printf 'RESEND_API_KEY=%s\n' "$RESEND_API_KEY" >> "$ENV_FILE"
[ -n "$RESEND_API_KEY" ] || echo "⚠️  RESEND_API_KEY is not set in your environment; it was left empty in $ENV_FILE"

echo "✅ Created $ENV_FILE"
echo ""
echo "⚠️  IMPORTANT: Update DATABASE_URL with your actual database connection string"
echo ""
echo "To find your DATABASE_URL, try:"
echo "  1. Check production env: sudo cat /var/www/app.themetalayer.org/public/.env.production | grep DATABASE"
echo "  2. Or if using local PostgreSQL, it's typically:"
echo "     postgresql://postgres:your-password@localhost:5432/database_name"
echo ""


















