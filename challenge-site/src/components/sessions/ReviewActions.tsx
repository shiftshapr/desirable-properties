export const REVIEW_DOC_URL = 'https://docs.google.com/document/d/1iqZQpaBt-RmnKdzd5oDFqULx5bihJtQXKXh4QeGRBLM/edit';
export const REVIEW_EMAIL = 'daveed@bridgit.io';

/**
 * How to send a correction during the review. Every session has its OWN Google Doc for comments (the spec's review
 * surface); each page passes `reviewDocChannels(<its doc>, <meeting name>)`. The default (no doc yet) is the page's
 * session chat, so a page can never link another session's doc.
 */
export type ReviewChannels = {
  /** Primary button: the Google Doc for the 16 Nov session, the session chat anchor for later ones. */
  primary: { label: string; href: string };
  /** Optional extra link (the session chat when the primary is the doc). */
  secondary?: { label: string; href: string };
  /** Subject line of the "Email a correction" link, naming the meeting. */
  emailSubject: string;
};

export const NOV16_REVIEW_CHANNELS: ReviewChannels = {
  primary: { label: 'Comment in the Google Doc', href: REVIEW_DOC_URL },
  emailSubject: 'Correction: DP Meta-Governance, 16 November',
};

export const reviewDocChannels = (docUrl: string, meetingName: string): ReviewChannels => ({
  primary: { label: 'Comment in the Google Doc', href: docUrl },
  secondary: { label: 'Post in the session chat', href: '#session-chat' },
  emailSubject: `Correction: ${meetingName}`,
});

export const sessionChatReviewChannels = (meetingName: string): ReviewChannels => ({
  primary: { label: 'Post a correction in the session chat', href: '#session-chat' },
  emailSubject: `Correction: ${meetingName}`,
});

export default function ReviewActions({ channels = sessionChatReviewChannels('DP listening session') }: { channels?: ReviewChannels }) {
  const external = /^https?:/.test(channels.primary.href);
  return (
    <div id="review-actions" className="scroll-mt-24 rounded-xl border border-cyan-900/60 bg-cyan-950/20 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={channels.primary.href}
          rel={external ? 'noopener noreferrer' : undefined}
          className="inline-flex justify-center rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200"
        >
          {channels.primary.label}
        </a>
        {channels.secondary ? (
          <a
            href={channels.secondary.href}
            className="inline-flex justify-center rounded-lg border border-slate-600 px-5 py-2.5 font-semibold text-slate-100 no-underline hover:border-cyan-600"
          >
            {channels.secondary.label}
          </a>
        ) : null}
        <a
          href={`mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent(channels.emailSubject)}`}
          className="inline-flex justify-center rounded-lg border border-slate-600 px-5 py-2.5 font-semibold text-slate-100 no-underline hover:border-cyan-600"
        >
          Email a correction
        </a>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Flag a misattribution, a missing objection, a wrong fact, unfair wording or a missing option. New proposals
        are kept apart from corrections.
      </p>
    </div>
  );
}
