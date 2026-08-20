import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { PersonPadUploadedDoc } from '@/lib/hermes-onboard/person-pad-store';

const FILE_ID_RE = /^ppd_[a-z0-9]+_[a-z0-9]+$/i;
const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

function docsRootDir() {
  const dataDir = process.env.DP_DATA_DIR?.trim() || path.join(process.cwd(), 'data');
  return path.resolve(path.join(dataDir, 'uploads', 'person-pad-docs'));
}

function newDocId() {
  return `ppd_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function atomicWriteFile(target: string, bytes: Buffer) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, target);
}

export function personPadDocUploadMaxBytes() {
  const configured = process.env.DP_PERSON_PAD_DOC_MAX_BYTES?.trim();
  if (configured) return Number(configured);
  return DEFAULT_UPLOAD_MAX_BYTES;
}

function storedFilePath(docId: string, ext: string) {
  if (!FILE_ID_RE.test(String(docId || ''))) return null;
  const root = docsRootDir();
  const resolved = path.resolve(root, `${docId}${ext}`);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export async function uploadPersonPadDoc(input: {
  filename: string;
  mime: string;
  bytes: Buffer;
}): Promise<PersonPadUploadedDoc> {
  const mime = String(input.mime || '').trim().toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('Upload PDF or Word documents only.');
  }
  if (input.bytes.length > personPadDocUploadMaxBytes()) {
    throw new Error(`File exceeds ${personPadDocUploadMaxBytes()} bytes.`);
  }

  const docId = newDocId();
  const ext = EXT_BY_MIME[mime] || '.bin';
  const target = storedFilePath(docId, ext);
  if (!target) throw new Error('Invalid upload id.');

  atomicWriteFile(target, input.bytes);
  return {
    id: docId,
    filename: String(input.filename || `document${ext}`).slice(0, 200),
    mime,
    size: input.bytes.length,
  };
}

export function personPadDocDownloadPath(docId: string, mime: string): string | null {
  const ext = EXT_BY_MIME[mime] || '.bin';
  return storedFilePath(docId, ext);
}
