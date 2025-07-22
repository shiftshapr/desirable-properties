# Privy Authentication Setup Guide

## Step 1: Create Privy Account

1. Go to [https://console.privy.io/](https://console.privy.io/)
2. Sign up for a free account
3. Create a new app in the Privy console

## Step 2: Configure Your App

### Redirect URLs
Add these URLs to your Privy app settings:
- `https://app.themetalayer.org/`
- `https://app.themetalayer.org/profile`
- `https://app.themetalayer.org/submit`

### Login Methods
Enable these login methods:
- ✅ **Email** (recommended for testing)
- ✅ **Wallet** (MetaMask, WalletConnect, etc.)

## Step 3: Get Your API Keys

From your Privy app dashboard, copy:
- **App ID** (starts with `cl_`)
- **App Secret** (starts with `sk_`)

## Step 4: Set Environment Variables

Create a `.env.local` file in the `web-app` directory:

```bash
# Privy Authentication Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# Database Configuration (for future use)
# DATABASE_URL=postgresql://username:password@localhost:5432/metalayer
```

## Step 5: Deploy Environment Variables

For production deployment, add these to your server environment:

```bash
# Add to your server environment or PM2 ecosystem
export NEXT_PUBLIC_PRIVY_APP_ID="your_actual_app_id"
export PRIVY_APP_SECRET="your_actual_app_secret"
```

## Step 6: Test Authentication

1. Restart your application: `pm2 restart app-themetalayer`
2. Visit your site and click "Login" in the header
3. Try both email and wallet login methods

## Troubleshooting

### Common Issues:
- **"Invalid Privy app ID"**: Check that your App ID is correct
- **"Redirect URL not allowed"**: Add your domain to Privy redirect URLs
- **"Authentication failed"**: Verify your App Secret is correct

### Development vs Production:
- For local development: Use `.env.local`
- For production: Set environment variables on your server

## Features Available After Setup:

- ✅ **Email Login**: Users can sign in with email
- ✅ **Wallet Login**: Users can connect MetaMask, WalletConnect, etc.
- ✅ **User Profiles**: View user activity and stats
- ✅ **Commenting**: Authenticated users can comment and vote
- ✅ **Voting**: Upvote/downvote submissions and comments
- ✅ **Moderation**: Edit, delete, and report comments

## Next Steps:

1. Set up your Privy account
2. Add the environment variables
3. Test the authentication flow
4. Consider adding a database for persistent data storage 