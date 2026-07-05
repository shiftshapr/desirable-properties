import fs from 'fs';
import path from 'path';
import {
  archiveSubmissionUrl,
  inscriptionUrl,
  submissionLink as submissionLinkFromMap,
} from '@/lib/ordinalLinks';

export { inscriptionUrl, archiveSubmissionUrl };

export type DpProvenanceMeta = {
  dp_number: number;
  dp: string;
  total_alignments: number;
  total_clarifications: number;
  total_extensions: number;
};

export type DpAlignment = {
  summary: string;
  submission_title: string;
  submission_overview?: string;
  submitter_name: string;
  source_file: string;
};

export type DpClarification = {
  title: string;
  clarification: string;
  why_it_matters: string;
  submission_title: string;
  submitter_name: string;
  source_file: string;
};

export type DpExtension = {
  title: string;
  extension: string;
  why_it_matters: string;
  submission_title: string;
  submitter_name: string;
  source_file: string;
};

export type DpProvenance = {
  meta: DpProvenanceMeta;
  alignments: DpAlignment[];
  clarifications: DpClarification[];
  extensions: DpExtension[];
};

type SubmissionInscriptions = {
  by_source_file: Record<string, string>;
};

type DpInscriptions = {
  by_dp_id: Record<string, string>;
};

const inscriptionData = loadJson<SubmissionInscriptions>('submission-inscriptions.json');
const dpInscriptionData = loadJson<DpInscriptions>('dp-inscriptions.json');

function loadJson<T>(filename: string): T | null {
  try {
    const filePath = path.join(process.cwd(), 'src/data', filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadDpProvenance(dpId: string): DpProvenance | null {
  const num = dpId.replace(/^DP/i, '');
  if (!/^\d+$/.test(num)) return null;
  return loadJson<DpProvenance>(`dp${num}.json`);
}

export function submissionInscriptionUrl(sourceFile: string | null | undefined): string | null {
  if (!sourceFile) return null;
  const id = inscriptionData?.by_source_file?.[sourceFile];
  return inscriptionUrl(id);
}

export function dpInscriptionUrl(dpId: string | null | undefined): string | null {
  if (!dpId) return null;
  const normalized = dpId.toUpperCase().startsWith('DP') ? dpId.toUpperCase() : `DP${dpId}`;
  const id = dpInscriptionData?.by_dp_id?.[normalized];
  return inscriptionUrl(id);
}

export function loadAllDpInscriptions(): Record<string, string> {
  return dpInscriptionData?.by_dp_id ?? {};
}

export function submissionLink(
  sourceFile: string | null | undefined,
): { href: string; label: string; kind: 'inscription' | 'archive' } | null {
  return submissionLinkFromMap(sourceFile, inscriptionData?.by_source_file ?? {});
}

export type PciDpLink = {
  pci_id: string;
  title: string;
  relationship: 'informed' | 'aligned' | 'context';
  summary: string;
  confidence: 'high' | 'medium' | 'low';
};

export function loadPciProvenanceForDp(dpId: string): PciDpLink[] {
  const data = loadJson<{ by_dp_id: Record<string, PciDpLink[]> }>('pci-dp-provenance.json');
  if (!data?.by_dp_id) return [];
  const normalized = dpId.toUpperCase().startsWith('DP') ? dpId.toUpperCase() : `DP${dpId}`;
  return data.by_dp_id[normalized] ?? [];
}

export function loadAllDpProvenanceSummaries(): Map<string, DpProvenanceMeta> {
  const map = new Map<string, DpProvenanceMeta>();
  const dataDir = path.join(process.cwd(), 'src/data');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dataDir).filter((f) => /^dp\d+\.json$/.test(f));
  } catch {
    return map;
  }

  for (const file of files) {
    const provenance = loadJson<DpProvenance>(file);
    if (!provenance?.meta) continue;
    const id = `DP${provenance.meta.dp_number}`;
    map.set(id, provenance.meta);
  }
  return map;
}
