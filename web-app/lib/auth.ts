// Generic Authentication Service
// This abstracts away the specific auth provider (Privy, NextAuth, etc.)
// Now using Magic Link Authentication

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  walletAddress?: string;
  affiliation?: string;
  age?: number;
}

export interface AuthService {
  isAuthenticated: boolean;
  isReady: boolean;
  user: AuthUser | null;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

// Test user data - using the actual database user ID
const testUser: AuthUser = {
  id: "cme65z5gr000hh2vv2jcz9r36", // Daveed's actual user ID from database
  email: "daveed@bridgit.io",
  name: "Daveed Benjamin",
  affiliation: "ISOC",
  age: 30,
};

// Import magic link auth service
import { getMagicLinkAuth, MagicLinkAuthService } from './magic-link-auth';

// Test mode toggle - set to true to enable authenticated state for testing
const TEST_MODE_AUTHENTICATED = false; // Disabled to use real magic link auth

// Default unauthenticated state (fallback)
export const defaultAuthService: AuthService = {
  isAuthenticated: TEST_MODE_AUTHENTICATED,
  isReady: true,
  user: TEST_MODE_AUTHENTICATED ? testUser : null,
  login: async (email: string) => {
    const magicLinkAuth = getMagicLinkAuth();
    return await magicLinkAuth.login(email);
  },
  logout: async () => {
    const magicLinkAuth = getMagicLinkAuth();
    await magicLinkAuth.logout();
  },
  getAccessToken: async () => {
    if (TEST_MODE_AUTHENTICATED) {
      return 'test-user-123'; // Keep this as 'test-user-123' for API mapping
    }
    const magicLinkAuth = getMagicLinkAuth();
    return await magicLinkAuth.getAccessToken();
  },
};

// Global auth service instance - now using magic link auth
let authService: AuthService = getMagicLinkAuth();

// Setter for the auth service
export const setAuthService = (service: AuthService) => {
  authService = service;
};

// Getter for the auth service
export const getAuthService = (): AuthService => {
  return authService;
};

// Hook for components to use
export const useAuth = (): AuthService => {
  // Always return the magic link auth service to ensure consistency
  return getMagicLinkAuth();
};

// Test helper functions
export const enableTestAuth = () => {
  authService = {
    ...authService,
    isAuthenticated: true,
    user: testUser,
  };
  console.log("🔧 [Auth] Test authentication enabled for:", testUser.name);
};

export const disableTestAuth = () => {
  authService = {
    ...authService,
    isAuthenticated: false,
    user: null,
  };
  console.log("🔧 [Auth] Test authentication disabled");
};

export const toggleTestAuth = () => {
  if (authService.isAuthenticated) {
    disableTestAuth();
  } else {
    enableTestAuth();
  }
};

