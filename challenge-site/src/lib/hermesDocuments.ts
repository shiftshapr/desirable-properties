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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function readHermesDocument(file: File): Promise<PendingHermesDocument> {
  if (file.size > HERMES_DOC_MAX_BYTES) {
    throw new Error(`${file.name} is too large (max 2MB)`);
  }

  const ext = file.name.toLowerCase().match(/(\.[a-z0-9]+)$/)?.[1] || '';
  if (!HERMES_DOC_EXTENSIONS.includes(ext as (typeof HERMES_DOC_EXTENSIONS)[number])) {
    throw new Error(`${file.name}: use ${HERMES_DOC_TYPES_LABEL}`);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const comma = dataUrl.indexOf(',');
  const contentBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  if (!contentBase64) {
    throw new Error(`Could not read ${file.name}`);
  }

  return {
    id: `${Date.now()}-${file.name}`,
    name: file.name,
    contentBase64,
  };
}

export function toDocumentPayload(docs: PendingHermesDocument[]): HermesDocumentPayload[] {
  return docs.map(({ name, contentBase64 }) => ({ name, contentBase64 }));
}
