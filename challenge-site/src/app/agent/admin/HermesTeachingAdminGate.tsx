'use client';

import HermesTeachingAdminClient from './HermesTeachingAdminClient';
import AdminAuthShell from '@/components/AdminAuthShell';
import { useAdminAuthGate } from '@/lib/use-admin-auth-gate';

export default function HermesTeachingAdminGate() {
  const { authState, error, retry } = useAdminAuthGate();

  return (
    <AdminAuthShell authState={authState} error={error} onRetry={retry}>
      <HermesTeachingAdminClient />
    </AdminAuthShell>
  );
}
