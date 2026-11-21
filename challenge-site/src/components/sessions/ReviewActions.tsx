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
        Flag a misattribution, a missing objection, a wrong fact, unfair wording or a missing option. New proposals
        are kept apart from corrections.
      </p>
    </div>
  );
}
