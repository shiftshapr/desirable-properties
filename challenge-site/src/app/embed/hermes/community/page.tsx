import HermesCommunityEmbed from '@/components/HermesCommunityEmbed';

export const metadata = {
  title: 'Community Chat',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ threadId?: string }>;
};

export default async function HermesCommunityEmbedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const threadId = String(params.threadId || '').trim();
  if (!threadId) {
    return (
      <main className="flex min-h-[240px] items-center justify-center bg-slate-950 p-4 text-sm text-slate-400">
        Missing threadId
      </main>
    );
  }

  return (
    <main className="h-full min-h-[360px] bg-slate-950">
      <HermesCommunityEmbed threadId={threadId} />
    </main>
  );
}
