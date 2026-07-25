export const HERMES_DOC_EXTENSIONS = [
  '.txt',
  '.text',
  '.md',
  '.markdown',
  '.html',
  '.htm',
  '.pdf',
  '.docx',
] as const;

export const HERMES_DOC_ACCEPT = HERMES_DOC_EXTENSIONS.join(',');
export const HERMES_DOC_TYPES_LABEL = 'text, markdown, HTML, PDF, or DOCX';
export const HERMES_DOC_MAX_BYTES = 2 * 1024 * 1024;
export const HERMES_DOC_MAX_COUNT = 3;

export interface HermesDocumentPayload {
  name: string;
  contentBase64: string;
}

export interface PendingHermesDocument {
  id: string;
  name: string;
  contentBase64: string;
}

export async function readHermesDocument(file: File): Promise<PendingHermesDocument> {
  if (file.size > HERMES_DOC_MAX_BYTES) {
    throw new Error(`${file.name} is too large (max 2MB)`);
  }

  const ext = file.name.toLowerCase().match(/(\.[a-z0-9]+)$/)?.[1] || '';
  if (!HERMES_DOC_EXTENSIONS.includes(ext as (typeof HERMES_DOC_EXTENSIONS)[number])) {
    throw new Error(`${file.name}: use ${HERMES_DOC_TYPES_LABEL}`);
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    id: `${Date.now()}-${file.name}`,
    name: file.name,
    contentBase64: btoa(binary),
  };
}

export function toDocumentPayload(docs: PendingHermesDocument[]): HermesDocumentPayload[] {
  return docs.map(({ name, contentBase64 }) => ({ name, contentBase64 }));
}
