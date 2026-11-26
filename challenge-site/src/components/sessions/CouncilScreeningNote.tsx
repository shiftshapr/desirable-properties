import Link from 'next/link';
import type { ScreeningView } from '@/lib/screening/screening-core';
import { pacificAndUtc } from '@/lib/sessions/session-phases';
import { SCREENING_HOURS } from '@/lib/sessions/session-rules';

/** "Council screening": the rule and the window, above the draft ballot. */
export default function CouncilScreeningNote({ view, signInHref }: { view: ScreeningView; signInHref: string }) {
  const s = view.screening;
  const held = view.questions.filter((q) => q.outcome === 'held_back').length;
  return (
    <div id="council-screening" className="scroll-mt-24 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
      <p>
        <strong className="text-white">Council screening.</strong> Each draft question goes to the ballot unless a member of
        the interim council objects to it here, with a reason. Objections are public, next to the question. The window
        runs {SCREENING_HOURS} hours from the review closing: <strong className="text-white">{pacificAndUtc(s.windowStartsAt)}</strong> to{' '}
        <strong className="text-white">{pacificAndUtc(s.closesAt)}</strong>. Members can object only once the review
        has closed, and can withdraw their own objection until the window closes.
      </p>
      <p className="mt-1.5">
        {s.status === 'closed'
          ? held
            ? `Screening closed. ${held} ${held === 1 ? 'question is' : 'questions are'} held back, with the reasons below; the rest go to the ballot.`
            : 'Screening closed. No objections: every question goes to the ballot as drafted.'
          : view.viewer.member
            ? `You are signed in as a council member (${view.viewer.name}). Open the draft ballot questions to object to a question.`
            : view.viewer.signedIn
              ? `${view.viewer.signedInAs ? `Signed in as ${view.viewer.signedInAs}. ` : ''}Only interim council members can object: Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar.`
              : (
                <>
                  Interim council: Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar. Council
                  members: <Link href={signInHref} className="text-cyan-300 hover:text-cyan-200">sign in</Link> to object.
                </>
              )}
      </p>
      {s.status !== 'closed' && !view.councilAvailable ? (
        <p className="mt-1.5 font-semibold text-amber-200">
          The council list is not available right now, so objections cannot be recorded. Please tell the host in the
          session chat.
        </p>
      ) : null}
    </div>
  );
}
