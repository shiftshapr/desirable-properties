'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import UserDateTime from '@/components/UserDateTime';
import { govhubUrl } from '@/lib/govhub';
import type { WorkgroupSignupsPayload } from '@/lib/workgroup-signups';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

type TabKey = 'workgroups' | 'people';

type Props = {
  data: WorkgroupSignupsPayload;
  collabEnabled: boolean;
};

function workgroupLink(slug: string, collabEnabled: boolean): string {
  return collabEnabled
    ? `/workgroups/${encodeURIComponent(slug)}`
    : govhubUrl(`/workgroups/${encodeURIComponent(slug)}/`);
}

export default function WorkgroupSignupsClient({ data, collabEnabled }: Props) {
  const [tab, setTab] = useState<TabKey>('workgroups');
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredWorkgroups = useMemo(() => {
    if (!normalizedQuery) return data.workgroups;
    return data.workgroups
      .map((group) => ({
        ...group,
        members: group.members.filter((member) =>
          (member.user_name || '').toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter(
        (group) =>
          group.name.toLowerCase().includes(normalizedQuery) ||
          group.slug.toLowerCase().includes(normalizedQuery) ||
          group.members.length > 0,
      );
  }, [data.workgroups, normalizedQuery]);

  const filteredPeople = useMemo(() => {
    if (!normalizedQuery) return data.people;
    return data.people.filter(
      (person) =>
        (person.user_name || '').toLowerCase().includes(normalizedQuery) ||
        person.workgroups.some(
          (group) =>
            group.name.toLowerCase().includes(normalizedQuery) ||
            group.slug.toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [data.people, normalizedQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Workgroups</p>
        <h1 className="mt-2 text-3xl font-bold text-white">DP workgroup signups</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Everyone who has joined a Desirable Properties workgroup on Gov Hub. Browse by workgroup
          or by person.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
          <span>
            <strong className="text-white">{data.total_people}</strong> people
          </span>
          <span>
            <strong className="text-white">{data.total_memberships}</strong> memberships across{' '}
            <strong className="text-white">{data.workgroups.length}</strong> workgroups
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-slate-700 bg-slate-900/60 p-1"
          role="tablist"
          aria-label="Signups view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'workgroups'}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              tab === 'workgroups'
                ? 'bg-cyan-700 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setTab('workgroups')}
          >
            By workgroup
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'people'}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              tab === 'people' ? 'bg-cyan-700 text-white' : 'text-slate-300 hover:text-white'
            }`}
            onClick={() => setTab('people')}
          >
            By person
          </button>
        </div>

        <label className="block w-full sm:max-w-xs">
          <span className="mb-1 block text-sm text-slate-400">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or workgroup…"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </label>
      </div>

      {tab === 'workgroups' ? (
        <div role="tabpanel" className="space-y-4">
          {filteredWorkgroups.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-6 text-slate-400">
              No workgroups match your search.
            </p>
          ) : (
            filteredWorkgroups.map((group) => (
              <section
                key={group.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
              >
                <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{group.name}</h2>
                    <p className="text-sm text-slate-400">
                      {group.member_count} member{group.member_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link
                    href={workgroupLink(group.slug, collabEnabled)}
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    {collabEnabled ? 'Collaborate →' : 'View on Gov Hub →'}
                  </Link>
                </div>
                {group.members.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-slate-500">No members yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {group.members.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-white">{member.user_name || 'Unknown member'}</span>
                        <span className="text-sm text-slate-400">
                          Joined <UserDateTime value={member.joined_at} mode="date" />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
      ) : (
        <div role="tabpanel" className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          {filteredPeople.length === 0 ? (
            <p className="px-4 py-6 text-slate-400">No people match your search.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {filteredPeople.map((person) => (
                <li key={person.user_id ?? person.user_name ?? 'unknown'} className="px-4 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {person.user_name || 'Unknown member'}
                      </p>
                      <p className="text-sm text-slate-400">
                        {person.workgroups.length} workgroup
                        {person.workgroups.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {person.workgroups.map((group) => (
                      <li
                        key={`${person.user_id ?? person.user_name}-${group.id}`}
                        className="flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <Link
                          href={workgroupLink(group.slug, collabEnabled)}
                          className="text-sm text-cyan-300 hover:text-cyan-200"
                        >
                          {group.name}
                        </Link>
                        <span className="text-xs text-slate-500">
                          Joined <UserDateTime value={group.joined_at} mode="date" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-8 text-sm text-slate-500">
        Want to join?{' '}
        <Link href={WORKGROUPS_LIST_HREF} className="text-cyan-300 hover:text-cyan-200">
          Browse workgroups
        </Link>
        .
      </p>
    </div>
  );
}
