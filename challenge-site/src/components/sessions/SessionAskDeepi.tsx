import { readSession, sessionToAuthUser } from '@/lib/auth-session';
import type { HermesChatContext } from '@/components/HermesChat';
import SessionAskDeepiChat from './SessionAskDeepiChat';
import SessionCollapsible from './SessionCollapsible';

type Props = {
  /** Session slug, used to tag Deepi threads started here. */
  slug: string;
  title: string;
  context: HermesChatContext;
  starterPrompts?: string[];
  id?: string;
};

/**
 * "Ask Deepi about the <date> meeting": the site's AI chat with this meeting's summary, ballot and transcript as
 * context (sessionDeepiContext). Collapsed by default; the signed-in "Session chat" stays separate.
 */
export default async function SessionAskDeepi({ slug, title, context, starterPrompts, id = 'ask-deepi' }: Props) {
  const session = await readSession().catch(() => null);
  return (
    <SessionCollapsible id={id} title={title}>
      <p className="mb-3 text-sm text-slate-300">
        Deepi has this meeting’s summary, ballot and transcript. Answers can be wrong: check the timestamps.
      </p>
      <SessionAskDeepiChat
        surface={`desirableproperties.org/session/${slug}`}
        context={context}
        starterPrompts={
          starterPrompts ?? [
            'What did this meeting decide, and what is still open?',
            'Who argued for and against the council?',
            'Explain the ballot questions in plain English.',
          ]
        }
        initialSignedIn={Boolean(session)}
        initialUser={sessionToAuthUser(session)}
      />
    </SessionCollapsible>
  );
}
