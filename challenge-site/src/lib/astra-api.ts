import type { AstraChapterBundle, AstraReleaseManifest } from '@/lib/astra-types';

export async function fetchAstraReleaseManifest(): Promise<AstraReleaseManifest> {
  const res = await fetch('/api/astra/manifest', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load Astra release manifest');
  }
  return res.json() as Promise<AstraReleaseManifest>;
}

export async function fetchAstraChapter(dpKey: string): Promise<AstraChapterBundle> {
  const res = await fetch(`/api/astra/chapters/${encodeURIComponent(dpKey)}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Failed to load Astra chapter');
  }
  return res.json() as Promise<AstraChapterBundle>;
}

export type AstraReleaseDocResponse = {
  name: string;
  filename: string;
  contentType: 'markdown' | 'json';
  content: string | unknown;
};

export async function fetchAstraReleaseDoc(name: string): Promise<AstraReleaseDocResponse> {
  const res = await fetch(`/api/astra/docs/${encodeURIComponent(name)}`, { cache: 'no-store' });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Failed to load document');
  }
  return res.json() as Promise<AstraReleaseDocResponse>;
}
