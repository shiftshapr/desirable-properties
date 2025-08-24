// Generic Authentication Service
// This abstracts away the specific auth provider (Privy, NextAuth, etc.)

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  walletAddress?: string;
}

export interface AuthService {
  isAuthenticated: boolean;
  isReady: boolean;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

// Default unauthenticated state
export const defaultAuthService: AuthService = {
  isAuthenticated: false,
  isReady: true,
  user: null,
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
