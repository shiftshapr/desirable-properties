import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Text and WhatsApp alerts – Desirable Properties',
  description:
    'Desirable Properties and Canopi alerts: optional text, WhatsApp and Signal messages about votes, sessions and a weekly summary of things you follow, plus announcements only if you opt in separately. How to opt in, opt out, and what messages look like.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/text-alerts' },
};

const CONTACT_EMAIL = 'info@bridgit.io';
const ACCOUNT_SETTINGS_URL = 'https://app.canopi.live/profile';

const CONSENT_ALERTS =
  'Text me alerts and reminders: one-time codes, reminders about votes and listening sessions, and a weekly summary of activity on things I follow, including Canopi replies. Up to 4 msgs a week. Msg & data rates may apply. Reply HELP for help, STOP to opt out.';
const CONSENT_ANNOUNCEMENTS =
  'Also text me occasional announcements and invitations to new sessions and features. Msg & data rates may apply. Reply STOP to opt out.';

const SAMPLE_MESSAGES = [
  {
    label: 'Confirmation code',
    text: 'Desirable Properties: your confirmation code is [123456]. It expires in 10 minutes. Do not share it. Reply HELP for help, STOP to opt out.',
  },
  {
    label: 'Voting reminder',
    text: 'Desirable Properties: voting on the [session name] ballot closes tonight at [8 PM PT]. Vote: https://desirableproperties.org/events/[session]#vote Reply STOP to opt out.',
  },
  {
    label: 'Session reminder',
    text: 'Desirable Properties: the listening session "[session title]" starts at [10 AM PT] today. Join: https://desirableproperties.org/events/[session] Reply STOP to opt out.',
  },
  {
    label: 'Weekly summary',
    text: 'Desirable Properties: this week, [3] new comments on proposals you follow and [2] replies to you in Canopi. See them: https://desirableproperties.org/[link] Reply STOP to opt out.',
  },
  {
    label: 'Announcement (only with the separate opt-in)',
    text: 'Desirable Properties: new this month, [feature]. Join the first session on [date]: https://desirableproperties.org/[page] Reply STOP to opt out.',
  },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-12 text-2xl font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function TextAlertsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to home
      </Link>

      <h1 className="mt-8 text-4xl font-bold text-white">Text and WhatsApp alerts</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        <strong className="text-white">Desirable Properties and Canopi alerts</strong> are optional
        messages by text (SMS), WhatsApp or Signal from Bridgit To The Future LLC, doing business as
        Bridgit DAO, which runs desirableproperties.org and Canopi.
      </p>
      <p className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
        Adding a phone number is optional. You do not need to give a number or agree to alerts to
        use this site, take part, comment or vote.
      </p>

      <Section id="program" title="About the program">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Program name:</strong> Desirable Properties and Canopi alerts.
          </li>
          <li>
            <strong className="text-white">What you get:</strong> one-time codes to confirm your
            number or sign in, reminders before votes close and before listening sessions, alerts
            and one weekly summary of activity on things you follow, including replies and mentions
            in Canopi. Replies are never texted one by one. Only if you tick a separate box, also occasional
            announcements and invitations to new sessions and features.
          </li>
          <li>
            <strong className="text-white">How often:</strong> message frequency varies. Usually
            up to 4 messages a week, and only a few per voting round or session you follow. You
            also get a one-time code when you confirm your number.
          </li>
          <li>
            <strong className="text-white">Cost:</strong> message and data rates may apply.
          </li>
          <li>
            <strong className="text-white">Stop and help:</strong> reply <strong className="text-white">STOP</strong>{' '}
            to any message to stop. Reply <strong className="text-white">HELP</strong> for help.
          </li>
          <li>Carriers are not liable for delayed or undelivered messages.</li>
          <li>
            <strong className="text-white">Contact:</strong>{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200">
              {CONTACT_EMAIL}
            </a>{' '}
            or the <Link href="/support" className="text-cyan-300 hover:text-cyan-200">support page</Link>.
          </li>
        </ul>
      </Section>

      <Section id="opt-in" title="How to opt in">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Sign in to desirableproperties.org. You sign in with your Canopi account.
          </li>
          <li>
            Open your account settings (
            <a href={ACCOUNT_SETTINGS_URL} className="text-cyan-300 hover:text-cyan-200">
              app.canopi.live/profile
            </a>
            ) and find the <strong className="text-white">Phone</strong> section.
          </li>
          <li>Add your phone number.</li>
          <li>
            Tick the box for alerts and reminders, and separately the box for announcements if you
            want them. Choose text message, WhatsApp or Signal. Tick the box agreeing to the Terms
            of Service and Privacy Policy. Every box starts unticked.
          </li>
          <li>
            Confirm your number with the one-time code we text you. Alerts start only after the
            number is confirmed.
          </li>
        </ol>
        <p className="text-sm text-slate-400">
          We are turning phone alerts on in stages. If you do not see the Phone section yet, it is
          not available on your account yet.
        </p>

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          What the form looks like
        </p>
        <div
          aria-label="Example of the phone opt-in form"
          className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg"
        >
          <p className="text-lg font-semibold text-white">Phone</p>
          <p className="mt-1 text-sm text-slate-400">Optional. Only you can see your number.</p>
          <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="mock-phone">
            Phone number
          </label>
          <input
            id="mock-phone"
            type="tel"
            disabled
            placeholder="+1 415 555 0123"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-300 placeholder:text-slate-500"
          />
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-200">Send me alerts by</legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              {['Text message', 'WhatsApp', 'Signal'].map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input type="checkbox" disabled className="h-4 w-4" />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-200">
            <input type="checkbox" disabled className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{CONSENT_ALERTS}</span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm text-slate-200">
            <input type="checkbox" disabled className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{CONSENT_ANNOUNCEMENTS}</span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm text-slate-200">
            <input type="checkbox" disabled className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-cyan-300 hover:text-cyan-200">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">Privacy Policy</Link>.
            </span>
          </label>
          <button
            type="button"
            disabled
            className="mt-5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white opacity-80"
          >
            Send code
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Not required to use Desirable Properties. You can skip this section.
          </p>
        </div>
        <p className="text-sm text-slate-400">
          This is a picture of the form for reference. It does not collect anything.
        </p>
      </Section>

      <Section id="opt-out" title="How to opt out or remove your number">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Reply <strong className="text-white">STOP</strong> to any text. You get one message
            confirming you are opted out, and no more alerts after that.
          </li>
          <li>Untick any alert in the Phone section of your account settings.</li>
          <li>
            Choose <strong className="text-white">Remove number</strong> in the Phone section. We
            delete your number and everything stored with it, and all alerts stop.
          </li>
          <li>
            Or email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200">
              {CONTACT_EMAIL}
            </a>{' '}
            and we will remove it for you.
          </li>
        </ul>
        <p>
          Read the full{' '}
          <Link href="/terms#text-alerts" className="text-cyan-300 hover:text-cyan-200">
            text alert terms
          </Link>{' '}
          and how we handle your number in the{' '}
          <Link href="/privacy#text-alerts" className="text-cyan-300 hover:text-cyan-200">
            Privacy Policy
          </Link>
          . We do not share or sell your mobile number or text message opt-in consent with third
          parties or affiliates for marketing or promotional purposes.
        </p>
      </Section>

      <Section id="samples" title="Sample messages">
        <div className="space-y-4">
          {SAMPLE_MESSAGES.map((m) => (
            <figure key={m.label}>
              <figcaption className="text-sm font-semibold text-slate-400">{m.label}</figcaption>
              <blockquote className="mt-2 max-w-xl rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3 text-sm leading-relaxed text-slate-100 break-words">
                {m.text}
              </blockquote>
            </figure>
          ))}
        </div>
      </Section>

      <p className="mt-12 text-sm text-slate-500">
        Desirable Properties is operated by Bridgit To The Future LLC, doing business as Bridgit
        DAO. Our <Link href="/terms">Terms of Service</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link> are interim and were prepared without a licensed
        attorney.
      </p>
    </main>
  );
}
