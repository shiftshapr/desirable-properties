#!/usr/bin/env node
/**
 * End-to-end check of book deep links (assets/dp-deep-link.js) against a deployed book.
 *
 *   CHROME_PATH=… node scripts/test-deep-link.mjs <chapterUrl> <canopiMessageId> [--puppeteer <path to puppeteer-core>]
 *   e.g. https://staging.book.desirableproperties.org/viewer/dp08 1bc0c060-…
 *
 * 1280px: the post link lands on the passage (in the viewport, highlighted).
 * 390px:  same, with the Discuss panel closed; "Discuss (n)" opens it; "Back to chapter" closes it.
 * 900px:  the contents panel starts closed.
 * Only GET/OPTIONS requests leave the page. Exits 1 on any failure.
 */
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const [chapterUrl, messageId] = args;
const pIdx = args.indexOf('--puppeteer');
const require = createRequire(import.meta.url);
const puppeteer = require(pIdx > 0 ? args[pIdx + 1] : 'puppeteer-core');
if (!chapterUrl || !messageId || !process.env.CHROME_PATH) {
  console.error('usage: CHROME_PATH=… node scripts/test-deep-link.mjs <chapterUrl> <messageId>');
  process.exit(2);
}
const dp = /\/viewer\/(dp\d{2})/.exec(chapterUrl)?.[1];
const link = `${chapterUrl}?discuss=1&canopiOpen=1&canopiMsg=${messageId}&canopiPageId=book_desirableproperties_org_viewer_${dp}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

async function page(browser, width, mobile) {
  const p = await browser.newPage();
  await p.setViewport({ width, height: mobile ? 844 : 900, isMobile: mobile, hasTouch: mobile });
  await p.setRequestInterception(true);
  p.on('request', (r) => (['GET', 'OPTIONS', 'HEAD'].includes(r.method()) ? r.continue() : r.abort()));
  return p;
}

const state = (p) => p.evaluate(() => {
  const blk = document.querySelector('[data-dp-deep-link]');
  const vis = (sel) => { const e = document.querySelector(sel); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const r = blk && blk.getBoundingClientRect();
  return {
    passage: !!window.__dpDeepLinkPassage__,
    inViewport: !!r && r.top >= 0 && r.top < innerHeight,
    highlighted: (window.CSS && CSS.highlights && CSS.highlights.has('dp-deep-link')) || !!document.querySelector('.dp-deep-link-block'),
    sidebarOpen: !!window.__canopiEmbedSidebarOpen__,
    fab: vis('.dp-discuss-fab') ? document.querySelector('.dp-discuss-fab').textContent : null,
    back: vis('.dp-back-to-chapter'),
    tocOpen: !document.getElementById('sidebar').classList.contains('hidden'),
  };
});

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
try {
  let p = await page(browser, 1280, false);
  await p.goto(link, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(6000);
  let s = await state(p);
  check('1280: passage found', s.passage, s);
  check('1280: passage in viewport and highlighted', s.inViewport && s.highlighted, s);
  await p.close();

  p = await page(browser, 390, true);
  await p.goto(link, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(6000);
  s = await state(p);
  check('390: passage in viewport and highlighted', s.passage && s.inViewport && s.highlighted, s);
  check('390: Discuss panel closed on load', !s.sidebarOpen, s);
  check('390: Discuss (n) button shown', /^Discuss/.test(s.fab || ''), s);
  check('390: contents closed', !s.tocOpen, s);
  await p.tap('.dp-discuss-fab');
  await sleep(8000);
  s = await state(p);
  check('390: Discuss opens the panel', s.sidebarOpen, s);
  check('390: Back to chapter shown while open', s.back, s);
  if (s.back) {
    await p.tap('.dp-back-to-chapter');
    await sleep(1500);
    s = await state(p);
    check('390: Back to chapter closes the panel', !s.sidebarOpen && /^Discuss/.test(s.fab || ''), s);
  }
  await p.close();

  p = await page(browser, 900, false);
  await p.goto(chapterUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(3000);
  s = await state(p);
  check('900: contents closed', !s.tocOpen, s);
  await p.close();
} finally {
  await browser.close();
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ' + JSON.stringify(r.detail)}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
