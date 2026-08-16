import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';

async function optimizeLikeProduction(bytes) {
  const maxWidth = 800;
  const maxHeight = 1200;
  const meta = await sharp(bytes).metadata();
  const resize =
    meta.width > maxWidth || meta.height > maxHeight
      ? { width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true }
      : undefined;
  const output = await sharp(bytes).rotate().resize(resize).webp({ quality: 82, effort: 4 }).toBuffer();
  const outMeta = await sharp(output).metadata();
  return { output, width: outMeta.width, height: outMeta.height };
}

test('broadcast image optimize resizes wide photos and outputs webp', async () => {
  const source = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 20, g: 40, b: 80 } },
  })
    .png()
    .toBuffer();

  const { output, width, height } = await optimizeLikeProduction(source);
  assert.equal(width, 800);
  assert.equal(height, 533);
  assert.ok(output.length < source.length);
  assert.equal(output.slice(0, 4).toString('ascii'), 'RIFF');
  assert.equal(output.slice(8, 12).toString('ascii'), 'WEBP');
});

test('broadcast image optimize keeps small images at native size', async () => {
  const source = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();

  const { output, width, height } = await optimizeLikeProduction(source);
  assert.equal(width, 400);
  assert.equal(height, 300);
  assert.equal(output.slice(8, 12).toString('ascii'), 'WEBP');
});
