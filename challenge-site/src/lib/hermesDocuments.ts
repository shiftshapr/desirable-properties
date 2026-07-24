export const HERMES_DOC_ACCEPT = '.txt,.md,.markdown,.pdf,.docx';
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
  const allowed = ['.txt', '.md', '.markdown', '.pdf', '.docx'];
  if (!allowed.includes(ext)) {
    throw new Error(`${file.name}: use .txt, .md, .pdf, or .docx`);
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
