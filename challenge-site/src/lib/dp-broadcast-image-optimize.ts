import sharp from 'sharp';

const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_WEBP_QUALITY = 82;
const DEFAULT_OUTPUT_MAX_BYTES = 600 * 1024;
const MIN_WEBP_QUALITY = 52;

export type BroadcastImageOptimizeResult = {
  bytes: Buffer;
  width: number;
  height: number;
  webpQuality: number;
  originalWidth: number;
  originalHeight: number;
};

function readIntEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function broadcastImageMaxWidth() {
  return readIntEnv('DP_BROADCAST_IMAGE_MAX_WIDTH', DEFAULT_MAX_WIDTH);
}

export function broadcastImageMaxHeight() {
  return readIntEnv('DP_BROADCAST_IMAGE_MAX_HEIGHT', DEFAULT_MAX_HEIGHT);
}

export function broadcastImageWebpQuality() {
  return readIntEnv('DP_BROADCAST_IMAGE_WEBP_QUALITY', DEFAULT_WEBP_QUALITY);
}

export function broadcastImageOutputMaxBytes() {
  return readIntEnv('DP_BROADCAST_IMAGE_OUTPUT_MAX_BYTES', DEFAULT_OUTPUT_MAX_BYTES);
}

export async function optimizeBroadcastImageBytes(bytes: Buffer): Promise<BroadcastImageOptimizeResult> {
  const rotated = sharp(bytes, { failOn: 'error' }).rotate();
  const meta = await rotated.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Could not read image dimensions.');
  }

  const maxWidth = broadcastImageMaxWidth();
  const maxHeight = broadcastImageMaxHeight();
  const outputMaxBytes = broadcastImageOutputMaxBytes();
  let quality = broadcastImageWebpQuality();

  const needsResize = meta.width > maxWidth || meta.height > maxHeight;
  const resize = needsResize
    ? { width: maxWidth, height: maxHeight, fit: 'inside' as const, withoutEnlargement: true }
    : undefined;

  let output = await sharp(bytes).rotate().resize(resize).webp({ quality, effort: 4 }).toBuffer();

  while (output.length > outputMaxBytes && quality > MIN_WEBP_QUALITY) {
    quality = Math.max(MIN_WEBP_QUALITY, quality - 10);
    output = await sharp(bytes).rotate().resize(resize).webp({ quality, effort: 4 }).toBuffer();
  }

  const outMeta = await sharp(output).metadata();
  if (!outMeta.width || !outMeta.height) {
    throw new Error('Optimized image is invalid.');
  }

  return {
    bytes: output,
    width: outMeta.width,
    height: outMeta.height,
    webpQuality: quality,
    originalWidth: meta.width,
    originalHeight: meta.height,
  };
}
