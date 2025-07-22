# Authentication Setup Guide

This app uses Privy for authentication. Follow these steps to set up authentication:

## 1. Create a Privy Account

1. Go to [privy.io](https://privy.io)
2. Sign up for an account
3. Create a new app

## 2. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# Database (for future use)
DATABASE_URL=your_database_url_here
```

## 3. Get Your Privy Credentials

1. In your Privy dashboard, go to your app settings
2. Copy the App ID and App Secret
3. Replace the placeholder values in `.env.local`

## 4. Configure App Settings

In your Privy dashboard:

1. **Redirect URLs**: Add your domain (e.g., `https://app.themetalayer.org`)
2. **Login Methods**: Enable Email and Wallet login
3. **Appearance**: Customize the theme to match your app

## 5. Features Implemented

### Authentication
- ✅ Sign in with email or wallet
- ✅ User profile display
- ✅ Sign out functionality
- ✅ Protected routes

### Voting System
- ✅ Vote on submissions
- ✅ Vote on alignments (DPs addressed)
- ✅ Vote on clarifications
- ✅ Vote on extensions
- ✅ Upvote/downvote functionality
- ✅ Optimistic UI updates

### User Profile
- ✅ Activity tracking
- ✅ Vote history
- ✅ Contribution statistics
- ✅ Recent activity feed

## 6. API Endpoints

### `/api/votes`
- `POST`: Submit a vote
- `GET`: Get vote counts for an element

### Future Endpoints
- `/api/user/activity`: Get user activity
- `/api/user/profile`: Get user profile
- `/api/submissions`: Get submissions with vote data

## 7. Database Schema (Future)

```sql
-- Users table (handled by Privy)
-- Votes table
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  element_id VARCHAR NOT NULL,
  element_type VARCHAR NOT NULL,
  submission_id VARCHAR NOT NULL,
  vote VARCHAR NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, element_id)
);

-- Vote counts table (for performance)
CREATE TABLE vote_counts (
  element_id VARCHAR PRIMARY KEY,
  element_type VARCHAR NOT NULL,
  submission_id VARCHAR NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 8. Next Steps

1. Set up a database (PostgreSQL recommended)
2. Implement actual vote storage
3. Add user activity tracking
4. Add submission creation functionality
5. Add moderation features
6. Add notifications

## 9. Testing

1. Start the development server: `npm run dev`
2. Test sign in/out functionality
3. Test voting on different elements
4. Test profile page
5. Test authentication protection

## 10. Deployment

1. Set environment variables on your server
2. Update Privy redirect URLs for production
3. Deploy the application
4. Test all functionality in production 