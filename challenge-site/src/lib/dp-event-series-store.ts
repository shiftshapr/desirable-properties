import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import { FORK_SERIES_SLUG, FORK_SESSION_SEEDS } from '@/lib/dp-event-series-seed';

export type EventSeries = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  descriptionMd: string | null;
  heroImageUrl: string | null;
  perspectiveUrl: string | null;
  pathwayUrl: string | null;
  sessionsRequiredCount: number | null;
  badgeCode: string;
  pearlBadgeCode: string | null;
  badgeImageUrl: string | null;
  badgeMintPreviewUrl: string | null;
  pearlBadgeImageUrl: string | null;
  pearlBadgeMintPreviewUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type EventSeriesSession = {
  id: string;
  seriesId: string;
  sessionNumber: number;
  slug: string;
  title: string;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  liveUrl: string | null;
  facilitatorBlurbMd: string | null;
  perspectiveSectionAnchor: string | null;
  active: boolean;
  sortOrder: number;
};

export type EventSeriesPreRead = {
  id: string;
  sessionId: string;
  label: string;
  url: string;
  sortOrder: number;
};

export type EventSeriesQuestionSection = {
  id: string;
  sessionId: string;
  sectionKey: string;
  title: string;
  pearlStage: string | null;
  sortOrder: number;
  questions: EventSeriesQuestion[];
};

export type EventSeriesQuestion = {
  id: string;
  sectionId: string;
  fieldKey: string;
  label: string;
  helpText: string | null;
  fieldType: string;
  required: boolean;
  aiAssist: boolean;
  sortOrder: number;
};

export type EventSeriesResponse = {
  id: string;
  sessionId: string;
  userId: string;
  userEmail: string | null;
  attendedConfirmed: boolean;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  answers: EventSeriesAnswer[];
};

export type EventSeriesAnswer = {
  questionId: string;
  fieldKey: string;
  valueText: string | null;
  valueBool: boolean | null;
};

export type EventSeriesPearl = {
  id: string;
  seriesId: string;
  userId: string;
  userEmail: string | null;
  patchIdea: string | null;
  socializeUrl: string | null;
  socializeNote: string | null;
  feedbackSummary: string | null;
  feedbackFrom: string | null;
  patchVerified: boolean;
  patchVerifiedAt: string | null;
  patchVerifiedSource: string | null;
  patchGovhubProposalId: string | null;
  patchCanopiMessageId: string | null;
  patchVerifiedHref: string | null;
  patchLastCheckedAt: string | null;
  reflection: string | null;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  createdAt: string | null;
};

export type SeriesProgress = {
  totalSessions: number;
  requiredSessions: number;
  completedSessions: number;
  seriesBadgeEligible: boolean;
  seriesBadgeGranted: boolean;
  pearlBadgeGranted: boolean;
  sessionStatuses: Array<{
    sessionId: string;
    sessionNumber: number;
    slug: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'submitted';
    attendedConfirmed: boolean;
  }>;
};

