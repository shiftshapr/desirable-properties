export const REVIEW_DOC_URL = 'https://docs.google.com/document/d/1iqZQpaBt-RmnKdzd5oDFqULx5bihJtQXKXh4QeGRBLM/edit';
export const REVIEW_EMAIL = 'daveed@bridgit.io';

/** How to comment during the review. On-page commenting and voting are proposed, not built. */
export default function ReviewActions() {
  return (
    <div id="review-actions" className="scroll-mt-24 rounded-xl border border-cyan-900/60 bg-cyan-950/20 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={REVIEW_DOC_URL}
          rel="noopener noreferrer"
          className="inline-flex justify-center rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200"
        >
          Comment in the Google Doc
        </a>
        <a
          href={`mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent('Correction: DP Meta-Governance, 16 November')}`}
          className="inline-flex justify-center rounded-lg border border-slate-600 px-5 py-2.5 font-semibold text-slate-100 no-underline hover:border-cyan-600"
        >
          Email a correction
        </a>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        For this first session, comments are made in the Google Doc and will be brought into this page. Flag a
        misattribution, a missing objection, an incorrect fact, unfair wording or an omitted option. New proposals are
        welcome too and are kept apart from corrections to the record.
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Commenting and voting on this page are being built (status: proposed). They are not available yet.
      </p>
    </div>
  );
}
