import type { ActivityFeedItem } from '@/lib/activity-feed';
import { isEmailLike, publicDisplayName } from '@/lib/public-display-name';
import type {
  WorkgroupSignupGroup,
  WorkgroupSignupPerson,
  WorkgroupSignupsPayload,
} from '@/lib/workgroup-signups';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

export type PublicOnchainPciEmail = {
  id: string;
  title: string;
  author?: string;
  date?: string;
};

export type PublicOnchainSubmission = {
  source_file: string;
  file_number?: number;
  title: string;
  author: string;
  dp_count: number;
};

/** Mask person names embedded in activity feed copy (defense in depth). */
export function maskActivityFeedItems(items: ActivityFeedItem[]): ActivityFeedItem[] {
  return items.map((item) => ({
    ...item,
    text: maskEmailsInFreeText(item.text),
  }));
}

/** Replace email-like tokens in pre-built activity strings. */
export function maskEmailsInFreeText(text: string): string {
  if (!text || !text.includes('@')) return text;
  return text.replace(
    /[^\s,;]+@[^\s,;]+\.[^\s,;]+/g,
    (match) => publicDisplayName(match),
  );
}

export function maskWorkgroupMessageAuthors(
  messages: WorkgroupMessage[],
): WorkgroupMessage[] {
  return messages.map((message) => ({
    ...message,
    author_name: publicDisplayName(message.author_name, { fallback: 'Member' }),
  }));
}

export function toPublicWorkgroupSignupsPayload(
  data: WorkgroupSignupsPayload,
): WorkgroupSignupsPayload {
  return {
    ...data,
    workgroups: data.workgroups.map((group) => ({
      ...group,
      members: group.members.map((member) => ({
        ...member,
        user_name: publicDisplayName(member.user_name, { fallback: 'Unknown member' }),
      })),
    })),
    people: data.people.map((person) => ({
      ...person,
      user_name: publicDisplayName(person.user_name, { fallback: 'Unknown member' }),
    })),
  };
}

export function toPublicOnchainPciEmails(
  articles: Array<{ id: string; title: string; author?: string; date?: string }>,
): PublicOnchainPciEmail[] {
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    date: article.date,
    author: article.author
      ? publicDisplayName(article.author, { fallback: '–' })
      : undefined,
  }));
}

export function toPublicOnchainSubmissions(
  submissions: Array<{
    source_file: string;
    file_number?: number;
    title: string;
    author: string;
    email?: string;
    dp_count: number;
  }>,
): PublicOnchainSubmission[] {
  return submissions.map((submission) => ({
    source_file: submission.source_file,
    file_number: submission.file_number,
    title: submission.title,
    dp_count: submission.dp_count,
    author: publicDisplayName(submission.author, {
      alt: submission.email,
      fallback: 'Unknown',
    }),
  }));
}

/** Strip email-shaped string fields from arbitrary public JSON trees. */
export function stripEmailFieldsFromPublicPayload<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stripEmailFieldsFromPublicPayload(entry)) as T;
  }
  if (typeof value !== 'object') {
    if (typeof value === 'string' && isEmailLike(value)) return '' as T;
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/email/i.test(key)) continue;
    out[key] = stripEmailFieldsFromPublicPayload(entry);
  }
  return out as T;
}

export type { WorkgroupSignupGroup, WorkgroupSignupPerson };
