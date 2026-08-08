import Image from 'next/image';
import Link from 'next/link';
import {
  bookDiscussHref,
  bookIntroDiscussHref,
  DP_DISCOVERY_ASK_ITEMS,
  GOVHUB_DP_PATCHES_URL,
  govhubDraftReadHref,
  isDpDiscoveryWorkgroup,
} from '@/lib/govhub';
import {
  DP_WELCOME_SUBJECT_COORDINATOR,
  DP_WELCOME_SUBJECT_MEMBER,
  MESSAGE_A_SECTIONS,
  MESSAGE_B_COORDINATOR,
  type DpWelcomeVariant,
} from '@/lib/dp-welcome-content';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import { isWorkgroupCollabEnabledFromEnv, workgroupPrimaryHref } from '@/lib/workgroup-links';

type Props = {
  variant: DpWelcomeVariant;
  workgroupName?: string | null;
  workgroupSlug?: string | null;
  dpId?: string | null;
  documentHref?: string | null;
};

const HEADING = 'mt-10 text-xl font-semibold text-white';
const BODY = 'mt-4 text-slate-300';
const LIST = 'mt-4 list-disc space-y-2 pl-6 marker:text-cyan-400';
const LIST_ITEM = 'pl-1 text-slate-300';

export default function DpWelcomeView({
  variant,
  workgroupName,
  workgroupSlug,
  dpId,
  documentHref,
}: Props) {
  const subject = variant === 'coordinator' ? DP_WELCOME_SUBJECT_COORDINATOR : DP_WELCOME_SUBJECT_MEMBER;
  const collabEnabled = isWorkgroupCollabEnabledFromEnv();
  const collabHref = workgroupSlug && collabEnabled ? workgroupPrimaryHref(workgroupSlug) : null;
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const bookHref = isDiscovery
    ? bookIntroDiscussHref()
    : bookDiscussHref(dpId ? { dpId } : undefined);
  const patchHref = isDiscovery ? null : govhubDraftReadHref(documentHref) ?? GOVHUB_DP_PATCHES_URL;
  const a = MESSAGE_A_SECTIONS;
  const askItems = isDiscovery ? [...DP_DISCOVERY_ASK_ITEMS] : a.askItems;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-400">Desirable Properties Challenge</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{subject}</h1>
        {workgroupName ? (
          <p className="mt-3 text-lg text-slate-300">
            Workgroup: <span className="font-semibold text-white">{workgroupName}</span>
          </p>
        ) : null}
      </header>

      <section>
        <p className="text-slate-300">{a.arcIntro}</p>
        <Image
          src={a.arcImage.src}
          alt={a.arcImage.alt}
          width={1024}
          height={479}
          priority
          sizes="(min-width: 768px) 48rem, 100vw"
          className="mt-5 h-auto w-full rounded-xl border border-slate-800"
        />

        <h2 className={HEADING}>{a.missionTitle}</h2>
        <p className={BODY}>{a.missionBody}</p>
        <p className={BODY}>{a.missionDetail}</p>

        <h2 className={HEADING}>{a.askTitle}</h2>
        <ul className={LIST}>
          {askItems.map((item) => (
            <li key={item} className={LIST_ITEM}>
              {item}
            </li>
          ))}
        </ul>

        <h2 className={HEADING}>{a.timeTitle}</h2>
        <ul className={LIST}>
          {a.timeItems.map((item) => (
            <li key={item} className={LIST_ITEM}>
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-slate-300">
          <strong className="text-white">Questions?</strong> {a.support.prefix}{' '}
          <a href={a.support.site.href} className="text-cyan-300 hover:text-cyan-200">
            {a.support.site.label}
          </a>{' '}
          or{' '}
          <a
            href={a.support.hub.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            {a.support.hub.label}
          </a>
          .
        </p>

        <p className="mt-6 text-lg font-medium text-white">{a.closing}</p>

        {variant === 'coordinator' ? (
          <section className="mt-10 rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-6">
            <h2 className="text-xl font-semibold text-cyan-100">{MESSAGE_B_COORDINATOR.title}</h2>
            <p className={BODY}>{MESSAGE_B_COORDINATOR.intro}</p>
            <ul className={LIST}>
              {MESSAGE_B_COORDINATOR.items.map((item) => (
                <li key={item} className={LIST_ITEM}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-wrap gap-3 border-t border-slate-800 pt-8">
        {collabHref ? (
          <Link
            href={collabHref}
            className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            Open workgroup collaboration
          </Link>
        ) : null}
        <a
          href={bookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600"
        >
          Read & discuss on the book
        </a>
        {patchHref ? (
          <a
            href={patchHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Patch drafts on Gov Hub
          </a>
        ) : null}
        <Link
          href={WORKGROUPS_LIST_HREF}
          className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
        >
          Browse workgroups
        </Link>
      </footer>
    </article>
  );
}
