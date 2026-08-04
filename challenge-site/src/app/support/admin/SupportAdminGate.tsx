'use client';

import SupportAdminClient from './SupportAdminClient';
import AdminAuthShell from '@/components/AdminAuthShell';
import { useAdminAuthGate } from '@/lib/use-admin-auth-gate';

export default function SupportAdminGate() {
  const { authState, error, retry } = useAdminAuthGate();

  return (
    <AdminAuthShell authState={authState} error={error} onRetry={retry}>
      <SupportAdminClient />
    </AdminAuthShell>
  );
}
