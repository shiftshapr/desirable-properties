'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // If no Privy app ID is configured, render without authentication
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#0891b2', // cyan-600
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
} 