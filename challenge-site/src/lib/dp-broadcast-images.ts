import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { optimizeBroadcastImageBytes } from '@/lib/dp-broadcast-image-optimize';

const FILE_ID_RE = /^bi_[a-z0-9]+_[a-z0-9]+$/i;
const DEFAULT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const STORED_MIME = 'image/webp';
const STORED_EXT = '.webp';

/** Legacy uploads before WebP optimization. */
const LEGACY_MIME = ['image/png', 'image/jpeg', 'image/gif'] as const;

const LEGACY_EXT_BY_MIME: Record<(typeof LEGACY_MIME)[number], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
};

/** Broad browser MIME list; bytes are validated by decoding with sharp. */
const ACCEPTED_UPLOAD_MIME = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

function normalizeMime(raw: string) {
  const m = String(raw || '').trim().toLowerCase();
  if (m === 'image/jpg') return 'image/jpeg';
  return m;
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

export function broadcastImageUploadMaxBytes() {
  const uploadMax = process.env.DP_BROADCAST_IMAGE_UPLOAD_MAX_BYTES?.trim();
  if (uploadMax) return Number(uploadMax);
  return Number(process.env.DP_BROADCAST_IMAGE_MAX_BYTES || DEFAULT_UPLOAD_MAX_BYTES);
}

/** Backward-compatible alias for upload size checks. */
export function broadcastImageMaxBytes() {
  return broadcastImageUploadMaxBytes();
}

function storedFilePath(fileId: string) {
  if (!FILE_ID_RE.test(String(fileId || ''))) return null;
  const root = imageRootDir();
  const resolved = path.resolve(root, `${fileId}${STORED_EXT}`);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function legacyFilePath(fileId: string, mime: string) {
  if (!FILE_ID_RE.test(String(fileId || ''))) return null;
  const ext = LEGACY_EXT_BY_MIME[normalizeMime(mime) as (typeof LEGACY_MIME)[number]];
  if (!ext) return null;
  const root = imageRootDir();
  const resolved = path.resolve(root, `${fileId}${ext}`);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function findExistingPath(fileId: string) {
  if (!FILE_ID_RE.test(String(fileId || ''))) return null;

  const webpPath = storedFilePath(fileId);
  if (webpPath && fs.existsSync(webpPath)) {
    return { path: webpPath, mime: STORED_MIME };
  }

  for (const mime of LEGACY_MIME) {
    const p = legacyFilePath(fileId, mime);
    if (p && fs.existsSync(p)) {
      return { path: p, mime: normalizeMime(mime) };
    }
  }
  return null;
}

export function broadcastImagePublicUrl(fileId: string) {
  return `${publicBase()}/api/broadcast/images/${encodeURIComponent(fileId)}`;
}

function uploadMimeAllowed(mime: string) {
  const normalized = normalizeMime(mime);
  if (!normalized) return true;
  if (!normalized.startsWith('image/')) return false;
  if (ACCEPTED_UPLOAD_MIME.includes(normalized as (typeof ACCEPTED_UPLOAD_MIME)[number])) return true;
  return normalized === 'image/*';
}

export async function uploadBroadcastImage(input: {
  mime: string;
  bytes: Buffer;
  adminEmail?: string | null;
}) {
  const mime = normalizeMime(input?.mime);
  if (!uploadMimeAllowed(mime)) {
    return {
      ok: false as const,
      status: 400,
      error: 'mime_not_allowed',
      message: 'Upload a PNG, JPEG, GIF, WebP, or HEIC image.',
    };
  }

  const bytes = Buffer.isBuffer(input?.bytes) ? input.bytes : Buffer.from(input?.bytes || []);
  const maxBytes = broadcastImageUploadMaxBytes();
  if (!bytes.length) {
    return { ok: false as const, status: 400, error: 'empty_file', message: 'Image file is empty.' };
  }
  if (bytes.length > maxBytes) {
    return {
      ok: false as const,
      status: 413,
      error: 'file_too_large',
      message: `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller before optimization.`,
    };
  }

  let optimized;
  try {
    optimized = await optimizeBroadcastImageBytes(bytes);
  } catch (e) {
    return {
      ok: false as const,
      status: 400,
      error: 'invalid_image',
      message: e instanceof Error ? e.message : 'Could not process image.',
    };
  }

  fs.mkdirSync(imageRootDir(), { recursive: true });
  const fileId = newFileId();
  const target = storedFilePath(fileId);
  if (!target) {
    return { ok: false as const, status: 500, error: 'path_error', message: 'Could not resolve image path.' };
  }
  atomicWriteFile(target, optimized.bytes);

  return {
    ok: true as const,
    fileId,
    mime: STORED_MIME,
    sizeBytes: optimized.bytes.length,
    originalSizeBytes: bytes.length,
    width: optimized.width,
    height: optimized.height,
    originalWidth: optimized.originalWidth,
    originalHeight: optimized.originalHeight,
    webpQuality: optimized.webpQuality,
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