function normStr(s: unknown, max = 8000) {
  return String(s ?? '').trim().slice(0, max);
}

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function seriesRow(row: Record<string, unknown>): EventSeries {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    descriptionMd: row.description_md ? String(row.description_md) : null,
    heroImageUrl: row.hero_image_url ? String(row.hero_image_url) : null,
    perspectiveUrl: row.perspective_url ? String(row.perspective_url) : null,
    pathwayUrl: row.pathway_url ? String(row.pathway_url) : null,
    sessionsRequiredCount:
      row.sessions_required_count == null ? null : Number(row.sessions_required_count),
    badgeCode: String(row.badge_code),
    pearlBadgeCode: row.pearl_badge_code ? String(row.pearl_badge_code) : null,
    badgeImageUrl: row.badge_image_url ? String(row.badge_image_url) : null,
    badgeMintPreviewUrl: row.badge_mint_preview_url ? String(row.badge_mint_preview_url) : null,
    pearlBadgeImageUrl: row.pearl_badge_image_url ? String(row.pearl_badge_image_url) : null,
    pearlBadgeMintPreviewUrl: row.pearl_badge_mint_preview_url
      ? String(row.pearl_badge_mint_preview_url)
      : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function sessionRow(row: Record<string, unknown>): EventSeriesSession {
  return {
    id: String(row.id),
    seriesId: String(row.series_id),
    sessionNumber: Number(row.session_number),
    slug: String(row.slug),
    title: String(row.title),
    imageUrl: row.image_url ? String(row.image_url) : null,
    startsAt: row.starts_at ? new Date(String(row.starts_at)).toISOString() : null,
    endsAt: row.ends_at ? new Date(String(row.ends_at)).toISOString() : null,
    liveUrl: row.live_url ? String(row.live_url) : null,
    facilitatorBlurbMd: row.facilitator_blurb_md ? String(row.facilitator_blurb_md) : null,
    perspectiveSectionAnchor: row.perspective_section_anchor
      ? String(row.perspective_section_anchor)
      : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function pearlRow(row: Record<string, unknown>): EventSeriesPearl {
  return {
    id: String(row.id),
    seriesId: String(row.series_id),
    userId: String(row.user_id),
    userEmail: row.user_email ? String(row.user_email) : null,
    patchIdea: row.patch_idea ? String(row.patch_idea) : null,
    socializeUrl: row.socialize_url ? String(row.socialize_url) : null,
    socializeNote: row.socialize_note ? String(row.socialize_note) : null,
    feedbackSummary: row.feedback_summary ? String(row.feedback_summary) : null,
    feedbackFrom: row.feedback_from ? String(row.feedback_from) : null,
    patchVerified: Boolean(row.patch_verified),
    patchVerifiedAt: row.patch_verified_at
      ? new Date(String(row.patch_verified_at)).toISOString()
      : null,
    patchVerifiedSource: row.patch_verified_source ? String(row.patch_verified_source) : null,
    patchGovhubProposalId: row.patch_govhub_proposal_id
      ? String(row.patch_govhub_proposal_id)
      : null,
    patchCanopiMessageId: row.patch_canopi_message_id
      ? String(row.patch_canopi_message_id)
      : null,
    patchVerifiedHref: row.patch_verified_href ? String(row.patch_verified_href) : null,
    patchLastCheckedAt: row.patch_last_checked_at
      ? new Date(String(row.patch_last_checked_at)).toISOString()
      : null,
    reflection: row.reflection ? String(row.reflection) : null,
    status: row.status === 'submitted' ? 'submitted' : 'draft',
    submittedAt: row.submitted_at ? new Date(String(row.submitted_at)).toISOString() : null,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
  };
}

async function seedForkSeriesIfMissing() {
  const pool = await ensureDpSchema();
  if (!pool) return;

  const existing = await pool.query('SELECT id FROM dp_event_series WHERE slug = $1', [
    FORK_SERIES_SLUG,
  ]);
  if (existing.rows.length > 0) return;

  const seriesId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO dp_event_series (
       id, slug, title, subtitle, description_md, hero_image_url,
       perspective_url, pathway_url, sessions_required_count,
       badge_code, pearl_badge_code, badge_image_url, active, sort_order,
       created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,0,'seed','seed')`,
    [
      seriesId,
      FORK_SERIES_SLUG,
      'Fork in the Web Workshops',
      'Will AI Mediate Reality — or Help Us Build a Human-Centered Internet?',
      'Four standalone online workshops exploring the second fork in the road: what kind of digital world exists when AI is everywhere.',
      '/images/perspectives/the-fork-in-the-web/the-fork-in-the-web-hero-draft.webp',
      '/perspectives/the-fork-in-the-web',
      '/pathways/ai-human-agency',
      4,
      'fork-ws-series',
      'fork-ws-series-pearl',
      '/images/perspectives/the-fork-in-the-web/the-fork-in-the-web-hero-draft.webp',
    ],
  );

  for (const sessionSeed of FORK_SESSION_SEEDS) {
    const sessionId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO dp_event_series_session (
         id, series_id, session_number, slug, title, image_url,
         facilitator_blurb_md, perspective_section_anchor, active, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,
      [
        sessionId,
        seriesId,
        sessionSeed.sessionNumber,
        sessionSeed.slug,
        sessionSeed.title,
        sessionSeed.imageUrl,
        sessionSeed.facilitatorBlurb,
        sessionSeed.perspectiveAnchor,
        sessionSeed.sessionNumber,
      ],
    );

    for (let i = 0; i < sessionSeed.preReads.length; i++) {
      const pr = sessionSeed.preReads[i];
      await pool.query(
        `INSERT INTO dp_event_series_pre_read (id, session_id, label, url, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [crypto.randomUUID(), sessionId, pr.label, pr.url, i],
      );
    }

    for (const dpId of sessionSeed.relatedDpIds) {
      await pool.query(
        `INSERT INTO dp_event_series_session_dp (session_id, dp_id) VALUES ($1,$2)`,
        [sessionId, dpId],
      );
    }

    for (let si = 0; si < sessionSeed.sections.length; si++) {
      const section = sessionSeed.sections[si];
      const sectionId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO dp_event_series_question_section (
           id, session_id, section_key, title, pearl_stage, sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [sectionId, sessionId, section.sectionKey, section.title, section.pearlStage, si],
      );

      for (let qi = 0; qi < section.questions.length; qi++) {
        const q = section.questions[qi];
        await pool.query(
          `INSERT INTO dp_event_series_question (
             id, section_id, field_key, label, help_text, field_type,
             required, ai_assist, sort_order
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            crypto.randomUUID(),
            sectionId,
            q.fieldKey,
            q.label,
            q.helpText || null,
            q.fieldType,
            Boolean(q.required),
            Boolean(q.aiAssist),
            qi,
          ],
        );
      }
    }
  }
}

export async function listEventSeries(activeOnly = false): Promise<EventSeries[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  await seedForkSeriesIfMissing();
  const res = await pool.query(
    `SELECT * FROM dp_event_series ${activeOnly ? 'WHERE active = true' : ''}
     ORDER BY sort_order ASC, updated_at DESC`,
  );
  return res.rows.map(seriesRow);
}

export async function getEventSeriesBySlug(slug: string): Promise<EventSeries | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  await seedForkSeriesIfMissing();
  const res = await pool.query('SELECT * FROM dp_event_series WHERE slug = $1', [slug]);
  return res.rows[0] ? seriesRow(res.rows[0]) : null;
}

export async function getEventSeriesById(id: string): Promise<EventSeries | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_event_series WHERE id = $1', [id]);
  return res.rows[0] ? seriesRow(res.rows[0]) : null;
}

export async function listSessionsForSeries(
  seriesId: string,
  activeOnly = true,
): Promise<EventSeriesSession[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query(
    `SELECT * FROM dp_event_series_session
     WHERE series_id = $1 ${activeOnly ? 'AND active = true' : ''}
     ORDER BY session_number ASC`,
    [seriesId],
  );
  return res.rows.map(sessionRow);
}

export async function getSessionBySeriesAndNumber(
  seriesId: string,
  sessionNumber: number,
): Promise<EventSeriesSession | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query(
    'SELECT * FROM dp_event_series_session WHERE series_id = $1 AND session_number = $2',
    [seriesId, sessionNumber],
  );
  return res.rows[0] ? sessionRow(res.rows[0]) : null;
}

export async function getSessionById(sessionId: string): Promise<EventSeriesSession | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_event_series_session WHERE id = $1', [sessionId]);
  return res.rows[0] ? sessionRow(res.rows[0]) : null;
}

export async function listPreReads(sessionId: string): Promise<EventSeriesPreRead[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query(
    'SELECT * FROM dp_event_series_pre_read WHERE session_id = $1 ORDER BY sort_order ASC',
    [sessionId],
  );
  return res.rows.map((row) => ({
    id: String(row.id),
    sessionId: String(row.session_id),
    label: String(row.label),
    url: String(row.url),
    sortOrder: Number(row.sort_order) || 0,
  }));
}

export async function listRelatedDps(sessionId: string): Promise<string[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query(
    'SELECT dp_id FROM dp_event_series_session_dp WHERE session_id = $1 ORDER BY dp_id',
    [sessionId],
  );
  return res.rows.map((r) => String(r.dp_id));
}

export async function listQuestionSectionsForSession(
  sessionId: string,
): Promise<EventSeriesQuestionSection[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const sectionsRes = await pool.query(
    `SELECT * FROM dp_event_series_question_section
     WHERE session_id = $1 ORDER BY sort_order ASC`,
    [sessionId],
  );
  const sections: EventSeriesQuestionSection[] = [];
  for (const sRow of sectionsRes.rows) {
    const qRes = await pool.query(
      `SELECT * FROM dp_event_series_question
       WHERE section_id = $1 ORDER BY sort_order ASC`,
      [sRow.id],
    );
    sections.push({
      id: String(sRow.id),
      sessionId: String(sRow.session_id),
      sectionKey: String(sRow.section_key),
      title: String(sRow.title),
      pearlStage: sRow.pearl_stage ? String(sRow.pearl_stage) : null,
      sortOrder: Number(sRow.sort_order) || 0,
      questions: qRes.rows.map((q) => ({
        id: String(q.id),
        sectionId: String(q.section_id),
        fieldKey: String(q.field_key),
        label: String(q.label),
        helpText: q.help_text ? String(q.help_text) : null,
        fieldType: String(q.field_type),
        required: Boolean(q.required),
        aiAssist: Boolean(q.ai_assist),
        sortOrder: Number(q.sort_order) || 0,
      })),
    });
  }
  return sections;
}

export async function getOrCreateResponse(
  sessionId: string,
  userId: string,
  userEmail: string | null,
): Promise<EventSeriesResponse | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;

  let res = await pool.query(
    'SELECT * FROM dp_event_series_response WHERE session_id = $1 AND user_id = $2',
    [sessionId, userId],
  );
  if (!res.rows[0]) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO dp_event_series_response (id, session_id, user_id, user_email)
       VALUES ($1,$2,$3,$4)`,
      [id, sessionId, userId, userEmail],
    );
    res = await pool.query('SELECT * FROM dp_event_series_response WHERE id = $1', [id]);
  }

  const answersRes = await pool.query(
    `SELECT a.*, q.field_key FROM dp_event_series_answer a
     JOIN dp_event_series_question q ON q.id = a.question_id
     WHERE a.response_id = $1`,
    [res.rows[0].id],
  );

  return {
    id: String(res.rows[0].id),
    sessionId: String(res.rows[0].session_id),
    userId: String(res.rows[0].user_id),
    userEmail: res.rows[0].user_email ? String(res.rows[0].user_email) : null,
    attendedConfirmed: Boolean(res.rows[0].attended_confirmed),
    status: res.rows[0].status === 'submitted' ? 'submitted' : 'draft',
    submittedAt: res.rows[0].submitted_at
      ? new Date(String(res.rows[0].submitted_at)).toISOString()
      : null,
    answers: answersRes.rows.map((a) => ({
      questionId: String(a.question_id),
      fieldKey: String(a.field_key),
      valueText: a.value_text != null ? String(a.value_text) : null,
      valueBool: a.value_bool == null ? null : Boolean(a.value_bool),
    })),
  };
}

export async function saveResponseAnswers(input: {
  sessionId: string;
  userId: string;
  userEmail: string | null;
  attendedConfirmed?: boolean;
  answers: Array<{ questionId: string; valueText?: string | null; valueBool?: boolean | null }>;
  submit?: boolean;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const response = await getOrCreateResponse(input.sessionId, input.userId, input.userEmail);
  if (!response) return { ok: false as const, error: 'response_failed' };

  if (input.attendedConfirmed !== undefined) {
    await pool.query(
      `UPDATE dp_event_series_response SET attended_confirmed = $2, updated_at = now()
       WHERE id = $1`,
      [response.id, Boolean(input.attendedConfirmed)],
    );
  }

  for (const answer of input.answers) {
    await pool.query(
      `INSERT INTO dp_event_series_answer (id, response_id, question_id, value_text, value_bool, updated_at)
       VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (response_id, question_id) DO UPDATE SET
         value_text = EXCLUDED.value_text,
         value_bool = EXCLUDED.value_bool,
         updated_at = now()`,
      [
        crypto.randomUUID(),
        response.id,
        answer.questionId,
        answer.valueText ?? null,
        answer.valueBool ?? null,
      ],
    );
  }

  if (input.submit) {
    await pool.query(
      `UPDATE dp_event_series_response SET status = 'submitted', submitted_at = now(), updated_at = now()
       WHERE id = $1`,
      [response.id],
    );
    const session = await getSessionById(input.sessionId);
    if (session) {
      await maybeGrantSeriesBadge(session.seriesId, input.userId);
    }
  }

  const updated = await getOrCreateResponse(input.sessionId, input.userId, input.userEmail);
  return { ok: true as const, response: updated };
}

export async function getOrCreatePearl(
  seriesId: string,
  userId: string,
  userEmail: string | null,
): Promise<EventSeriesPearl | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;

  let res = await pool.query(
    'SELECT * FROM dp_event_series_pearl WHERE series_id = $1 AND user_id = $2',
    [seriesId, userId],
  );
  if (!res.rows[0]) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO dp_event_series_pearl (id, series_id, user_id, user_email)
       VALUES ($1,$2,$3,$4)`,
      [id, seriesId, userId, userEmail],
    );
    res = await pool.query('SELECT * FROM dp_event_series_pearl WHERE id = $1', [id]);
  }
  return pearlRow(res.rows[0]);
}

export async function savePearl(input: {
  seriesId: string;
  userId: string;
  userEmail: string | null;
  patchIdea?: string | null;
  socializeUrl?: string | null;
  socializeNote?: string | null;
  feedbackSummary?: string | null;
  feedbackFrom?: string | null;
  reflection?: string | null;
  submit?: boolean;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const pearl = await getOrCreatePearl(input.seriesId, input.userId, input.userEmail);
  if (!pearl) return { ok: false as const, error: 'pearl_failed' };

  const fields: string[] = [];
  const values: unknown[] = [pearl.id];
  let idx = 2;

  const setField = (col: string, val: unknown) => {
    fields.push(`${col} = $${idx}`);
    values.push(val);
    idx += 1;
  };

  if (input.patchIdea !== undefined) setField('patch_idea', normStr(input.patchIdea) || null);
  if (input.socializeUrl !== undefined) setField('socialize_url', normStr(input.socializeUrl, 512) || null);
  if (input.socializeNote !== undefined) setField('socialize_note', normStr(input.socializeNote) || null);
  if (input.feedbackSummary !== undefined)
    setField('feedback_summary', normStr(input.feedbackSummary) || null);
  if (input.feedbackFrom !== undefined) setField('feedback_from', normStr(input.feedbackFrom, 80) || null);
  if (input.reflection !== undefined) setField('reflection', normStr(input.reflection) || null);

  if (fields.length) {
    fields.push('updated_at = now()');
    await pool.query(
      `UPDATE dp_event_series_pearl SET ${fields.join(', ')} WHERE id = $1`,
      values,
    );
  }

  if (input.submit) {
    const current = await getOrCreatePearl(input.seriesId, input.userId, input.userEmail);
    if (!current?.patchVerified) {
      return { ok: false as const, error: 'patch_not_verified' };
    }
    if (!normStr(current.patchIdea) || !normStr(current.feedbackSummary) || !normStr(current.reflection)) {
      return { ok: false as const, error: 'incomplete_pearl' };
    }
    await pool.query(
      `UPDATE dp_event_series_pearl SET status = 'submitted', submitted_at = now(), updated_at = now()
       WHERE id = $1`,
      [pearl.id],
    );
    await maybeGrantPearlBadge(input.seriesId, input.userId);
  }

  const updated = await getOrCreatePearl(input.seriesId, input.userId, input.userEmail);
  return { ok: true as const, pearl: updated };
}

export async function applyPatchVerification(
  pearlId: string,
  match: {
    source: 'govhub' | 'canopi';
    externalId: string;
    href: string;
    snippet?: string;
    createdAt?: string;
  },
) {
  const pool = await ensureDpSchema();
  if (!pool) return;

  await pool.query(
    `UPDATE dp_event_series_pearl SET
       patch_verified = true,
       patch_verified_at = now(),
       patch_verified_source = $2,
       patch_govhub_proposal_id = CASE WHEN $2 = 'govhub' THEN $3 ELSE patch_govhub_proposal_id END,
       patch_canopi_message_id = CASE WHEN $2 = 'canopi' THEN $3 ELSE patch_canopi_message_id END,
       patch_verified_href = $4,
       patch_last_checked_at = now(),
       updated_at = now()
     WHERE id = $1`,
    [pearlId, match.source, match.externalId, match.href],
  );

  await pool.query(
    `INSERT INTO dp_event_series_patch_lookup (
       id, pearl_id, source, external_id, href, snippet, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (pearl_id, source, external_id) DO NOTHING`,
    [
      crypto.randomUUID(),
      pearlId,
      match.source,
      match.externalId,
      match.href,
      match.snippet || null,
      match.createdAt ? new Date(match.createdAt) : new Date(),
    ],
  );
}

export async function touchPatchCheck(pearlId: string) {
  const pool = await ensureDpSchema();
  if (!pool) return;
  await pool.query(
    `UPDATE dp_event_series_pearl SET patch_last_checked_at = now(), updated_at = now() WHERE id = $1`,
    [pearlId],
  );
}

async function hasBadgeGrant(seriesId: string, userId: string, grantType: string) {
  const pool = await ensureDpSchema();
  if (!pool) return false;
  const res = await pool.query(
    `SELECT id FROM dp_event_series_badge_grant
     WHERE series_id = $1 AND user_id = $2 AND grant_type = $3 AND revoked_at IS NULL`,
    [seriesId, userId, grantType],
  );
  return res.rows.length > 0;
}

async function grantBadge(seriesId: string, userId: string, badgeCode: string, grantType: string) {
  const pool = await ensureDpSchema();
  if (!pool) return;
  await pool.query(
    `INSERT INTO dp_event_series_badge_grant (id, series_id, user_id, badge_code, grant_type)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (series_id, user_id, badge_code) DO UPDATE SET
       revoked_at = NULL, granted_at = now()`,
    [crypto.randomUUID(), seriesId, userId, badgeCode, grantType],
  );
}

export async function maybeGrantSeriesBadge(seriesId: string, userId: string) {
  const series = await getEventSeriesById(seriesId);
  if (!series) return;
  if (await hasBadgeGrant(seriesId, userId, 'series')) return;

  const sessions = await listSessionsForSeries(seriesId, true);
  const required = series.sessionsRequiredCount ?? sessions.length;
  let completed = 0;
  const pool = await ensureDpSchema();
  if (!pool) return;

  for (const session of sessions) {
    const res = await pool.query(
      `SELECT status, attended_confirmed FROM dp_event_series_response
       WHERE session_id = $1 AND user_id = $2`,
      [session.id, userId],
    );
    const row = res.rows[0];
    if (row?.status === 'submitted' && row.attended_confirmed) completed += 1;
  }

  if (completed >= required) {
    await grantBadge(seriesId, userId, series.badgeCode, 'series');
  }
}

export async function maybeGrantPearlBadge(seriesId: string, userId: string) {
  const series = await getEventSeriesById(seriesId);
  if (!series?.pearlBadgeCode) return;
  if (await hasBadgeGrant(seriesId, userId, 'pearl')) return;

  const pearl = await getOrCreatePearl(seriesId, userId, null);
  if (pearl?.status === 'submitted') {
    await grantBadge(seriesId, userId, series.pearlBadgeCode, 'pearl');
  }
}

export async function getSeriesProgress(seriesId: string, userId: string): Promise<SeriesProgress> {
  const series = await getEventSeriesById(seriesId);
  const sessions = await listSessionsForSeries(seriesId, true);
  const required = series?.sessionsRequiredCount ?? sessions.length;
  const pool = await ensureDpSchema();

  const sessionStatuses: SeriesProgress['sessionStatuses'] = [];
  let completed = 0;

  for (const session of sessions) {
    let status: 'not_started' | 'in_progress' | 'submitted' = 'not_started';
    let attendedConfirmed = false;
    if (pool) {
      const res = await pool.query(
        `SELECT status, attended_confirmed FROM dp_event_series_response
         WHERE session_id = $1 AND user_id = $2`,
        [session.id, userId],
      );
      const row = res.rows[0];
      if (row) {
        attendedConfirmed = Boolean(row.attended_confirmed);
        if (row.status === 'submitted' && attendedConfirmed) {
          status = 'submitted';
          completed += 1;
        } else {
          status = 'in_progress';
        }
      }
    }
    sessionStatuses.push({
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      slug: session.slug,
      title: session.title,
      status,
      attendedConfirmed,
    });
  }

  const seriesBadgeGranted = series
    ? await hasBadgeGrant(seriesId, userId, 'series')
    : false;
  const pearlBadgeGranted = series
    ? await hasBadgeGrant(seriesId, userId, 'pearl')
    : false;

  return {
    totalSessions: sessions.length,
    requiredSessions: required,
    completedSessions: completed,
    seriesBadgeEligible: completed >= required,
    seriesBadgeGranted,
    pearlBadgeGranted,
    sessionStatuses,
  };
}

// --- Admin CRUD ---

export async function createEventSeries(input: Record<string, unknown>, actor: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const title = normStr(input.title, 200);
  const slug = slugify(normStr(input.slug, 120) || title);
  const badgeCode = normStr(input.badgeCode, 80);
  if (!title || !slug || !badgeCode) return { ok: false as const, error: 'invalid_input' };

  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO dp_event_series (
         id, slug, title, subtitle, description_md, hero_image_url,
         perspective_url, pathway_url, sessions_required_count,
         badge_code, pearl_badge_code, badge_image_url, badge_mint_preview_url,
         pearl_badge_image_url, pearl_badge_mint_preview_url,
         active, sort_order, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)`,
      [
        id,
        slug,
        title,
        normStr(input.subtitle, 300) || null,
        normStr(input.descriptionMd, 12000) || null,
        normStr(input.heroImageUrl, 512) || null,
        normStr(input.perspectiveUrl, 512) || null,
        normStr(input.pathwayUrl, 512) || null,
        input.sessionsRequiredCount != null ? Number(input.sessionsRequiredCount) : null,
        badgeCode,
        normStr(input.pearlBadgeCode, 80) || null,
        normStr(input.badgeImageUrl, 512) || null,
        normStr(input.badgeMintPreviewUrl, 512) || null,
        normStr(input.pearlBadgeImageUrl, 512) || null,
        normStr(input.pearlBadgeMintPreviewUrl, 512) || null,
        input.active === false ? false : true,
        Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
        normStr(actor, 120),
      ],
    );
  } catch (err) {
    if (String(err).includes('dp_event_series_slug')) return { ok: false as const, error: 'slug_taken' };
    throw err;
  }
  return { ok: true as const, series: await getEventSeriesById(id) };
}

export async function updateEventSeries(id: string, input: Record<string, unknown>, actor: string) {
  const existing = await getEventSeriesById(id);
  if (!existing) return { ok: false as const, error: 'not_found' };
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  await pool.query(
    `UPDATE dp_event_series SET
       slug = $2, title = $3, subtitle = $4, description_md = $5, hero_image_url = $6,
       perspective_url = $7, pathway_url = $8, sessions_required_count = $9,
       badge_code = $10, pearl_badge_code = $11, badge_image_url = $12,
       badge_mint_preview_url = $13, pearl_badge_image_url = $14,
       pearl_badge_mint_preview_url = $15, active = $16, sort_order = $17,
       updated_at = now(), updated_by = $18
     WHERE id = $1`,
    [
      id,
      input.slug != null ? slugify(normStr(input.slug, 120)) : existing.slug,
      input.title != null ? normStr(input.title, 200) : existing.title,
      input.subtitle !== undefined ? normStr(input.subtitle, 300) || null : existing.subtitle,
      input.descriptionMd !== undefined
        ? normStr(input.descriptionMd, 12000) || null
        : existing.descriptionMd,
      input.heroImageUrl !== undefined
        ? normStr(input.heroImageUrl, 512) || null
        : existing.heroImageUrl,
      input.perspectiveUrl !== undefined
        ? normStr(input.perspectiveUrl, 512) || null
        : existing.perspectiveUrl,
      input.pathwayUrl !== undefined ? normStr(input.pathwayUrl, 512) || null : existing.pathwayUrl,
      input.sessionsRequiredCount !== undefined
        ? input.sessionsRequiredCount == null
          ? null
          : Number(input.sessionsRequiredCount)
        : existing.sessionsRequiredCount,
      input.badgeCode != null ? normStr(input.badgeCode, 80) : existing.badgeCode,
      input.pearlBadgeCode !== undefined
        ? normStr(input.pearlBadgeCode, 80) || null
        : existing.pearlBadgeCode,
      input.badgeImageUrl !== undefined
        ? normStr(input.badgeImageUrl, 512) || null
        : existing.badgeImageUrl,
      input.badgeMintPreviewUrl !== undefined
        ? normStr(input.badgeMintPreviewUrl, 512) || null
        : existing.badgeMintPreviewUrl,
      input.pearlBadgeImageUrl !== undefined
        ? normStr(input.pearlBadgeImageUrl, 512) || null
        : existing.pearlBadgeImageUrl,
      input.pearlBadgeMintPreviewUrl !== undefined
        ? normStr(input.pearlBadgeMintPreviewUrl, 512) || null
        : existing.pearlBadgeMintPreviewUrl,
      input.active !== undefined ? Boolean(input.active) : existing.active,
      input.sortOrder !== undefined
        ? Number.isFinite(Number(input.sortOrder))
          ? Math.floor(Number(input.sortOrder))
          : existing.sortOrder
        : existing.sortOrder,
      normStr(actor, 120),
    ],
  );
  return { ok: true as const, series: await getEventSeriesById(id) };
}

export async function updateSession(
  sessionId: string,
  input: Record<string, unknown>,
  _actor: string,
) {
  const existing = await getSessionById(sessionId);
  if (!existing) return { ok: false as const, error: 'not_found' };
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  await pool.query(
    `UPDATE dp_event_series_session SET
       title = $2, image_url = $3, starts_at = $4, ends_at = $5, live_url = $6,
       facilitator_blurb_md = $7, active = $8, updated_at = now()
     WHERE id = $1`,
    [
      sessionId,
      input.title != null ? normStr(input.title, 300) : existing.title,
      input.imageUrl !== undefined ? normStr(input.imageUrl, 512) || null : existing.imageUrl,
      input.startsAt !== undefined
        ? input.startsAt
          ? new Date(String(input.startsAt)).toISOString()
          : null
        : existing.startsAt,
      input.endsAt !== undefined
        ? input.endsAt
          ? new Date(String(input.endsAt)).toISOString()
          : null
        : existing.endsAt,
      input.liveUrl !== undefined ? normStr(input.liveUrl, 512) || null : existing.liveUrl,
      input.facilitatorBlurbMd !== undefined
        ? normStr(input.facilitatorBlurbMd, 4000) || null
        : existing.facilitatorBlurbMd,
      input.active !== undefined ? Boolean(input.active) : existing.active,
    ],
  );
  return { ok: true as const, session: await getSessionById(sessionId) };
}

export async function adminSetPatchVerified(pearlId: string, verified: boolean) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  await pool.query(
    `UPDATE dp_event_series_pearl SET
       patch_verified = $2,
       patch_verified_at = CASE WHEN $2 THEN now() ELSE NULL END,
       patch_verified_source = CASE WHEN $2 THEN COALESCE(patch_verified_source, 'admin') ELSE NULL END,
       updated_at = now()
     WHERE id = $1`,
    [pearlId, verified],
  );
  return { ok: true as const };
}

export type AdminSessionDetail = EventSeriesSession & {
  preReads: EventSeriesPreRead[];
  relatedDpIds: string[];
  sections: EventSeriesQuestionSection[];
};

export async function getAdminSessionDetail(sessionId: string): Promise<AdminSessionDetail | null> {
  const session = await getSessionById(sessionId);
  if (!session) return null;
  const [preReads, relatedDpIds, sections] = await Promise.all([
    listPreReads(sessionId),
    listRelatedDps(sessionId),
    listQuestionSectionsForSession(sessionId),
  ]);
  return { ...session, preReads, relatedDpIds, sections };
}

export async function createQuestionSection(input: {
  sessionId: string;
  sectionKey: string;
  title: string;
  pearlStage?: string | null;
  sortOrder?: number;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const sessionId = normStr(input.sessionId, 80);
  const sectionKey = slugify(normStr(input.sectionKey, 80));
  const title = normStr(input.title, 200);
  if (!sessionId || !sectionKey || !title) return { ok: false as const, error: 'invalid_input' };

  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO dp_event_series_question_section (
         id, session_id, section_key, title, pearl_stage, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        sessionId,
        sectionKey,
        title,
        normStr(input.pearlStage, 40) || null,
        Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
      ],
    );
  } catch (err) {
    if (String(err).includes('dp_event_series_question_section')) {
      return { ok: false as const, error: 'section_key_taken' };
    }
    throw err;
  }
  const sections = await listQuestionSectionsForSession(sessionId);
  const section = sections.find((s) => s.id === id) || null;
  return { ok: true as const, section };
}

