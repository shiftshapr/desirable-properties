import { useState, useEffect } from 'react';
import { getMagicLinkAuth, MagicLinkUser } from './magic-link-auth';

export function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<MagicLinkUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const auth = getMagicLinkAuth();
    
    // Set initial state
    setIsAuthenticated(auth.isAuthenticated);
    setUser(auth.user);
    setIsReady(auth.isReady);

    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChange((authenticated, userData) => {
      console.log('🔍 [useAuthState] Auth state changed:', { authenticated, user: userData?.email });
      setIsAuthenticated(authenticated);
      setUser(userData);
      setIsReady(true);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return { isAuthenticated, user, isReady };
}
