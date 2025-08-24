// Generic Authentication Service
// This abstracts away the specific auth provider (Privy, NextAuth, etc.)

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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

// Test user data
const testUser: AuthUser = {
  id: "test-user-123",
  email: "daveed@bridgit.io",
  name: "Daveed Benjamin",
  affiliation: "ISOC",
  age: 30,
};

// Test mode toggle - set to true to enable authenticated state for testing
const TEST_MODE_AUTHENTICATED = true; // Change this to true to test authenticated state


// Default unauthenticated state
export const defaultAuthService: AuthService = {
  isAuthenticated: TEST_MODE_AUTHENTICATED,
  isReady: true,
  user: TEST_MODE_AUTHENTICATED ? testUser : null,
  login: async () => {
    console.log('Sign in - auth disabled');
  },
  logout: async () => {
    console.log('Sign out - auth disabled');
  },
  getAccessToken: async () => null,
};

// Global auth service instance
let authService: AuthService = defaultAuthService;

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
  return authService;
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
