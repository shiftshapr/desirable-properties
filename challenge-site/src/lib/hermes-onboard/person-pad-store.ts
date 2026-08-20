import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureDpSchema } from '@/lib/dp-db';
import { parsePerspectiveLinks } from '@/lib/hermes-onboard/person-perspectives';
import {
  buildPersonPadHref,
  resolvePersonPadSlug,
  validatePersonPadCreateInput,
  type PersonPadCreateInput,
  type PersonPadSelectedSource,
} from '@/lib/hermes-onboard/person-pad-lookup';

const DATA_DIR = path.join(process.cwd(), 'data', 'hermes-person-pad');

export type PersonPadUploadedDoc = {
  id: string;
  filename: string;
  mime: string;
  size: number;
};

export type PersonPadRecord = {
  slug: string;
  displayName: string;
  linkedinUrl: string | null;
  cvUrl: string | null;
  workLinks: string[];
  perspectiveLinks: ReturnType<typeof parsePerspectiveLinks>;
  uploadedDocs: PersonPadUploadedDoc[];
  bioText: string | null;
  profilePaste: string | null;
  selectedSources: PersonPadSelectedSource[];
  createdAt: string;
  updatedAt: string;
};

function filePath(slug: string): string {
  return path.join(DATA_DIR, `${slug}.json`);
}

function readFileRecord(slug: string): PersonPadRecord | null {
  try {
    const raw = fs.readFileSync(filePath(slug), 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersonPadRecord>;
    return {
      slug: String(parsed.slug || slug),
      displayName: String(parsed.displayName || slug),
      linkedinUrl: parsed.linkedinUrl ?? null,
      cvUrl: parsed.cvUrl ?? null,
      workLinks: Array.isArray(parsed.workLinks) ? parsed.workLinks : [],
      perspectiveLinks: Array.isArray(parsed.perspectiveLinks)
        ? parsed.perspectiveLinks.map((row) =>
            typeof row === 'string' ? parsePerspectiveLinks([row])[0] : row,
          )
        : [],
      uploadedDocs: Array.isArray(parsed.uploadedDocs) ? parsed.uploadedDocs : [],
      bioText: parsed.bioText ?? null,
      profilePaste: parsed.profilePaste ?? null,
      selectedSources: Array.isArray(parsed.selectedSources) ? parsed.selectedSources : [],
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeFileRecord(record: PersonPadRecord): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(record.slug), `${JSON.stringify(record, null, 2)}\n`);
}

function rowToRecord(row: Record<string, unknown>): PersonPadRecord {
  return {
    slug: String(row.slug),
    displayName: String(row.display_name || row.slug),
    linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : null,
    cvUrl: row.cv_url ? String(row.cv_url) : null,
    workLinks: Array.isArray(row.work_links) ? (row.work_links as string[]) : [],
    perspectiveLinks: parsePerspectiveLinks(
      Array.isArray(row.perspective_links) ? (row.perspective_links as string[]) : [],
    ),
    uploadedDocs: Array.isArray(row.uploaded_docs) ? (row.uploaded_docs as PersonPadUploadedDoc[]) : [],
    bioText: row.bio_text ? String(row.bio_text) : null,
    profilePaste: row.profile_paste ? String(row.profile_paste) : null,
    selectedSources: Array.isArray(row.selected_sources)
      ? (row.selected_sources as PersonPadSelectedSource[])
      : [],
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  };
}

function displayNameFromInput(input: PersonPadCreateInput, slug: string): string {
  const explicit = input.displayName?.trim();
  if (explicit) return explicit;
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let counter = 2;
  while (await loadPersonPad(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
    if (counter > 50) {
      candidate = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
      break;
    }
  }
  return candidate;
}

export async function loadPersonPad(slug: string): Promise<PersonPadRecord | null> {
  const pool = await ensureDpSchema();
  if (pool) {
    const result = await pool.query('SELECT * FROM hermes_person_pad WHERE slug = $1', [slug]);
    if (result.rows[0]) return rowToRecord(result.rows[0] as Record<string, unknown>);
    return null;
  }
  return readFileRecord(slug);
}

export async function savePersonPad(record: PersonPadRecord): Promise<PersonPadRecord> {
  const next = { ...record, updatedAt: new Date().toISOString() };
  const pool = await ensureDpSchema();
  if (pool) {
    await pool.query(
      `INSERT INTO hermes_person_pad (
        slug, display_name, linkedin_url, cv_url, work_links, perspective_links, uploaded_docs,
        bio_text, profile_paste, selected_sources, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (slug) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        linkedin_url = EXCLUDED.linkedin_url,
        cv_url = EXCLUDED.cv_url,
        work_links = EXCLUDED.work_links,
        perspective_links = EXCLUDED.perspective_links,
        uploaded_docs = EXCLUDED.uploaded_docs,
        bio_text = EXCLUDED.bio_text,
        profile_paste = EXCLUDED.profile_paste,
        selected_sources = EXCLUDED.selected_sources,
        updated_at = EXCLUDED.updated_at`,
      [
        next.slug,
        next.displayName,
        next.linkedinUrl,
        next.cvUrl,
        next.workLinks,
        next.perspectiveLinks.map((row) => row.raw),
        next.uploadedDocs,
        next.bioText,
        next.profilePaste,
        next.selectedSources,
        next.createdAt,
        next.updatedAt,
      ],
    );
    return next;
  }
  writeFileRecord(next);
  return next;
}

export async function createPersonPad(
  input: PersonPadCreateInput,
  uploadedDocs: PersonPadUploadedDoc[] = [],
): Promise<{ record: PersonPadRecord; href: string; created: boolean }> {
  const validation = validatePersonPadCreateInput(input);
  if (!validation.ok) {
    throw new Error(validation.error || 'Invalid person pad input');
  }

  const baseSlug = resolvePersonPadSlug(input);
  if (!baseSlug) {
    throw new Error('Could not derive a pad slug from your input.');
  }

  const existing = await loadPersonPad(baseSlug);
  const slug = existing ? baseSlug : await uniqueSlug(baseSlug);
  const now = new Date().toISOString();

  const linkedinUrl = input.linkedinUrl?.trim() || null;
  const cvUrl = input.cvUrl?.trim() || null;
  const workLinks = Array.isArray(input.workLinks)
    ? input.workLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];
  const perspectiveRaw = Array.isArray(input.perspectiveLinks)
    ? input.perspectiveLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];
  const bioText = input.bioText?.trim() || null;
  const profilePaste = input.profilePaste?.trim() || null;
  const selectedSources = Array.isArray(input.selectedSources)
    ? input.selectedSources.filter((row) => row && row.id && row.url)
    : existing?.selectedSources || [];

  const record: PersonPadRecord = {
    slug,
    displayName: displayNameFromInput(input, slug),
    linkedinUrl,
    cvUrl,
    workLinks,
    perspectiveLinks: parsePerspectiveLinks(perspectiveRaw),
    uploadedDocs: uploadedDocs.length
      ? [...(existing?.uploadedDocs || []), ...uploadedDocs]
      : existing?.uploadedDocs || [],
    bioText: bioText ?? existing?.bioText ?? null,
    profilePaste: profilePaste ?? existing?.profilePaste ?? null,
    selectedSources: selectedSources.length ? selectedSources : existing?.selectedSources || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await savePersonPad(record);
  return { record, href: buildPersonPadHref(slug), created: !existing };
}

export type PersonPadPublicPayload = PersonPadRecord;

export function personPadPublicPayload(record: PersonPadRecord): PersonPadPublicPayload {
  return record;
}
