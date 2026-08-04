import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const FILE_ID_RE = /^bi_[a-z0-9]+_[a-z0-9]+$/i;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif'] as const;

const EXT_BY_MIME: Record<(typeof ALLOWED_MIME)[number], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
};

function normalizeMime(raw: string) {
  const m = String(raw || '').trim().toLowerCase();
  if (m === 'image/jpg') return 'image/jpeg';
  return m;
}

function mimeMatchesMagic(buf: Buffer, mime: string) {
  if (!Buffer.isBuffer(buf) || buf.length < 6) return false;
  const m = normalizeMime(mime);
  if (m === 'image/png') {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (m === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (m === 'image/gif') {
    const head = buf.slice(0, 6).toString('ascii');
    return head === 'GIF87a' || head === 'GIF89a';
  }
  return false;
}

function newFileId() {
  return `bi_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function atomicWriteFile(target: string, bytes: Buffer) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, target);
}

function imageRootDir() {
  const explicit = process.env.DP_BROADCAST_IMAGE_DIR?.trim();
  if (explicit) return path.resolve(explicit);
  const dataDir = process.env.DP_DATA_DIR?.trim() || path.join(process.cwd(), 'data');
  return path.resolve(path.join(dataDir, 'uploads', 'broadcast-images'));
}

function publicBase() {
  return (
    process.env.DP_PUBLIC_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://desirableproperties.org'
  ).replace(/\/$/, '');
}

export function broadcastImageMaxBytes() {
  return Number(process.env.DP_BROADCAST_IMAGE_MAX_BYTES || DEFAULT_MAX_BYTES);
}

function filePathFor(fileId: string, mime: string) {
  if (!FILE_ID_RE.test(String(fileId || ''))) return null;
  const ext = EXT_BY_MIME[normalizeMime(mime) as (typeof ALLOWED_MIME)[number]];
  if (!ext) return null;
  const root = imageRootDir();
  const resolved = path.resolve(root, `${fileId}${ext}`);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function findExistingPath(fileId: string) {
  if (!FILE_ID_RE.test(String(fileId || ''))) return null;
  for (const mime of ALLOWED_MIME) {
    const p = filePathFor(fileId, mime);
    if (p && fs.existsSync(p)) {
      return { path: p, mime: normalizeMime(mime) };
    }
  }
  return null;
}

export function broadcastImagePublicUrl(fileId: string) {
  return `${publicBase()}/api/broadcast/images/${encodeURIComponent(fileId)}`;
}

export function uploadBroadcastImage(input: {
  mime: string;
  bytes: Buffer;
  adminEmail?: string | null;
}) {
  const mime = normalizeMime(input?.mime);
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    return {
      ok: false as const,
      status: 400,
      error: 'mime_not_allowed',
      message: 'Use PNG, JPEG, or GIF (email-safe formats).',
    };
  }

  const bytes = Buffer.isBuffer(input?.bytes) ? input.bytes : Buffer.from(input?.bytes || []);
  const maxBytes = broadcastImageMaxBytes();
  if (!bytes.length) {
    return { ok: false as const, status: 400, error: 'empty_file', message: 'Image file is empty.' };
  }
  if (bytes.length > maxBytes) {
    return {
      ok: false as const,
      status: 413,
      error: 'file_too_large',
      message: `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller.`,
    };
  }
  if (!mimeMatchesMagic(bytes, mime)) {
    return {
      ok: false as const,
      status: 400,
      error: 'mime_magic_mismatch',
      message: 'File content does not match the declared image type.',
    };
  }

  fs.mkdirSync(imageRootDir(), { recursive: true });
  const fileId = newFileId();
  const target = filePathFor(fileId, mime);
  if (!target) {
    return { ok: false as const, status: 500, error: 'path_error', message: 'Could not resolve image path.' };
  }
  atomicWriteFile(target, bytes);

  return {
    ok: true as const,
    fileId,
    mime,
    sizeBytes: bytes.length,
    url: broadcastImagePublicUrl(fileId),
    uploadedAt: new Date().toISOString(),
    uploadedBy: input?.adminEmail || null,
  };
}

export function readBroadcastImage(fileId: string) {
  const found = findExistingPath(fileId);
  if (!found) return { ok: false as const, status: 404, error: 'not_found' };

  try {
    const bytes = fs.readFileSync(found.path);
    return {
      ok: true as const,
      fileId,
      mime: found.mime,
      bytes,
      etag: `"${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16)}"`,
    };
  } catch (e) {
    return {
      ok: false as const,
      status: 500,
      error: 'read_failed',
      message: e instanceof Error ? e.message : 'Could not read image.',
    };
  }
}
