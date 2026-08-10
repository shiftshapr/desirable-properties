/**
 * Headless check: site header brand stays visible when Canopi push layout is open.
 * Run: npx playwright install chromium && node scripts/canopi-header-push.test.mjs
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL =
  'https://staging.desirableproperties.org/perspectives/a-fork-in-the-web?discuss=1';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });

  await page.waitForFunction(
    () => document.documentElement.classList.contains('canopi-embed-push-open'),
    { timeout: 45_000 },
  );

  const metrics = await page.evaluate(() => {
    const brand = document.querySelector('.site-header-brand');
    const header = document.querySelector('.site-header');
    const inner = document.querySelector('.site-header-inner');
    if (!brand || !header || !inner) {
      return { ok: false, reason: 'missing header nodes' };
    }

    const brandRect = brand.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const brandStyle = getComputedStyle(brand);
    const brandText = (brand.textContent || '').trim();

    const brandVisible =
      brandRect.width > 0 &&
      brandRect.height > 0 &&
      brandRect.left >= 0 &&
      brandStyle.visibility !== 'hidden' &&
      brandStyle.display !== 'none' &&
      brandText === 'DP Challenge';

    const innerInset = innerRect.left - headerRect.left;
    const headerFillsBody =
      Math.abs(headerRect.right - document.body.getBoundingClientRect().right) < 2;

    return {
      ok: brandVisible && innerInset >= 12 && headerFillsBody,
      brandVisible,
      brandLeft: brandRect.left,
      innerInset,
      headerRight: headerRect.right,
      bodyRight: document.body.getBoundingClientRect().right,
      headerFillsBody,
      brandText,
    };
  });

  await browser.close();

  assert.equal(metrics.brandText, 'DP Challenge', 'brand text');
  assert.ok(metrics.brandVisible, `brand should be fully visible: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.innerInset >= 12, `inner container should have left padding: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.headerFillsBody, `header should span body inset, not double-shrink: ${JSON.stringify(metrics)}`);

  console.log('canopi-header-push: ok', metrics);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
