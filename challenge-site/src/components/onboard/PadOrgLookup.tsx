'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DpDialog } from '@/components/DpDialog';
import { padPublicBase } from '@/lib/hermes-onboard/tabs';
import type { PersonPadSelectedSource } from '@/lib/hermes-onboard/person-pad-lookup';
import type { PadLookupResult } from '@/lib/hermes-onboard/types';

type LookupMode = 'organization' | 'person';
type PersonStep = 'form' | 'candidates';

type PersonPadCandidate = PersonPadSelectedSource;

const ORG_STATUS_HINT: Record<PadLookupResult['status'], string> = {
  found: 'Full landing pad found. Opening briefing…',
  roster: 'Alliance roster match. Opening your member landing pad…',
  dynamic: 'No roster match yet. Opening a request page for this website…',
  not_found: '',
};

function emptyLinkRow(): string {
  return '';
}

function hasPasteOrUpload(input: {
  bioText: string;
  profilePaste: string;
  papers: File[];
}): boolean {
  return Boolean(input.bioText.trim() || input.profilePaste.trim() || input.papers.length);
}

export default function PadOrgLookup({
  initialMode = 'organization',
}: {
  initialMode?: LookupMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<LookupMode>(initialMode);

  const [orgInput, setOrgInput] = useState('');
  const [orgLookupBusy, setOrgLookupBusy] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgHint, setOrgHint] = useState<string | null>(null);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgAffiliation, setOrgAffiliation] = useState('');
  const [workLinks, setWorkLinks] = useState<string[]>([emptyLinkRow()]);
  const [perspectiveLinks, setPerspectiveLinks] = useState<string[]>([emptyLinkRow()]);
  const [papers, setPapers] = useState<File[]>([]);
  const [bioText, setBioText] = useState('');
  const [profilePaste, setProfilePaste] = useState('');
  const [showPasteSection, setShowPasteSection] = useState(false);

  const [personStep, setPersonStep] = useState<PersonStep>('form');
  const [candidates, setCandidates] = useState<PersonPadCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  const [personBusy, setPersonBusy] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  async function handleOrgSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrgError(null);
    setOrgHint(null);
    const trimmedInput = orgInput.trim();
    if (!trimmedInput) return;

    setOrgLookupBusy(true);
    try {
      const res = await fetch(
        `/api/pad/resolve?input=${encodeURIComponent(trimmedInput)}`,
      );
      const result = (await res.json().catch(() => null)) as PadLookupResult | null;
      if (!res.ok || !result) {
        setOrgError('Could not look up that organization. Try again in a moment.');
        return;
      }
      if (result.status === 'not_found' || !result.href) {
        setOrgError(
          'No matching org found. Try your org website (e.g. consumerreports.org), a member name, or a slug like your-org-name.',
        );
        return;
      }
      if (
        result.status === 'dynamic'
        && !result.href.includes('?domain=')
        && !trimmedInput.includes('.')
      ) {
        setOrgHint('No published pad yet. Opening the request page for this slug…');
      }
      setOrgHint(ORG_STATUS_HINT[result.status]);
      router.push(result.href);
    } catch {
      setOrgError('Could not look up that organization. Try again in a moment.');
    } finally {
      setOrgLookupBusy(false);
    }
  }

  function discoveryPayload() {
    return {
      linkedinUrl: linkedinUrl.trim() || undefined,
      cvUrl: cvUrl.trim() || undefined,
      displayName: displayName.trim() || undefined,
      orgAffiliation: orgAffiliation.trim() || undefined,
      workLinks: workLinks.map((row) => row.trim()).filter(Boolean),
      perspectiveLinks: perspectiveLinks.map((row) => row.trim()).filter(Boolean),
      bioText: bioText.trim() || undefined,
      profilePaste: profilePaste.trim() || undefined,
    };
  }

  async function maybeExplainLinkedInBlock() {
    if (!linkedinUrl.trim()) return;
    if (hasPasteOrUpload({ bioText, profilePaste, papers })) return;
    await DpDialog.alert({
      title: "We can't read LinkedIn automatically",
      message:
        'LinkedIn blocks automated reads. Paste your LinkedIn export or profile text below, or upload a CV. We only use what you share. You choose which public items we consider next.',
      variant: 'info',
      confirmLabel: 'Continue',
    });
    setShowPasteSection(true);
  }

  async function handleFindPublicWork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonError(null);
    setPersonBusy(true);
    try {
      await maybeExplainLinkedInBlock();
      const res = await fetch('/api/pad/person/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discoveryPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Could not find public work');
      }
      const rows = Array.isArray(json.candidates) ? (json.candidates as PersonPadCandidate[]) : [];
      setCandidates(rows);
      setSelectedCandidateIds(new Set(rows.map((row) => row.id)));
      setPersonStep('candidates');
      if (!rows.length) {
        await DpDialog.alert({
          title: 'No public matches yet',
          message:
            'We did not find matching perspectives, PCI threads, or roster orgs from your input. You can still create your pad with the links and pasted text you provided.',
          variant: 'info',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not find public work';
      setPersonError(message);
      await DpDialog.alert({
        title: 'Could not find public work',
        message,
        variant: 'danger',
      });
    } finally {
      setPersonBusy(false);
    }
  }

  async function handleCreatePersonPad(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonError(null);
    setPersonBusy(true);
    try {
      const selectedSources = candidates.filter((row) => selectedCandidateIds.has(row.id));
      const form = new FormData();
      if (linkedinUrl.trim()) form.append('linkedinUrl', linkedinUrl.trim());
      if (cvUrl.trim()) form.append('cvUrl', cvUrl.trim());
      if (displayName.trim()) form.append('displayName', displayName.trim());
      if (orgAffiliation.trim()) form.append('orgAffiliation', orgAffiliation.trim());
      if (bioText.trim()) form.append('bioText', bioText.trim());
      if (profilePaste.trim()) form.append('profilePaste', profilePaste.trim());
      for (const href of workLinks.map((row) => row.trim()).filter(Boolean)) {
        form.append('workLinks', href);
      }
      for (const href of perspectiveLinks.map((row) => row.trim()).filter(Boolean)) {
        form.append('perspectiveLinks', href);
      }
      if (selectedSources.length) {
        form.append('selectedSources', JSON.stringify(selectedSources));
      }
      for (const file of papers) {
        form.append('papers', file);
      }

      const res = await fetch('/api/pad/person', {
        method: 'POST',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Could not create person pad');
      }
      if (!json.href) {
        throw new Error('Person pad created but no href returned');
      }
      router.push(String(json.href));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create person pad';
      setPersonError(message);
      await DpDialog.alert({
        title: 'Could not create person pad',
        message,
        variant: 'danger',
      });
    } finally {
      setPersonBusy(false);
    }
  }

  function updateLinkRow(
    rows: string[],
    setRows: (value: string[]) => void,
    index: number,
    value: string,
  ) {
    const next = [...rows];
    next[index] = value;
    setRows(next);
  }

  function addLinkRow(rows: string[], setRows: (value: string[]) => void) {
    setRows([...rows, emptyLinkRow()]);
  }

  function toggleCandidate(id: string) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('organization')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === 'organization'
              ? 'bg-cyan-600 text-white'
              : 'border border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Organization
        </button>
        <button
          type="button"
          onClick={() => setMode('person')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === 'person'
              ? 'bg-cyan-600 text-white'
              : 'border border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Person
        </button>
      </div>

      {mode === 'organization' ? (
        <>
          <h2 className="mt-5 text-lg font-semibold text-white">Find your org landing pad</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Enter your org website, name, or slug. We may open a request page for other valid websites.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Your pad URL looks like{' '}
            <span className="font-mono text-slate-300">{padPublicBase()}/pad/your-org-name</span>{' '}
            (hyphens optional).
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={handleOrgSubmit}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="pad-org-lookup" className="sr-only">
                Organization website, name, or slug
              </label>
              <input
                id="pad-org-lookup"
                type="text"
                value={orgInput}
                onChange={(event) => {
                  setOrgInput(event.target.value);
                  if (orgError) setOrgError(null);
                  if (orgHint) setOrgHint(null);
                }}
                placeholder="e.g. consumerreports.org or Project Liberty"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                autoComplete="organization"
              />
              {orgHint ? <p className="mt-2 text-sm text-cyan-300">{orgHint}</p> : null}
              {orgError ? <p className="mt-2 text-sm text-amber-300">{orgError}</p> : null}
            </div>
            <button
              type="submit"
              disabled={!orgInput.trim() || orgLookupBusy}
              className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {orgLookupBusy ? 'Looking up…' : 'Go'}
            </button>
          </form>
        </>
      ) : personStep === 'candidates' ? (
        <>
          <h2 className="mt-5 text-lg font-semibold text-white">Which public work should we consider?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This is not a score or ranking. Check the items you want on your pad. We search local
            perspectives, PCI threads, roster org sites, and public metadata from your work links. We
            never scrape LinkedIn.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleCreatePersonPad}>
            {candidates.length ? (
              <ul className="space-y-3">
                {candidates.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.has(row.id)}
                        onChange={() => toggleCandidate(row.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-white">{row.title}</span>
                        <span className="mt-1 block text-xs uppercase tracking-wide text-slate-500">
                          {row.source}
                        </span>
                        <span className="mt-1 block text-slate-400">{row.snippet}</span>
                        {row.url.startsWith('http') || row.url.startsWith('/') ? (
                          <span className="mt-1 block break-all font-mono text-xs text-slate-500">
                            {row.url}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No corpus matches found. Your submitted links and pasted text will still be saved.
              </p>
            )}

            {personError ? <p className="text-sm text-amber-300">{personError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPersonStep('form')}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
              >
                Back to form
              </button>
              <button
                type="submit"
                disabled={personBusy}
                className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {personBusy ? 'Creating pad…' : 'Create my pad'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2 className="mt-5 text-lg font-semibold text-white">Create your person landing pad</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Start from your public profile and published work. This is not a score or ranking. You
            choose what we consider before we build your pad.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Your pad URL looks like{' '}
            <span className="font-mono text-slate-300">
              {padPublicBase()}/pad/person/your-name
            </span>
            .
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleFindPublicWork}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pad-person-linkedin" className="block text-sm text-slate-300">
                  LinkedIn profile URL
                </label>
                <input
                  id="pad-person-linkedin"
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  placeholder="https://linkedin.com/in/your-handle"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>
              <div>
                <label htmlFor="pad-person-cv" className="block text-sm text-slate-300">
                  CV / resume URL
                </label>
                <input
                  id="pad-person-cv"
                  type="url"
                  value={cvUrl}
                  onChange={(event) => setCvUrl(event.target.value)}
                  placeholder="https://yoursite.com/cv.pdf"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pad-person-name" className="block text-sm text-slate-300">
                  Your name (if no LinkedIn URL)
                </label>
                <input
                  id="pad-person-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>
              <div>
                <label htmlFor="pad-person-org" className="block text-sm text-slate-300">
                  Organization (optional)
                </label>
                <input
                  id="pad-person-org"
                  type="text"
                  value={orgAffiliation}
                  onChange={(event) => setOrgAffiliation(event.target.value)}
                  placeholder="Project Liberty Institute"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>

            <fieldset>
              <legend className="text-sm text-slate-300">Links to work (optional)</legend>
              <div className="mt-2 space-y-2">
                {workLinks.map((row, index) => (
                  <input
                    key={`work-${index}`}
                    type="url"
                    value={row}
                    onChange={(event) => updateLinkRow(workLinks, setWorkLinks, index, event.target.value)}
                    placeholder="https://example.com/your-paper"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLinkRow(workLinks, setWorkLinks)}
                className="mt-2 text-sm text-cyan-400 hover:text-cyan-200"
              >
                + Add work link
              </button>
            </fieldset>

            <fieldset>
              <legend className="text-sm text-slate-300">Perspective links (optional)</legend>
              <div className="mt-2 space-y-2">
                {perspectiveLinks.map((row, index) => (
                  <input
                    key={`perspective-${index}`}
                    type="text"
                    value={row}
                    onChange={(event) =>
                      updateLinkRow(perspectiveLinks, setPerspectiveLinks, index, event.target.value)
                    }
                    placeholder="/perspectives/a-fork-in-the-web"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLinkRow(perspectiveLinks, setPerspectiveLinks)}
                className="mt-2 text-sm text-cyan-400 hover:text-cyan-200"
              >
                + Add perspective link
              </button>
            </fieldset>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <button
                type="button"
                onClick={() => setShowPasteSection((value) => !value)}
                className="text-sm font-medium text-cyan-300 hover:text-cyan-100"
              >
                {showPasteSection ? 'Hide' : 'Add bio or CV if the link is private'}
              </button>
              {showPasteSection ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="pad-person-bio" className="block text-sm text-slate-300">
                      Short bio (optional)
                    </label>
                    <textarea
                      id="pad-person-bio"
                      value={bioText}
                      onChange={(event) => setBioText(event.target.value)}
                      rows={3}
                      placeholder="A few sentences about your work and interests"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="pad-person-paste" className="block text-sm text-slate-300">
                      Pasted profile text (optional)
                    </label>
                    <textarea
                      id="pad-person-paste"
                      value={profilePaste}
                      onChange={(event) => setProfilePaste(event.target.value)}
                      rows={5}
                      placeholder="Paste LinkedIn export, About section, or CV text"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="pad-person-papers" className="block text-sm text-slate-300">
                      Upload papers (PDF or Word, optional)
                    </label>
                    <input
                      id="pad-person-papers"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={(event) => setPapers(Array.from(event.target.files || []))}
                      className="mt-1 block w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-200"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {personError ? <p className="text-sm text-amber-300">{personError}</p> : null}

            <button
              type="submit"
              disabled={personBusy}
              className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {personBusy ? 'Searching…' : 'Find public work'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
