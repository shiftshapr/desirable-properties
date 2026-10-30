import Link from 'next/link';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

type Step = { title: string; body: React.ReactNode; tips?: React.ReactNode[] };

const STEPS: Step[] = [
  {
    title: 'Sign in and open your DP’s Review tab',
    body: (
      <>
        Sign in, open your DP from the <Link href={WORKGROUPS_LIST_HREF} className="text-cyan-300 hover:text-cyan-200">workgroups list</Link>,
        and choose the <strong className="text-white">Review</strong> tab. Co-editors land on Review when they open the
        workgroup page.
      </>
    ),
  },
  {
    title: 'Check how many proposals are waiting',
    body: (
      <>
        The boxes at the top count the proposals. <strong className="text-white">Open</strong> is the number waiting
        for a co-editor decision. Work down the list from the top; each proposal is its own card.
      </>
    ),
  },
  {
    title: 'For each proposal, see what it changes and where',
    body: <>Read the card from top to bottom:</>,
    tips: [
      <>
        The <strong className="text-white">section</strong> line (for example “5. Primary Mechanisms › 5.14 Risk-Tiered
        Enforcement”) says where in the chapter the change goes.
      </>,
      <>
        <strong className="text-white">Diff</strong> shows what is removed and added. <strong className="text-white">As
        updated</strong> shows the passage as it would read after the change. An insert goes above or below the passage
        shown.
      </>,
      <>
        To read it in the chapter, use <strong className="text-white">Open on book Discuss</strong>.
      </>,
      <>The author’s reason, member yes/no votes and comments, and the style notes are below the text.</>,
    ],
  },
  {
    title: 'If Claude flags the placement, decide where it goes',
    body: (
      <>
        A card may say <strong className="text-white">Claude suggests a better place for this</strong>. Choose{' '}
        <strong className="text-white">Move to suggested passage</strong> to open Revise at that spot, or{' '}
        <strong className="text-white">Keep it where it is</strong>.
      </>
    ),
  },
  {
    title: 'If you are unsure, ask Deepi',
    body: (
      <>
        Open <strong className="text-white">Ask Deepi about this proposal</strong> and ask in plain words, for example
        “Does this belong in this section?” or “Is this clear?” Deepi has read the chapter and the style guide. Your
        questions are private to you, and each person has 20 a day.
      </>
    ),
    tips: [
      <>
        If Deepi recommends a different place or wording, you will see{' '}
        <strong className="text-white">Apply Deepi’s suggestion</strong>. It opens Revise already filled in. Check it,
        change anything you like, then save.
      </>,
      <>
        If Deepi says the proposal has parts that belong in different places in the chapter, you will see{' '}
        <strong className="text-white">Create the proposals Deepi recommends</strong>. Each part gets its own place.
        Check each one, write a short note to the author, and post. Text that goes in one place stays one proposal, however
        many points it makes.
      </>,
      <>Deepi advises; you decide. Nothing changes until you save.</>,
    ],
  },
  {
    title: 'Decide: approve, revise or decline',
    body: <>Every proposal ends with one of three decisions:</>,
    tips: [
      <>
        <strong className="text-white">Approve</strong> when it is right as written. A note is optional.
      </>,
      <>
        <strong className="text-white">Revise</strong> when the idea is right but the wording or place needs work: fix
        grammar, tighten wording, or pick another passage, keeping the author’s meaning. Then{' '}
        <strong className="text-white">Save revision and approve</strong>. Your version stays under the author’s name and
        counts as your approval.
      </>,
      <>
        <strong className="text-white">Decline</strong> when it is wrong, out of scope or a duplicate. Write a note the
        author can act on; Decline stays off until you do.
      </>,
    ],
  },
  {
    title: 'Wait for the other co-editor',
    body: (
      <>
        A proposal goes into the next revision draft only when both co-editors approve it. A revised or split proposal
        needs the other co-editor to approve the new version. Aim to decide each proposal within 7 days.
      </>
    ),
  },
  {
    title: 'Publish the revision (later, together)',
    body: (
      <>
        Approving does not change the book yet. When enough changes are approved, a co-editor runs the pre-publish check
        and chooses <strong className="text-white">Publish revision</strong> at the top of Review. Only then does the
        new text go live.
      </>
    ),
  },
];

/** The co-editor guide's numbered steps: the /co-editors page and the workgroup Co-editing tab. */
export default function CoEditorGuideSteps({ className = 'mt-10' }: { className?: string }) {
  return (
    <ol className={`${className} space-y-6`}>
      {STEPS.map((step, i) => (
        <li key={step.title} id={`step-${i + 1}`} className="scroll-mt-20 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="flex items-baseline gap-3 text-lg font-semibold text-white">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-sm">{i + 1}</span>
            {step.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{step.body}</p>
          {step.tips ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
              {step.tips.map((tip, j) => (
                <li key={j}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
