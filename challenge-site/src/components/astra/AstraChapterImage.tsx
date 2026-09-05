'use client';

import { resolveAstraAssetUrl } from '@/lib/astra-display';

type Props = {
  src?: string;
  alt?: string;
};

/** Chapter illustration at fixed 600×600 for Astra and Edit readers. */
export default function AstraChapterImage({ src, alt }: Props) {
  const resolved = resolveAstraAssetUrl(src);
  if (!resolved) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt || ''}
      width={600}
      height={600}
      className="my-4 h-[600px] w-[600px] max-w-full rounded-lg border border-slate-800 object-contain bg-slate-950/40"
      loading="lazy"
    />
  );
}
