// Magic Link Authentication Service
// This replaces the current auth system with our working magic link implementation

export interface MagicLinkUser {
  id: string;
  email: string;
  name?: string;
  affiliation?: string;
  age?: number;
}

export interface MagicLinkAuthService {
  isAuthenticated: boolean;
  isReady: boolean;
  user: MagicLinkUser | null;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  checkAuth: () => Promise<void>;
  onAuthStateChange: (callback: (isAuthenticated: boolean, user: MagicLinkUser | null) => void) => () => void;
}

class MagicLinkAuth implements MagicLinkAuthService {
  private _isAuthenticated = false;
  private _user: MagicLinkUser | null = null;
  private _isReady = false;
  private _listeners: Array<(isAuthenticated: boolean, user: MagicLinkUser | null) => void> = [];

  constructor() {
    // Initialize auth state
    this.clearAuthState();
    this._isReady = false;
    
    // Check auth status
    this.checkAuth();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get user(): MagicLinkUser | null {
    return this._user;
  }

  checkAuth = async (): Promise<void> => {
    try {
      console.log('🔍 [MagicLinkAuth] Checking auth status...');
      
      const response = await fetch('/api/magic-link/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [MagicLinkAuth] Auth response:', data);
        
        if (data.authenticated && data.user) {
          this._isAuthenticated = true;
          this._user = data.user;
          console.log('🔍 [MagicLinkAuth] User authenticated:', data.user.email);
        } else {
          this._isAuthenticated = false;
          this._user = null;
          console.log('🔍 [MagicLinkAuth] User not authenticated');
        }
      } else {
        this._isAuthenticated = false;
        this._user = null;
        console.log('🔍 [MagicLinkAuth] Auth check failed:', response.status);
      }
    } catch (error) {
      console.error('🔍 [MagicLinkAuth] Error checking auth:', error);
      this._isAuthenticated = false;
      this._user = null;
    } finally {
      this._isReady = true;
      console.log('🔍 [MagicLinkAuth] Auth check complete, ready:', this._isReady);
      // Notify listeners of auth state change
      this.notifyListeners();
    }
  }

  login = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/magic-link/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.error || 'Failed to send magic link' };
      }
    } catch (error) {
      console.error('Error sending magic link:', error);
      return { success: false, message: 'Network error' };
    }
  }

  logout = async (): Promise<void> => {
    try {
      console.log('🔍 [MagicLinkAuth] Starting logout...');
      
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('🔍 [MagicLinkAuth] Logout successful');
      } else {
        console.error('🔍 [MagicLinkAuth] Logout failed:', response.status);
      }
      
      // Always clear local state - direct assignment to avoid context issues
      this._isAuthenticated = false;
      this._user = null;
      
      console.log('🔍 [MagicLinkAuth] Local state cleared');
      // Notify listeners of auth state change
      this.notifyListeners();
    } catch (error) {
      console.error('🔍 [MagicLinkAuth] Error signing out:', error);
      // Still clear local state even if API call fails
      this._isAuthenticated = false;
      this._user = null;
      // Notify listeners even on error
      this.notifyListeners();
    }
  }

  private clearAuthState(): void {
    this._isAuthenticated = false;
    this._user = null;
  }

  private setAuthenticatedUser(user: MagicLinkUser): void {
    this._isAuthenticated = true;
    this._user = user;
  }

  getAccessToken = async (): Promise<string | null> => {
    if (this._isAuthenticated && this._user) {
      // Return a simple token based on user ID for API compatibility
      return `magic-link-${this._user.id}`;
    }
    return null;
  }

  onAuthStateChange = (callback: (isAuthenticated: boolean, user: MagicLinkUser | null) => void): (() => void) => {
    this._listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this._listeners.forEach(callback => {
      try {
        callback(this._isAuthenticated, this._user);
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }
}

// Create singleton instance
const magicLinkAuth = new MagicLinkAuth();

// Export the service
export const getMagicLinkAuth = (): MagicLinkAuthService => {
  return magicLinkAuth;
};

// Export for compatibility with existing auth system
export const useAuth = (): MagicLinkAuthService => {
  return magicLinkAuth;
};

// Helper functions for testing
export const enableTestAuth = () => {
  magicLinkAuth['setAuthenticatedUser']({
    id: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    affiliation: "Test Org",
    age: 30,
  });
  console.log("🔧 [Magic Link Auth] Test authentication enabled");
};

export const disableTestAuth = () => {
  magicLinkAuth['clearAuthState']();
  console.log("🔧 [Magic Link Auth] Test authentication disabled");
};

export const toggleTestAuth = () => {
  if (magicLinkAuth.isAuthenticated) {
    disableTestAuth();
  } else {
    enableTestAuth();
  }
};




