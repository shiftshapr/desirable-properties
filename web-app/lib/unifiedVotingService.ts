/**
 * UNIFIED VOTING SERVICE
 * Handles ALL voting operations and display across the entire application
 * With extensive logging for debugging
 */

import { getAuthService } from './auth';

export interface ElementData {
  id: string;
  type: 'submission' | 'comment' | 'reaction';
  submissionId?: string;
  elementId?: string;
  elementType?: string;
  content?: string;
  voteType?: 'UP' | 'DOWN';
  authorId?: string;
}

export interface VotingDisplayData {
  elementId: string;
  elementType: string;
  submissionId: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'UP' | 'DOWN';
  isLoading: boolean;
}

export interface VotingConfig {
  elementId: string;
  elementType: 'submission' | 'alignment' | 'clarification' | 'extension' | 'comment';
  submissionId: string;
  showComments?: boolean;
  commentCount?: number;
  onVoteChange?: (voteData: VotingDisplayData) => void;
  onCommentToggle?: () => void;
}

class UnifiedVotingService {
  private cache: Map<string, VotingDisplayData> = new Map();
  private isInitialized = false;

  constructor() {
    console.log('🟢 [UnifiedVotingService] Service initialized');
    this.isInitialized = true;
  }

  /**
   * Main voting function - handles ALL voting operations
   */
  async vote(config: VotingConfig, voteType: 'UP' | 'DOWN'): Promise<VotingDisplayData> {
    const logPrefix = `🚀 [VOTING SERVICE]`;
    console.log(`${logPrefix} Vote initiated: ${config.elementType} ${config.elementId} - ${voteType}`);

    try {
      // Get auth token
      const authService = getAuthService();
      const authToken = await authService.getAccessToken();
      
      console.log(`${logPrefix} Auth token obtained:`, !!authToken);

      if (!authToken) {
        throw new Error('Authentication required for voting');
      }

      // Call votes API
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          elementId: config.elementId,
          elementType: config.elementType,
          submissionId: config.submissionId,
          voteType: voteType
        })
      });

      if (!response.ok) {
        throw new Error(`Vote API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`${logPrefix} Vote successful:`, result);

      // Transform result to our format
      const votingData: VotingDisplayData = {
        elementId: config.elementId,
        elementType: config.elementType,
        submissionId: config.submissionId,
        upvotes: result.upvotes || 0,
        downvotes: result.downvotes || 0,
        userVote: result.userVote,
        isLoading: false
      };

      // Update cache
      const cacheKey = this.getCacheKey(config);
      this.cache.set(cacheKey, votingData);

      // Call callback if provided
      if (config.onVoteChange) {
        config.onVoteChange(votingData);
      }

      return votingData;

    } catch (error) {
      console.error(`${logPrefix} ❌ VOTE FAILED:`, error);
      
      // Return error state
      return {
        elementId: config.elementId,
        elementType: config.elementType,
        submissionId: config.submissionId,
        upvotes: 0,
        downvotes: 0,
        isLoading: false
      };
    }
  }

  /**
   * Get voting display data for any element
   */
  async getVotingData(config: VotingConfig): Promise<VotingDisplayData> {
    const logPrefix = `🟡 [VOTING SERVICE.getVotingData]`;

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(config);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get auth token for user vote info
      const authService = getAuthService();
      const authToken = await authService.getAccessToken();

      // Call votes API to get current data
      const params = new URLSearchParams({
        elementId: config.elementId,
        elementType: config.elementType,
        submissionId: config.submissionId
      });

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/votes?${params}`, {
        method: 'GET',
        headers
      });

      let result = { upvotes: 0, downvotes: 0, userVote: undefined };
      
      if (response.ok) {
        result = await response.json();
      }

      // Transform to our format
      const votingData: VotingDisplayData = {
        elementId: config.elementId,
        elementType: config.elementType,
        submissionId: config.submissionId,
        upvotes: result.upvotes || 0,
        downvotes: result.downvotes || 0,
        userVote: result.userVote,
        isLoading: false
      };

      // Cache the result
      this.cache.set(cacheKey, votingData);

      return votingData;

    } catch (error) {
      console.error(`${logPrefix} ❌ Failed:`, error);

      // Return default data on error
      return {
        elementId: config.elementId,
        elementType: config.elementType,
        submissionId: config.submissionId,
        upvotes: 0,
        downvotes: 0,
        isLoading: false
      };
    }
  }

  /**
   * Batch get voting data for multiple elements
   */
  async batchGetVotingData(configs: VotingConfig[]): Promise<Map<string, VotingDisplayData>> {
    const results = new Map<string, VotingDisplayData>();

    // Process all configs in parallel
    const promises = configs.map(async (config) => {
      const key = this.getCacheKey(config);
      try {
        const data = await this.getVotingData(config);
        results.set(key, data);
      } catch (error) {
        // Set default data for failed items
        results.set(key, {
          elementId: config.elementId,
          elementType: config.elementType,
          submissionId: config.submissionId,
          upvotes: 0,
          downvotes: 0,
          isLoading: false
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear cache for an element
   */
  clearCache(config: VotingConfig): void {
    const cacheKey = this.getCacheKey(config);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      keys: Array.from(this.cache.keys()),
      isInitialized: this.isInitialized
    };
  }

  private getCacheKey(config: VotingConfig): string {
    return `${config.submissionId}-${config.elementType}-${config.elementId}`;
  }
}

// Export singleton instance
export const unifiedVotingService = new UnifiedVotingService();

// Export React hook for easy usage
export function useUnifiedVoting() {
  return {
    vote: unifiedVotingService.vote.bind(unifiedVotingService),
    getVotingData: unifiedVotingService.getVotingData.bind(unifiedVotingService),
    batchGetVotingData: unifiedVotingService.batchGetVotingData.bind(unifiedVotingService),
    clearCache: unifiedVotingService.clearCache.bind(unifiedVotingService),
    clearAllCache: unifiedVotingService.clearAllCache.bind(unifiedVotingService),
    getCacheStats: unifiedVotingService.getCacheStats.bind(unifiedVotingService)
  };
}
