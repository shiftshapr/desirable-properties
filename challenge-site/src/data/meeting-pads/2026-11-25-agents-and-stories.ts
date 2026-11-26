import type { MeetingPad, MeetingPadLink } from '@/lib/meeting-pads/types';

/**
 * Private call, Wednesday 25 November 2026: Daveed and Victor Vorski (builder of Audax, an operating system for
 * organisations), who is bringing their own agents onto Canopi. Victor consented on 26 Nov 2026 (recorded by the
 * owner) to being named, to this pad being public, and to its transcript and quotes being published, so it is served
 * on the live site (isMeetingPadPublic). The tracker paraphrases, with a short verbatim quote on each item; the
 * transcript is ./2026-11-25-agents-and-stories.transcript.json. Profanity is left out of both.
 *
 * The agents-only layer discussed in the call stays unnamed here and in the transcript (it is not on any public
 * roadmap), and another builder who was not on the call is not named.
 */

const AGENT_GUIDE: MeetingPadLink = {
  label: 'Canopi agent docs',
  href: 'https://docs.canopi.live/agents/',
};
const RAISED = '2026-11-25';
const BUILT = '2026-11-26';

export const MEETING_PAD_2026_11_25_AGENTS_AND_STORIES: MeetingPad = {
  slug: '2026-11-25-agents-and-stories',
  date: '2026-11-25',
  dateLabel: '25 Nov 2026',
  title: 'Agents on Canopi, and the story workstream',
  heldLabel: 'Wed 25 Nov 2026, 9:02 AM PT',
  durationMinutes: 65,
  format: 'Video call',
  visibility: 'public',
  visibilityNote:
    'Victor agreed to be named, to this pad being public, and to the transcript and quotes being published (26 Nov 2026). There is no video. Profanity is left out of the transcript.',
  participants: [
    { shownAs: 'Daveed Benjamin', role: 'host', consent: 'consented' },
    { shownAs: 'Victor Vorski', role: 'builder of Audax, bringing their agents onto Canopi', consent: 'consented' },
  ],
  reviewed: {
    label: 'The Canopi agent setup guide, written for Victor',
    href: AGENT_GUIDE.href,
    note: 'Sent before the call; their feedback is still to come.',
  },
  synthesis: [
    'Victor Vorski, who builds Audax, an operating system for organisations, and is adding video polls and agent-design workshops to it, talked with Daveed about how they each build with AI, about the layered web, and about bringing Victor\'s agents onto Canopi.',
    'Victor\'s strongest point: anyone building new technology needs a second workstream next to the code, telling stories of how life looks with it. AI makes that cheap: a comic of a day using an app took them ten minutes. They also asked for an experience that feels like magic from the start, the lesson they take from crypto.',
    'Practical tips came both ways. Victor shared their development workflow and a wrap-up step that harvests what a session learned before it is closed; Daveed built his own version the next day. Daveed offered his Substack reply routine. For Canopi Victor will test the agent guide and look at the agents-only layer, and asked to work on paid deployments: helping networks of small and medium businesses use this.',
  ],
  keyPoints: [
    'Two workstreams, not one: build the technology, and tell the stories of how people will use it.',
    'Make it smooth and joyful for anyone from day one; there is no patching a bad experience later.',
    'Harvest every session before closing it: what was learned, what to file, what was left hanging.',
    'Specs written to be development-ready, kept in GitHub issues, with a roadmap only for major work.',
    'Paid work: help business ecosystems of small and mid-sized players adopt agents and the layered web.',
  ],
  groups: [
    {
      id: 'canopi',
      title: 'For Canopi and agents',
      intro: 'What came up about agents on Canopi, the layered web and paid work.',
      items: [
        {
          n: 1,
          at: '40:57–42:08',
          raised: 'Daveed asked for feedback on the agent setup guide, read as someone seeing it for the first time: is it easy, where is it unclear, where does it not work. Victor agreed and asked which angle to read it from.',
          quote: { text: 'Is there any particular direction you would like feedback or thoughts on?', by: 'Victor Vorski', at: '41:51' },
          response: 'The guide covers two routes: a frontier model through the connector (drafts only, an accountable human starts it) and your own agent, which may post within the rate limits. Victor\'s agents post in the communities Victor belongs to.',
          status: 'planned',
          statusDate: RAISED,
          links: [AGENT_GUIDE],
          note: 'Before the call, on 25 Nov, Victor\'s Audax community was reactivated and agents were made able to post in their operator\'s communities, live on production the same day.',
        },
        {
          n: 2,
          at: '42:59–43:56',
          raised: 'Agent rate limits (about 30 posts and 120 reactions a day) seemed reasonable to Victor, roughly what LinkedIn allows.',
          quote: { text: 'That\'s reasonable.', by: 'Victor Vorski', at: '43:40' },
          response: 'No change.',
          status: 'kept',
          statusDate: RAISED,
        },
        {
          n: 3,
          at: '24:20–27:00',
          raised: 'Get the experience right for anyone, not only coders: it should feel joyous and like magic, the lesson from crypto. Daveed agreed: blockchain is used for permanent storage underneath, without asking people to think about it.',
          quote: { text: 'It should be joyous and feel like magic and just be smooth in using it.', by: 'Victor Vorski', at: '25:22' },
          response: 'A design principle for Canopi and the requirements that come out of the Desirable Properties.',
          status: 'kept',
          statusDate: RAISED,
        },
        {
          n: 4,
          at: '44:00–46:07',
          raised: 'Agents-only layer: agents make themselves visible on the pages about what they work on, so other agents and people with the same interests can find them, alongside registries.',
          quote: { text: 'Yeah, I mean, that\'s amazing. I\'ll look into it.', by: 'Victor Vorski', at: '46:07' },
          response: 'Victor will look at it and see whether there is a part for them.',
          status: 'to_decide',
          statusDate: RAISED,
        },
        {
          n: 5,
          at: '60:43–64:08',
          raised: 'Go to market for agent-to-agent: business ecosystems with many small and mid-sized players (dental supply, agriculture) that big consultancies are not looking at, where there is money moving and agents could meet on each other\'s sites.',
          quote: { text: 'For us it would be interesting to go into places, ecosystems, where there are many small and medium-sized players.', by: 'Victor Vorski', at: '63:37' },
          response: 'A brainstorm on go to market, alongside Daveed\'s starting point: enrolling agents and their operators who want to work on the defending side.',
          status: 'to_decide',
          statusDate: RAISED,
        },
        {
          n: 6,
          at: '46:13–48:44',
          raised: 'Paid projects and consulting, the way many open-source projects support themselves, so more people can afford to work on this.',
          quote: { text: 'There are a lot of us who would love to engage more, but we just don\'t have the capacity to work if we\'re not being paid.', by: 'Victor Vorski', at: '48:13' },
          response: 'Daveed is starting installs that put a community on top of an organisation\'s site, with white-label layers, extensions or browsers. Which offer comes first is a decision.',
          status: 'to_decide',
          statusDate: RAISED,
        },
      ],
    },
    {
      id: 'stories',
      title: 'For the story workstream',
      intro: 'Victor\'s case for telling stories next to building, and the ideas that came with it.',
      items: [
        {
          n: 7,
          at: '31:29–35:17',
          raised: 'Run a second workstream next to the code: stories and narrative of how life looks with these capabilities. Do not leave it to the world to imagine; people are too busy.',
          quote: { text: 'You should have two workstreams.', by: 'Victor Vorski', at: '31:29' },
          agendaLine: 'A story workstream next to the code.',
          response: 'Daveed agreed it matters as much as the code, and that it lets people who are not technical take part. Where it lives and who runs it is a decision.',
          status: 'to_decide',
          statusDate: RAISED,
        },
        {
          n: 8,
          at: '33:40–35:01',
          raised: 'Ask the AI for a comic book of a day in the life of someone using the app. It took them ten minutes and people connected with it far better than with specs or wireframes.',
          quote: { text: 'Claude, make me a comic book of a day of a person using this app in their life.', by: 'Victor Vorski', at: '31:29' },
          agendaLine: 'A comic of a day with Canopi and the layered web.',
          response: 'A first comic for Canopi, next to the feature videos. Victor offered their examples.',
          status: 'to_decide',
          statusDate: RAISED,
        },
        {
          n: 9,
          at: '37:29–40:16',
          raised: 'A short story contest for positive science fiction about pro-social technology, maybe with an AI company or an AI film studio, since most sci-fi today is dystopian.',
          quote: { text: 'We so need positive sci-fi.', by: 'Victor Vorski', at: '37:35' },
          agendaLine: 'A positive sci-fi story contest about the layered web.',
          response: 'A possible community event; needs an owner, a partner and a date.',
          status: 'to_decide',
          statusDate: RAISED,
        },
      ],
    },
    {
      id: 'building',
      title: 'For how we build',
      intro: 'Working methods each side shared.',
      items: [
        {
          n: 10,
          at: '08:05–09:50',
          raised: 'Before closing an AI session, run a wrap-up: what did it learn, what should be filed, what was left hanging. Without asking, it is not thorough, and most sessions have something worth keeping.',
          quote: { text: 'If you don\'t ask it at the end, clean up, what did you learn, what issues should you file, it\'s not thorough about it.', by: 'Victor Vorski', at: '08:32' },
          response: 'Built: a thread-harvest skill, modelled on the wrap-up in Victor\'s published gogogo workflow, that saves learnings, cleans up and suggests a new thread when the context is long.',
          status: 'built',
          statusDate: BUILT,
        },
        {
          n: 11,
          at: '06:25–11:27',
          raised: 'Spec everything out until it is development-ready, with every decision made, in GitHub issues, so coding agents can work through hours of backlog; deploy to dev or staging, never straight to production for things people use.',
          quote: { text: 'All of the decisions are made, all of the design choices, and it\'s just going to code it, test it and put it out.', by: 'Victor Vorski', at: '11:12' },
          response: 'Daveed works the same way on staging. A candidate for the step from Desirable Properties to requirements to architecture records to code, with the community in the loop.',
          status: 'to_decide',
          statusDate: RAISED,
        },
        {
          n: 12,
          at: '52:22–54:52',
          raised: 'Do not code the edge cases: code the 95 to 98 percent and hand the rest to the model at run time, which keeps the system small and self-healing. The interface becomes talking to the AI plus a dashboard.',
          quote: { text: 'Anything that you don\'t know how to do, throw back to the LLM, let it figure it out in real time.', by: 'Victor Vorski', at: '54:34' },
          response: 'A principle for new tools. Daveed adds: run those model calls in scheduled jobs on the subscription rather than the paid API where possible.',
          status: 'kept',
          statusDate: RAISED,
        },
        {
          n: 13,
          at: '05:30–06:19',
          raised: 'Put reusable skills in a plugin repository so others can install them; any frontier model can follow a skill.',
          quote: { text: 'Anything that\'s reusable, you can put into a plugin.', by: 'Victor Vorski', at: '05:36' },
          response: 'Daveed\'s skills are not in a shared repository yet. The Substack reply routine is the first to share (see the follow-ups).',
          status: 'to_decide',
          statusDate: RAISED,
        },
      ],
    },
  ],
  followUps: {
    title: 'Things Daveed said he would do',
    items: [
      {
        text: 'Pull out the Substack reply routine and share it.',
        owner: 'Daveed Benjamin',
        status: 'in_progress',
        note: 'A general version exists as a plugin (Substack lens replies); sending it is not recorded yet.',
      },
      {
        text: 'Make a pad for this conversation.',
        owner: 'Daveed Benjamin',
        status: 'done',
        note: 'This page (26 Nov 2026). Victor agreed the same day to it being public, with quotes and the transcript.',
      },
      {
        text: 'Mention OpenAI\'s new programme that pays people to work with local businesses, in case it opens outside the US.',
        owner: 'Daveed Benjamin',
        status: 'done',
        note: 'Mentioned in the call; US-only, in 20 cities, for now.',
      },
    ],
  },
  nextSteps: [
    'Waiting on Victor: feedback on the agent guide, a look at the agents-only layer, and the skills and comic examples they offered.',
    'Decide items 5 to 9: the go-to-market brainstorm, the first paid offer, and who runs the story workstream.',
    'Check in again in about two weeks (around 9 Dec 2026).',
  ],
  inviteSummary:
    'Victor Vorski, who is bringing their agents onto Canopi, talked with Daveed about agents in communities, paid work with business ecosystems, and why every new technology needs a story workstream next to the code.',
  chatStarters: [
    'What did this call suggest about telling stories alongside the code?',
    'What is still waiting on the agent guide feedback?',
    'Which ideas from this call need a decision?',
  ],
};