export async function updateQuestionSection(
  sectionId: string,
  input: Record<string, unknown>,
) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query(
    'SELECT * FROM dp_event_series_question_section WHERE id = $1',
    [sectionId],
  );
  if (!res.rows[0]) return { ok: false as const, error: 'not_found' };
  const existing = res.rows[0];

  await pool.query(
    `UPDATE dp_event_series_question_section SET
       section_key = $2, title = $3, pearl_stage = $4, sort_order = $5
     WHERE id = $1`,
    [
      sectionId,
      input.sectionKey != null ? slugify(normStr(input.sectionKey, 80)) : String(existing.section_key),
      input.title != null ? normStr(input.title, 200) : String(existing.title),
      input.pearlStage !== undefined
        ? normStr(input.pearlStage, 40) || null
        : existing.pearl_stage,
      input.sortOrder !== undefined
        ? Number.isFinite(Number(input.sortOrder))
          ? Math.floor(Number(input.sortOrder))
          : Number(existing.sort_order)
        : Number(existing.sort_order),
    ],
  );
  const sections = await listQuestionSectionsForSession(String(existing.session_id));
  return { ok: true as const, section: sections.find((s) => s.id === sectionId) || null };
}

export async function deleteQuestionSection(sectionId: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query(
    'DELETE FROM dp_event_series_question_section WHERE id = $1 RETURNING id',
    [sectionId],
  );
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id: sectionId };
}

