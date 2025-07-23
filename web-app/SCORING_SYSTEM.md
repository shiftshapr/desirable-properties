# Scoring System Documentation

## Overview

The Meta-Layer Desirable Properties application includes a comprehensive scoring system that rewards user participation and engagement. The system is designed to be flexible and easily configurable through a JSON configuration file.

## Features

### 1. **Score Display on Profile**
- Users can see their total score prominently displayed
- Score breakdown showing contribution, engagement, and bonus points
- Current rank with link to leaderboard
- Activity summary with detailed statistics

### 2. **Leaderboard**
- Complete leaderboard page showing all users ranked by score
- Beautiful UI with special styling for top 3 positions
- Score breakdown for each user
- Activity statistics for each participant

### 3. **Flexible Configuration**
- All scoring rules are defined in `data/scoring-config.json`
- Easy to modify point values and add new activities
- Configuration can be reloaded without restarting the application

## Scoring Categories

### Contribution Points
- **First Submission**: 33 points
- **Subsequent Submissions**: 10 points each
- **Thumbs Up Received**: 1 point each
- **Comments Received**: 1 point each
- **Replies Received**: 1 point each

### Engagement Points
- **Thumbs Up Given**: 1 point each (daily limit: 20)
- **Thumbs Down Given**: 1 point each (daily limit: 20)
- **Comments Posted**: 1 point each
- **Replies Posted**: 1 point each
- **Signup Bonus**: 10 points

### Bonus Points
- **First Week Activity**: 50 points (submission within 7 days of signup)
- **Consistent Participation**: 25 points (activity in last 30 days)
- **Helpful Contributor**: 100 points (50+ thumbs up received OR 20+ comments)

## Configuration File

The scoring system is configured through `data/scoring-config.json`:

```json
{
  "contribution_points": {
    "submissions": {
      "first_submission": 33,
      "subsequent_submissions": 10,
      "per_thumbsup_received": 1,
      "per_comment_received": 1
    },
    "comments": {
      "per_comment_posted": 1,
      "per_thumbsup_received": 1,
      "per_reply_received": 1
    }
  },
  "engagement_points": {
    "daily_limits": {
      "thumbsup_given": 20,
      "thumbsdown_given": 20
    },
    "actions": {
      "thumbsup_given": 1,
      "thumbsdown_given": 1,
      "comment_posted": 1,
      "reply_posted": 1,
      "signup": 10
    }
  },
  "bonus_points": {
    "first_week_activity": 50,
    "consistent_participation": 25,
    "helpful_contributor": 100
  }
}
```

## API Endpoints

### Get User Score
```
GET /api/scores?userId={userId}
```
Returns user's score breakdown and activity data.

### Get Leaderboard
```
GET /api/leaderboard
```
Returns complete leaderboard with all users ranked by score.

### Reload Configuration
```
POST /api/scores
```
Reloads the scoring configuration without restarting the application.

## Navigation

### Profile Page
- **URL**: `/profile`
- **Features**: 
  - Score display with breakdown
  - Current rank
  - Link to leaderboard
  - Activity statistics

### Leaderboard Page
- **URL**: `/leaderboard`
- **Features**:
  - Complete user rankings
  - Score breakdowns
  - Activity statistics
  - Special styling for top 3

### Main Page Integration
- Leaderboard link in header (trophy icon)
- Profile link for authenticated users

## Adding New Activities

To add new scoring activities:

1. **Update the configuration file** (`data/scoring-config.json`):
   ```json
   {
     "contribution_points": {
       "new_activity": {
         "per_action": 5
       }
     }
   }
   ```

2. **Update the scoring service** (`app/services/scoringService.ts`):
   - Add the new activity to the `UserActivity` interface
   - Implement the scoring logic in the calculation methods

3. **Update the API endpoints** to include the new activity data

4. **Reload the configuration** by making a POST request to `/api/scores`

## Example Score Calculation

For a user with:
- 2 submissions (33 + 10 = 43 points)
- 15 comments (15 points)
- 45 thumbs up given (capped at 20 daily = 20 points)
- 67 thumbs up received (67 points)
- 23 comments received (23 points)
- Signup bonus (10 points)
- First week activity bonus (50 points)

**Total Score**: 43 + 15 + 20 + 67 + 23 + 10 + 50 = **228 points**

## Future Enhancements

- **Real-time updates**: WebSocket integration for live score updates
- **Achievement badges**: Visual badges for reaching milestones
- **Weekly/monthly competitions**: Time-based leaderboards
- **Team scoring**: Group-based scoring for collaborative projects
- **Custom scoring rules**: User-defined scoring for specific events

## Technical Implementation

- **Scoring Service**: TypeScript class handling all score calculations
- **API Routes**: Next.js API routes for score and leaderboard data
- **React Components**: Reusable components for score display
- **Configuration Management**: JSON-based configuration with hot reloading 