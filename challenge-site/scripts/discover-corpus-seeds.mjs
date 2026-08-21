/**
 * Discover candidate work URLs for promoteFetchFailed roster orgs.
 * Reads homepage + blog subdomain links; merges manual research seeds.
 *
 * Usage: node scripts/discover-corpus-seeds.mjs
 * Output: src/data/alliance-roster-corpus-seeds.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractLinks,
  fetchResource,
  isBlockedUrl,
  isSameOrgDomain,
  scoreWorkUrl,
} from './lib/corpus-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.join(__dirname, '../src/data/alliance-roster.json');
const reportPath = path.join(__dirname, '../src/data/alliance-roster-corpus-report.json');
const stubsPath = path.join(__dirname, '../src/data/alliance-roster-corpus-stubs.json');
const outPath = path.join(__dirname, '../src/data/alliance-roster-corpus-seeds.json');

/** Manual research seeds (2026-08-21+) — live publication/blog/report URLs verified by fetch. */
const MANUAL_SEEDS = {
  americansecurityfund: ['https://www.americansecurityfund.com/resources'],
  aspeninstitute: [
    'https://www.aspeninstitute.org/publications/',
    'https://www.aspeninstitute.org/programs/tech-policy-hub/',
  ],
  centritechfdn: [
    'https://www.digitalintegrators.org/_files/ugd/fbbd27_e2e67672a7064439bc5404eea6a9f9a1.pdf',
    'https://www.centritechfdn.org/_files/ugd/fbbd27_129f7332af304a949d18d65d1170a445.pdf',
  ],
  christchurchcall: [
    'https://www.christchurchcall.org/cciao-delphi-study-building-the-governance-foundation-for-tvec-algorithmic-research/',
    'https://www.christchurchcall.org/auditing-proprietary-algorithms-while-preserving-privacy-is-possible-heres-how/',
    'https://www.christchurchcall.org/significant-global-progress-made-under-christchurch-call/',
  ],
  cigionline: [
    'https://www.cigionline.org/publications/models-platform-governance/',
    'https://www.cigionline.org/publications/data-governance-digital-age/',
    'https://www.cigionline.org/articles/smaller-than-advertised-canadas-real-trade-risk-with-the-united-states/',
  ],
  counterhate: [
    'https://counterhate.com/research/the-cost-of-weaker-moderation/',
    'https://counterhate.com/research/up-next-anorexia-algorithm/',
    'https://counterhate.com/blog/new-report-shows-youtube-still-recommends-eating-disorder-content-to-children-despite-safety-improvements/',
  ],
  digitalcredentials: [
    'https://digitalcredentials.mit.edu/resources',
    'https://digitalcredentials.mit.edu/docs/DCC-Making-Sense-of-Key-Data-Standards-for-Verifiable-LERs.pdf',
    'https://digitalcredentials.mit.edu/docs/Credential-Engine-and-Digital-Credentials-Consortium_-Issuer-Identity-Registry-Research-Report.pdf',
  ],
  encodejustice: [
    'https://encodejustice.org/wp-content/uploads/2024/10/White-Paper-Technological-Pitfalls-Encode-Justice.pdf',
  ],
  forfreedoms: [
    'https://www.forfreedoms.org/artworks/the-model-minority-is-a-myth',
    'https://www.forfreedoms.org/artworks/becoming-a-citizen',
    'https://www.forfreedoms.org/artworks/who-am-i-to-tell-the-story',
  ],
  glianetalliance: ['https://www.glianetalliance.org/news/fiduciary-duties-ai-workshop'],
  instituteforfamiliesandtechnology: [
    'https://www.instituteforfamiliesandtechnology.org/blog-posts/press-release-national-poll-shows-overwhelming-bipartisan-support-for-holding-social-media-companies-accountable-for-harms-to-children',
    'https://www.instituteforfamiliesandtechnology.org/blog-posts/new-report-grades-all-50-states-and-d-c-on-their-phone-free-schools-policies',
  ],
  joinmama: ['https://wearemama.org/resource/'],
  lifewithmachines: [
    'https://www.lifewithmachines.media/p/the-humans-behind-ai-are-speaking',
    'https://www.lifewithmachines.media/p/ai-and-democracy-needs-you-verity',
  ],
  madewithblackculture: ['https://madewithblackculture.com/black-inventors-terminal.html'],
  newimpact: ['https://www.newimpact.care/impact-orgs'],
  newpublic: [
    'https://newpublic.org/uploads/2024/07/Front-Porch-Forum-report-2.pdf',
    'https://newpublic.org/uploads/2021/03/Terra-Incognita.pdf',
  ],
  peoplecentered: [
    'https://peoplecentered.net/may-update-message-from-mei-lin/',
    'https://peoplecentered.net/pcis-global-help-desk-and-the-vaccination-equity-consortium/',
  ],
  policylink: [
    'https://www.policylink.org/resources/report',
    'https://www.policylink.org/our-work/economy/reports',
    'https://www.policylink.org/resources/tools',
  ],
  poptech: ['https://poptech.org/impact-portfolio/'],
  publicai: [
    'https://publicai.co/stories/open-source-win',
    'https://publicai.co/stories/utility',
  ],
  rethinkwords: ['https://rethinkwords.org/'],
  starlinglab: [
    'https://starlinglab.org/case-studies/setting-the-record-straight-in-brazils-burning-wetlands/',
    'https://starlinglab.org/starling-framework/',
  ],
  transfer: ['http://transfer.art/trust'],
  youngpeoplesalliance: [
    'https://www.youngpeoplesalliance.org/api/blob/humanlike-ai.pdf',
    'https://www.youngpeoplesalliance.org/our-work/advocacy',
  ],
};