export async function createQuestion(input: {
  sectionId: string;
  fieldKey: string;
  label: string;
  helpText?: string | null;
  fieldType: string;
  required?: boolean;
  aiAssist?: boolean;
  sortOrder?: number;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const sectionId = normStr(input.sectionId, 80);
  const fieldKey = slugify(normStr(input.fieldKey, 80));
  const label = normStr(input.label, 500);
  const fieldType = normStr(input.fieldType, 40) || 'textarea';
  if (!sectionId || !fieldKey || !label) return { ok: false as const, error: 'invalid_input' };

  const allowed = new Set(['checkbox', 'textarea', 'dp_hook', 'select']);
  if (!allowed.has(fieldType)) return { ok: false as const, error: 'invalid_field_type' };

  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO dp_event_series_question (
         id, section_id, field_key, label, help_text, field_type,
         required, ai_assist, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        sectionId,
        fieldKey,
        label,
        normStr(input.helpText, 1000) || null,
        fieldType,
        Boolean(input.required),
        Boolean(input.aiAssist),
        Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
      ],
    );
  } catch (err) {
    if (String(err).includes('dp_event_series_question')) {
      return { ok: false as const, error: 'field_key_taken' };
    }
    throw err;
  }

  const secRes = await pool.query(
    'SELECT session_id FROM dp_event_series_question_section WHERE id = $1',
    [sectionId],
  );
  const sessionId = String(secRes.rows[0]?.session_id || '');
  const sections = sessionId ? await listQuestionSectionsForSession(sessionId) : [];
  const question =
    sections.flatMap((s) => s.questions).find((q) => q.id === id) || null;
  return { ok: true as const, question };
}

