import type { Metadata } from 'next';
import HermesChat from '@/components/HermesChat';
import { readSession, sessionToAuthUser } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Hermes – Desirable Properties',
  description:
    'Hermes helps the community refine the Desirable Properties — coherence, impact, and governance continuity.',
  robots: { index: false, follow: false },
};

export default async function AgentPage() {
  const session = await readSession();
  const initialUser = sessionToAuthUser(session);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-slate-950">
      <HermesChat
        surface="desirableproperties.org/agent"
        initialSignedIn={Boolean(session)}
        initialUser={initialUser}
      />
    </div>
  );
}