async function discoverFromHomepage(org) {
  /** @type {string[]} */
  const found = [];
  const bases = [org.website];
  try {
    const host = new URL(org.website).hostname.replace(/^www\./, '');
    bases.push(`https://blog.${host}/`, `https://www.${host}/`);
  } catch {
    // skip
  }

  for (const base of bases) {
    const res = await fetchResource(base);
    if (!res.ok || !res.body) continue;
    const links = extractLinks(res.body, res.url || base)
      .filter((l) => isSameOrgDomain(l.href, org.domain) && !isBlockedUrl(l.href))
      .map((l) => ({ href: l.href, score: scoreWorkUrl(l.href, l.text) }))
      .filter((l) => l.score >= 4)
      .sort((a, b) => b.score - a.score);
    for (const link of links.slice(0, 15)) {
      found.push(link.href);
    }
  }
  return [...new Set(found)];
}

async function main() {
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const stubs = JSON.parse(fs.readFileSync(stubsPath, 'utf8'));
  const stubSet = new Set(stubs.stubSlugs);
  const failedSlugs = new Set(report.promoteFetchFailed.map((r) => r.slug));

  /** @type {Record<string, { workUrls: string[], source: string }>} */
  const seeds = {};

  for (const org of roster.orgs) {
    if (!failedSlugs.has(org.slug) || stubSet.has(org.slug)) continue;

    const manual = MANUAL_SEEDS[org.slug] || [];
    const discovered = manual.length === 0 ? await discoverFromHomepage(org) : [];
    const merged = [...new Set([...manual, ...discovered])];
    if (merged.length === 0) continue;

    seeds[org.slug] = {
      workUrls: merged,
      source: manual.length > 0 ? (discovered.length > 0 ? 'manual+discovered' : 'manual-research') : 'homepage-discovery',
    };
    process.stdout.write(`${org.slug}: ${merged.length} urls\n`);
  }

  const output = {
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Candidate work URLs for promoteFetchFailed orgs. Used by generate-roster-corpus-briefings.mjs before generic probes.',
    orgs: seeds,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(seeds).length} org seed entries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