export async function updateQuestion(questionId: string, input: Record<string, unknown>) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('SELECT * FROM dp_event_series_question WHERE id = $1', [
    questionId,
  ]);
  if (!res.rows[0]) return { ok: false as const, error: 'not_found' };
  const existing = res.rows[0];

  const fieldType =
    input.fieldType != null ? normStr(input.fieldType, 40) : String(existing.field_type);
  const allowed = new Set(['checkbox', 'textarea', 'dp_hook', 'select']);
  if (!allowed.has(fieldType)) return { ok: false as const, error: 'invalid_field_type' };

  await pool.query(
    `UPDATE dp_event_series_question SET
       field_key = $2, label = $3, help_text = $4, field_type = $5,
       required = $6, ai_assist = $7, sort_order = $8
     WHERE id = $1`,
    [
      questionId,
      input.fieldKey != null ? slugify(normStr(input.fieldKey, 80)) : String(existing.field_key),
      input.label != null ? normStr(input.label, 500) : String(existing.label),
      input.helpText !== undefined
        ? normStr(input.helpText, 1000) || null
        : existing.help_text,
      fieldType,
      input.required !== undefined ? Boolean(input.required) : Boolean(existing.required),
      input.aiAssist !== undefined ? Boolean(input.aiAssist) : Boolean(existing.ai_assist),
      input.sortOrder !== undefined
        ? Number.isFinite(Number(input.sortOrder))
          ? Math.floor(Number(input.sortOrder))
          : Number(existing.sort_order)
        : Number(existing.sort_order),
    ],
  );

  const secRes = await pool.query(
    'SELECT session_id FROM dp_event_series_question_section WHERE id = $1',
    [existing.section_id],
  );
  const sessionId = String(secRes.rows[0]?.session_id || '');
  const sections = sessionId ? await listQuestionSectionsForSession(sessionId) : [];
  const question =
    sections.flatMap((s) => s.questions).find((q) => q.id === questionId) || null;
  return { ok: true as const, question };
}

