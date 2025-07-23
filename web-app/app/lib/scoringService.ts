import fs from 'fs';
import path from 'path';

interface ScoringConfig {
  contribution_points: {
    submissions: {
      first_submission: number;
      subsequent_submissions: number;
      per_thumbsup_received: number;
      per_comment_received: number;
    };
    comments: {
      per_comment_posted: number;
      per_thumbsup_received: number;
      per_reply_received: number;
    };
    alignments: {
      per_thumbsup_received: number;
      per_comment_received: number;
    };
    clarifications: {
      per_thumbsup_received: number;
      per_comment_received: number;
    };
    extensions: {
      per_thumbsup_received: number;
      per_comment_received: number;
    };
  };
  engagement_points: {
    daily_limits: {
      thumbsup_given: number;
      thumbsdown_given: number;
    };
    actions: {
      thumbsup_given: number;
      thumbsdown_given: number;
      comment_posted: number;
      reply_posted: number;
      signup: number;
    };
  };
  bonus_points: {
    first_week_activity: number;
    consistent_participation: number;
    helpful_contributor: number;
  };
}

interface UserActivity {
  userId: string;
  submissions: number;
  comments: number;
  replies: number;
  thumbsupGiven: number;
  thumbsdownGiven: number;
  thumbsupReceived: number;
  commentsReceived: number;
  repliesReceived: number;
  signupDate: string;
  firstSubmissionDate?: string;
  lastActivityDate: string;
}

class ScoringService {
  private config: ScoringConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ScoringConfig {
    const defaultConfig: ScoringConfig = {
      contribution_points: {
        submissions: {
          first_submission: 33,
          subsequent_submissions: 10,
          per_thumbsup_received: 1,
          per_comment_received: 1
        },
        comments: {
          per_comment_posted: 1,
          per_thumbsup_received: 1,
          per_reply_received: 1
        },
        alignments: {
          per_thumbsup_received: 1,
          per_comment_received: 1
        },
        clarifications: {
          per_thumbsup_received: 1,
          per_comment_received: 1
        },
        extensions: {
          per_thumbsup_received: 1,
          per_comment_received: 1
        }
      },
      engagement_points: {
        daily_limits: {
          thumbsup_given: 20,
          thumbsdown_given: 20
        },
        actions: {
          thumbsup_given: 1,
          thumbsdown_given: 1,
          comment_posted: 1,
          reply_posted: 1,
          signup: 10
        }
      },
      bonus_points: {
        first_week_activity: 50,
        consistent_participation: 25,
        helpful_contributor: 100
      }
    };

    try {
      const possiblePaths = [
        path.join(process.cwd(), 'data', 'scoring-config.json'),
        path.join('/home/ubuntu/desirable-properties/web-app/data', 'scoring-config.json'),
        path.join(__dirname, '..', '..', 'data', 'scoring-config.json')
      ];
      
      for (const configPath of possiblePaths) {
        try {
          if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            console.log('Successfully loaded scoring config from:', configPath);
            return JSON.parse(configData);
          }
        } catch {
          console.log('Failed to load config from:', configPath);
        }
      }
      
      console.log('Using default scoring config - could not find scoring-config.json');
      return defaultConfig;
    } catch {
      console.error('Error loading scoring config, using default');
      return defaultConfig;
    }
  }

  public calculateContributionPoints(activity: UserActivity): number {
    let points = 0;

    // Submission points
    if (activity.submissions > 0) {
      points += this.config.contribution_points.submissions.first_submission;
      if (activity.submissions > 1) {
        points += (activity.submissions - 1) * this.config.contribution_points.submissions.subsequent_submissions;
      }
    }

    // Points for received interactions
    points += activity.thumbsupReceived * this.config.contribution_points.submissions.per_thumbsup_received;
    points += activity.commentsReceived * this.config.contribution_points.submissions.per_comment_received;
    points += activity.repliesReceived * this.config.contribution_points.comments.per_reply_received;

    return points;
  }

  public calculateEngagementPoints(activity: UserActivity): number {
    let points = 0;

    // Daily engagement limits
    const dailyThumbsup = Math.min(activity.thumbsupGiven, this.config.engagement_points.daily_limits.thumbsup_given);
    const dailyThumbsdown = Math.min(activity.thumbsdownGiven, this.config.engagement_points.daily_limits.thumbsdown_given);

    points += dailyThumbsup * this.config.engagement_points.actions.thumbsup_given;
    points += dailyThumbsdown * this.config.engagement_points.actions.thumbsdown_given;
    points += activity.comments * this.config.engagement_points.actions.comment_posted;
    points += activity.replies * this.config.engagement_points.actions.reply_posted;

    // Signup bonus
    if (activity.signupDate) {
      points += this.config.engagement_points.actions.signup;
    }

    return points;
  }

  public calculateBonusPoints(activity: UserActivity): number {
    let points = 0;

    // First week activity bonus
    if (activity.signupDate && activity.firstSubmissionDate) {
      const signupDate = new Date(activity.signupDate);
      const firstSubmissionDate = new Date(activity.firstSubmissionDate);
      const daysDiff = (firstSubmissionDate.getTime() - signupDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff <= 7) {
        points += this.config.bonus_points.first_week_activity;
      }
    }

    // Consistent participation bonus (activity in last 30 days)
    if (activity.lastActivityDate) {
      const lastActivity = new Date(activity.lastActivityDate);
      const now = new Date();
      const daysSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 3600 * 24);
      
      if (daysSinceLastActivity <= 30) {
        points += this.config.bonus_points.consistent_participation;
      }
    }

    // Helpful contributor bonus (high engagement)
    if (activity.thumbsupReceived >= 50 || activity.comments >= 20) {
      points += this.config.bonus_points.helpful_contributor;
    }

    return points;
  }

  public calculateTotalScore(activity: UserActivity): number {
    const contributionPoints = this.calculateContributionPoints(activity);
    const engagementPoints = this.calculateEngagementPoints(activity);
    const bonusPoints = this.calculateBonusPoints(activity);

    return contributionPoints + engagementPoints + bonusPoints;
  }

  public getScoreBreakdown(activity: UserActivity) {
    return {
      contribution: this.calculateContributionPoints(activity),
      engagement: this.calculateEngagementPoints(activity),
      bonus: this.calculateBonusPoints(activity),
      total: this.calculateTotalScore(activity)
    };
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
  }
}

export default ScoringService; 