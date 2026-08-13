import desirableProperties from '@/data/desirable-properties.json';
import { getDpRegistryEntry } from '@/lib/dp-registry';

export type DpReferenceLink = {
  label: string;
  href: string;
};

export type DpReferenceSection = {
  number: string;
  title: string;
  excerpt: string;
};

export type DpReferenceInfo = {
  kind: 'dp-draft' | 'graph' | 'metaweb' | 'community' | 'generic';
  title: string;
  summary: string;
  details: string[];
  sections?: DpReferenceSection[];
  links?: DpReferenceLink[];
  sourceLabel: string;
};

const DP_NUM_RE = /\bDP\s*(\d{1,2})\b/i;
const SECTIONS_RE = /\bsections?\s+([\d.,\s]+)/i;

function normalizeDpId(raw: string | null): string | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return `DP${n}`;
}

export function parseDpNumberFromLabel(label: string): string | null {
  const match = String(label || '').match(DP_NUM_RE);
  return normalizeDpId(match?.[1] ?? null);
}

export function parseSectionNumbersFromLabel(label: string): string[] {
  const match = String(label || '').match(SECTIONS_RE);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+(?:\.\d+)*$/.test(s));
}

function getDpMarkdown(dpId: string): string | null {
  const dp = desirableProperties.desirable_properties.find(
    (entry) => entry.id.toUpperCase() === dpId.toUpperCase(),
  );
  return dp?.markdown ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match `## 3. Title` or `### 5.1 Title` for a section number from a pill label. */
function findSectionSnippet(markdown: string, sectionNum: string): DpReferenceSection | null {
  const num = sectionNum.trim();
  if (!num) return null;

  const lines = markdown.split('\n');
  const headingRe = new RegExp(
    `^#{2,4}\\s+${escapeRegExp(num)}(?:\\.|\\s|$)[:\\s–—-]*(.*)$`,
    'i',
  );

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingRe);
    if (!match) continue;

    const title = match[1]?.replace(/\*+/g, '').trim() || `Section ${num}`;
    const excerptLines: string[] = [];

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (/^#{1,4}\s/.test(line)) break;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('![') || trimmed.startsWith('<!--')) continue;
      excerptLines.push(trimmed.replace(/\*+/g, ''));
      if (excerptLines.join(' ').length >= 420) break;
    }

    return {
      number: num,
      title,
      excerpt: excerptLines.join(' ').slice(0, 500),
    };
  }

  return {
    number: num,
    title: `Section ${num}`,
    excerpt: 'Section heading not found in the bundled local draft preview. Open the full DP page or Gov Hub draft for the complete text.',
  };
}

function buildDpDraftInfo(label: string, dpId: string, sectionNums: string[]): DpReferenceInfo {
  const entry = getDpRegistryEntry(dpId);
  const markdown = getDpMarkdown(dpId);
  const sections = sectionNums
    .map((num) => (markdown ? findSectionSnippet(markdown, num) : null))
    .filter(Boolean) as DpReferenceSection[];

  if (!entry) {
    return {
      kind: 'dp-draft',
      title: dpId,
      summary: label,
      details: ['No registry entry found for this Desirable Property.'],
      sections: sections.length ? sections : undefined,
      sourceLabel: label,
    };
  }

  const statusLine =
    entry.status === 'inscribed'
      ? 'Inscribed on Bitcoin (canonical DP framework).'
      : 'Active draft — not yet inscribed on Bitcoin.';

  const details = [
    entry.category,
    statusLine,
    entry.description,
  ];

  if (entry.mlNumber) {
    details.push(`Gov Hub draft: ${entry.mlNumber}${entry.mlLabel ? ` — ${entry.mlLabel}` : ''}.`);
  }

  if (sectionNums.length && !sections.length) {
    details.push(`Referenced sections: ${sectionNums.join(', ')}.`);
  }

  const links: DpReferenceLink[] = [
    { label: `${entry.id} on desirableproperties.org`, href: entry.siteUrl },
  ];
  if (entry.govhubUrl) {
    links.push({
      label: entry.mlNumber ? `${entry.mlNumber} on Gov Hub` : 'Gov Hub draft',
      href: entry.govhubUrl,
    });
  }

  return {
    kind: 'dp-draft',
    title: `${entry.id} — ${entry.name}`,
    summary: label.includes('local draft')
      ? `Local ML-Draft text Hermes retrieved for ${entry.id}.`
      : `Desirable Property reference: ${entry.id}.`,
    details,
    sections: sections.length ? sections : undefined,
    links,
    sourceLabel: label,
  };
}