export async function deleteQuestion(questionId: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query(
    'DELETE FROM dp_event_series_question WHERE id = $1 RETURNING id',
    [questionId],
  );
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id: questionId };
}

export async function createPreRead(input: {
  sessionId: string;
  label: string;
  url: string;
  sortOrder?: number;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const sessionId = normStr(input.sessionId, 80);
  const label = normStr(input.label, 200);
  const url = normStr(input.url, 512);
  if (!sessionId || !label || !url) return { ok: false as const, error: 'invalid_input' };

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO dp_event_series_pre_read (id, session_id, label, url, sort_order)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      id,
      sessionId,
      label,
      url,
      Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
    ],
  );
  const preReads = await listPreReads(sessionId);
  return { ok: true as const, preRead: preReads.find((p) => p.id === id) || null };
}

export async function updatePreRead(preReadId: string, input: Record<string, unknown>) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('SELECT * FROM dp_event_series_pre_read WHERE id = $1', [
    preReadId,
  ]);
  if (!res.rows[0]) return { ok: false as const, error: 'not_found' };
  const existing = res.rows[0];

  await pool.query(
    `UPDATE dp_event_series_pre_read SET label = $2, url = $3, sort_order = $4 WHERE id = $1`,
    [
      preReadId,
      input.label != null ? normStr(input.label, 200) : String(existing.label),
      input.url != null ? normStr(input.url, 512) : String(existing.url),
      input.sortOrder !== undefined
        ? Number.isFinite(Number(input.sortOrder))
          ? Math.floor(Number(input.sortOrder))
          : Number(existing.sort_order)
        : Number(existing.sort_order),
    ],
  );
  const preReads = await listPreReads(String(existing.session_id));
  return { ok: true as const, preRead: preReads.find((p) => p.id === preReadId) || null };
}

export async function deletePreRead(preReadId: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query(
    'DELETE FROM dp_event_series_pre_read WHERE id = $1 RETURNING id',
    [preReadId],
  );
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id: preReadId };
}

export async function setSessionRelatedDps(sessionId: string, dpIds: string[]) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const normalized = [...new Set(dpIds.map((d) => normStr(d, 20).toUpperCase()).filter(Boolean))];
  await pool.query('DELETE FROM dp_event_series_session_dp WHERE session_id = $1', [sessionId]);
  for (const dpId of normalized) {
    await pool.query(
      'INSERT INTO dp_event_series_session_dp (session_id, dp_id) VALUES ($1,$2)',
      [sessionId, dpId],
    );
  }
  return { ok: true as const, relatedDpIds: normalized };
}
