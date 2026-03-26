# Environment Variables Recovery Guide

## Current Status
The `.env` file was lost. This document helps you recover it.

## Quick Recovery: Copy from Production

If the production environment is still working, copy from there:

```bash
# Copy production env file
sudo cp /var/www/app.themetalayer.org/public/.env.production /home/ubuntu/desirable-properties/web-app/.env.local

# Or for production builds, copy to .env.production
sudo cp /var/www/app.themetalayer.org/public/.env.production /home/ubuntu/desirable-properties/web-app/.env.production
```

## Required Environment Variables

Based on code analysis, here are ALL required variables:

### Core Application
```bash
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_NAME="Meta-Layer Desirable Properties"
NEXT_PUBLIC_APP_URL=https://app.themetalayer.org
NEXTAUTH_URL=https://app.themetalayer.org
```

### Database (Prisma)
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```
**Note:** Check your database provider (Supabase, Vercel Postgres, etc.) for connection string

### Authentication Secrets
```bash
NEXTAUTH_SECRET=your-secret-here
JWT_SECRET=your-secret-here
```
**Tip:** Generate with: `openssl rand -base64 32`

### Privy (Web3 Auth)
```bash
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-secret
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```
**Where to find:** https://dashboard.privy.io/

### Email Service (Resend)
```bash
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@themetalayer.org
```
**Where to find:** https://resend.com/api-keys

### DeepSeek AI
```bash
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
```
**Where to find:** https://platform.deepseek.com/

### Feature Flags
```bash
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_SUBMISSIONS=true
NEXT_PUBLIC_ENABLE_INSERT_SUGGESTIONS=false
```

### Comment System
```bash
NEXT_PUBLIC_COMMENT_EDIT_WINDOW_HOURS=1
NEXT_PUBLIC_COMMENT_DELETE_WINDOW_HOURS=1
COMMENT_EDIT_WINDOW_HOURS=1
COMMENT_DELETE_WINDOW_HOURS=1
```

### Optional OAuth Providers
```bash
GOOGLE_CLIENT_ID=your-google-client-id
TWITTER_CLIENT_ID=your-twitter-client-id
DISCORD_CLIENT_ID=your-discord-client-id
```

## Recovery Steps

### Step 1: Check Production Environment
```bash
# View production env (may need sudo)
sudo cat /var/www/app.themetalayer.org/public/.env.production
```

### Step 2: Check for Backups
```bash
# Check git history (if repo exists)
cd /home/ubuntu/desirable-properties/web-app
git log --all --full-history -- "*env*"

# Check cursor history
ls -la ~/.cursor-server/data/User/History/*/
```

### Step 3: Recreate from Services
1. **Privy:** Login to https://dashboard.privy.io/ → Get App ID and Secret
2. **Resend:** Login to https://resend.com/ → API Keys section
3. **DeepSeek:** Login to https://platform.deepseek.com/ → API Keys
4. **Database:** Check your hosting provider dashboard for connection string

### Step 4: Create New .env File
```bash
cd /home/ubuntu/desirable-properties/web-app
nano .env.local  # or .env.production for production builds
```

Paste all variables with your actual values.

### Step 5: Verify Build Works
```bash
# Test that Resend initialization doesn't fail
npm run build
```

## Critical Fix Applied

The build error was caused by Resend being initialized without checking for API key.

**Fixed in:** `lib/simple-auth.ts`
- Now checks for `RESEND_API_KEY` before initializing
- Prevents build-time errors when API key is missing

## Verification

After recreating .env file, verify:
```bash
cd /home/ubuntu/desirable-properties/web-app
npm run build
```

If build succeeds, environment is configured correctly.

## Security Notes

⚠️ **NEVER commit .env files to git**
- Add `.env*` to `.gitignore`
- Use `.env.example` or `.env.template` for documentation
- Store secrets in secure password manager or secret management service


















