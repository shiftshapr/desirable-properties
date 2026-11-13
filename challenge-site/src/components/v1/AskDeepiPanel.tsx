import Link from 'next/link';

/** Questions that open Deepi with the prompt in the composer (/agent?prompt=…). */
const PILLS = [
  'How is this different from Web3?',
  'Why does the web need a layer above the page at all?',
  "Who decides what's desirable, and who gets left out?",
  'Which property would Big Tech fight hardest?',
  'Could this be captured by the platforms it criticizes?',
  'How does this protect me from AI manipulation?',
  'What would change for me if this were built?',
  'What is the weakest chapter, and why?',
];

const href = (q: string) => `/agent?prompt=${encodeURIComponent(`About The Layered Web, Version 1.0: ${q}`)}`;

/** /v1: ask Deepi, the Desirable Properties assistant, about the book. */
export default function AskDeepiPanel() {
  return (
    <section aria-labelledby="ask-deepi-heading" className="border-b border-slate-800 bg-slate-900/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="ask-deepi-heading" className="text-2xl font-bold text-white">
          Ask Deepi about the book
        </h2>
        <p className="mt-2 max-w-2xl text-slate-400">
          Deepi has read all 24 properties, the proposals and the decisions behind them. Push on it: pick a question
          or ask your own.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {PILLS.map((q) => (
            <li key={q}>
              <Link
                href={href(q)}
                className="inline-flex rounded-full border border-cyan-700/60 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-400 hover:bg-cyan-900/40"
              >
                {q}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          <Link href="/agent" className="text-cyan-300 hover:text-cyan-200">
            Open Deepi
          </Link>{' '}
          to ask anything. Sign in to send a question.
        </p>
      </div>
    </section>
  );
}