function buildGraphInfo(label: string): DpReferenceInfo {
  return {
    kind: 'graph',
    title: 'DP Memory Graph',
    summary: 'Neo4j knowledge graph evidence Hermes used for this reply.',
    details: [
      'Contains the inscribed DP catalog (DP1–DP22), DEPENDS_ON relationships, claims, critiques, and synced Gov Hub proposals.',
      'Graph excerpts complement local draft markdown — cite both when Hermes names them.',
      'ContextAnchor bridge count may be zero; Hermes should not imply graph traversal that is not present.',
    ],
    links: [{ label: 'Browse DPs', href: '/participate' }],
    sourceLabel: label,
  };
}

function buildMetawebInfo(label: string): DpReferenceInfo {
  return {
    kind: 'metaweb',
    title: 'Metaweb book',
    summary: 'Excerpt from the Metaweb book retrieved at query time.',
    details: [
      'Used for Meta-Layer concepts such as semantic bridges between pages (distinct from DP7 interoperability bridges or DP22 civic memory bridges).',
      'Hermes should disambiguate “bridge” using retrieved text, not general knowledge.',
    ],
    links: [{ label: 'Metaweb book', href: '/book' }],
    sourceLabel: label,
  };
}

function buildCommunityInfo(label: string): DpReferenceInfo {
  return {
    kind: 'community',
    title: 'Community teaching',
    summary: 'Saved community correction or teaching note that overrides generic model knowledge.',
    details: [
      'Community corrections marked in Hermes context take precedence over default retrieval.',
      'Status may be pending or approved — treat as participant-sourced guidance.',
    ],
    sourceLabel: label,
  };
}

export function getDpReferenceInfo(label: string): DpReferenceInfo {
  const trimmed = String(label || '').trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      kind: 'generic',
      title: 'Source',
      summary: 'Hermes retrieval source.',
      details: [],
      sourceLabel: label,
    };
  }

  if (lower === 'graph' || lower.includes('memory graph') || lower.includes('dp memory graph')) {
    return buildGraphInfo(trimmed);
  }

  if (lower.includes('metaweb') || lower.includes('fork in the web')) {
    return buildMetawebInfo(trimmed);
  }

  if (lower.includes('community') && (lower.includes('teaching') || lower.includes('correction'))) {
    return buildCommunityInfo(trimmed);
  }

  const dpId = parseDpNumberFromLabel(trimmed);
  if (dpId) {
    const sectionNums = parseSectionNumbersFromLabel(trimmed);
    return buildDpDraftInfo(trimmed, dpId, sectionNums);
  }

  if (lower.includes('local draft') || lower.includes('ml-draft') || lower.endsWith('.md)')) {
    return {
      kind: 'generic',
      title: 'Draft source',
      summary: trimmed,
      details: [
        'Local ML-Draft markdown Hermes retrieved for this answer.',
        'Open the cited DP on desirableproperties.org or Gov Hub for the full draft.',
      ],
      links: [{ label: 'Browse DPs', href: '/participate' }],
      sourceLabel: trimmed,
    };
  }

  return {
    kind: 'generic',
    title: 'Retrieved source',
    summary: trimmed,
    details: ['Hermes cited this label when grounding the reply.'],
    sourceLabel: trimmed,
  };
}
