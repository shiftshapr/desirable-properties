import Image from 'next/image';
import Link from 'next/link';
import type { GovHubWorkgroup } from '@/lib/govhub';
import { extractDpId } from '@/lib/govhub';
import { dpCardImageSrc, dpImageAlt } from '@/lib/dp-images';

type LocalDp = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  localDps: LocalDp[];
  workgroups: GovHubWorkgroup[];
};

function statusLabel(wg: GovHubWorkgroup | undefined): string {
  if (!wg) return 'Draft';
  return wg.state || wg.status || 'Draft';
}

export default function DPCardGrid({ localDps, workgroups }: Props) {
  const workgroupByDp = new Map<string, GovHubWorkgroup>();
  for (const wg of workgroups) {
    const dpId = extractDpId(wg.name);
    if (dpId) workgroupByDp.set(dpId, wg);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {localDps.map((dp) => {
        const wg = workgroupByDp.get(dp.id);
        const status = statusLabel(wg);
        const dpHref = `/dp/${dp.id.toLowerCase()}`;
        const cardSrc = dpCardImageSrc(dp.id);

        return (
          <article
            key={dp.id}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
          >
            {cardSrc ? (
              <Link href={dpHref} className="relative block aspect-square bg-slate-950">
                <Image
                  src={cardSrc}
                  alt={dpImageAlt(dp.id, dp.name)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </Link>
            ) : null}
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                  {dp.id}
                </span>
                <span className="text-xs uppercase tracking-wide text-slate-500">{status}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                <Link href={dpHref} className="hover:text-cyan-300">
                  {dp.name}
                </Link>
              </h3>
              <p className="mb-4 flex-grow text-sm leading-relaxed text-slate-300 line-clamp-3">
                {dp.description}
              </p>
              <Link
                href={dpHref}
                className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
              >
                View DP page →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
