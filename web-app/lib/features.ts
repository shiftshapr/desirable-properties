// Feature flags for controlling functionality
export const FEATURES = {
  CHAT_ASSISTANT: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',
  INSERT_SUGGESTIONS: process.env.NEXT_PUBLIC_ENABLE_INSERT_SUGGESTIONS === 'true',
} as const;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}

// Get all enabled features
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
} 