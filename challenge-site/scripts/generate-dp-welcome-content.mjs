import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsPath = resolve(scriptDir, '../../docs/dp-welcome-messages.md');
const outputPath = resolve(scriptDir, '../src/lib/dp-welcome-content.generated.ts');

function fail(message) {
  throw new Error(`Unable to generate DP welcome content: ${message}`);
}

function cleanMarkdown(value) {
  return value
    .trim()
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ');
}

function capture(source, expression, label) {
  const match = source.match(expression);
  if (!match?.[1]) fail(`missing ${label}`);
  return cleanMarkdown(match[1]);
}

function captureItems(source, expression, label) {
  const match = source.match(expression);
  if (!match?.[1]) fail(`missing ${label}`);
  const items = match[1]
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => cleanMarkdown(line.slice(2)));
  if (!items.length) fail(`no items in ${label}`);
  return items;
}

const KEY_DATE_ISO = {
  'Community review begins': '2026-08-10',
  'Workgroup synthesis target': '2026-09-01',
  'Book and monument launch': '2026-09-16',
};

const KEY_DATE_IDS = {
  'Community review begins': 'communityReviewBegins',
  'Workgroup synthesis target': 'workgroupSynthesis',
  'Book and monument launch': 'bookLaunch',
};

function captureKeyDates(markdown) {
  const match = markdown.match(/\*\*Key dates\*\*\n\n([\s\S]*?)\n\n---/);
  if (!match?.[1]) fail('key dates section');

  const dates = {};
  for (const line of match[1].split('\n').filter((entry) => entry.startsWith('- '))) {
    const parsed = line.match(/^- (.+?): \*\*(.+?)\*\*(?: \((.+?)\))?\.?$/);
    if (!parsed) fail(`key date line: ${line.trim()}`);
    const title = parsed[1].trim();
    const id = KEY_DATE_IDS[title];
    const iso = KEY_DATE_ISO[title];
    if (!id || !iso) fail(`unknown key date title: ${title}`);
    dates[id] = {
      title,
      label: parsed[2].trim(),
      iso,
      note: parsed[3]?.trim() ?? null,
    };
  }

  if (Object.keys(dates).length !== Object.keys(KEY_DATE_ISO).length) {
    fail('incomplete key dates');
  }

  return dates;
}

export function parseWelcomeContent(markdown) {
  const messageA = capture(
    markdown,
    /## Message A[\s\S]*?\*\*Subject:\*\*\s*(.+?)\n/,
    'Message A subject',
  );
  const messageB = capture(
    markdown,
    /## Message B[\s\S]*?\*\*Subject:\*\*\s*(.+?)\n/,
    'Message B subject',
  );
  const supportMatch = markdown.match(
    /\*\*Questions\?\*\*\s*(Submit a support request at) \[([^\]]+)\]\(([^)]+)\) or \[([^\]]+)\]\(([^)]+)\)\./,
  );
  if (!supportMatch) fail('support links');

  const arcImageMatch = markdown.match(/## Message A[\s\S]*?\n!\[([^\]]+)\]\(([^)]+)\)/);
  if (!arcImageMatch) fail('challenge arc image');

  return {
    memberSubject: messageA,
    coordinatorSubject: messageB,
    keyDates: captureKeyDates(markdown),
    messageA: {
      arcIntro: capture(
        markdown,
        /## Message A[\s\S]*?\n---\n\n(The properties you help refine[\s\S]*?)\n\n!\[/,
        'challenge arc introduction',
      ),
      arcImage: {
        alt: arcImageMatch[1].trim(),
        src: arcImageMatch[2].trim(),
      },
      missionTitle: capture(markdown, /\*\*(Your mission)\*\*\n/, 'mission title'),
      missionBody: capture(
        markdown,
        /\*\*Your mission\*\*\n\n(.+?)\n\n/,
        'mission body',
      ),
      missionDetail: capture(
        markdown,
        /\*\*Your mission\*\*\n\n.+?\n\n(.+?)\n\n\*\*What we ask of you\*\*/,
        'mission detail',
      ),
      askTitle: capture(markdown, /\*\*(What we ask of you)\*\*/, 'ask title'),
      askItems: captureItems(
        markdown,
        /\*\*What we ask of you\*\*\n\n([\s\S]*?)\n\n\*\*Time & deadline\*\*/,
        'ask items',
      ),
      timeTitle: capture(markdown, /\*\*(Time & deadline)\*\*/, 'time title'),
      timeItems: captureItems(
        markdown,
        /\*\*Time & deadline\*\*\n\n([\s\S]*?)\n\n\*\*Questions\?\*\*/,
        'time items',
      ),
      support: {
        prefix: supportMatch[1],
        site: { label: supportMatch[2], href: supportMatch[3] },
        hub: { label: supportMatch[4], href: supportMatch[5] },
      },
      closing: capture(
        markdown,
        /\*\*Questions\?\*\*[\s\S]*?\n\n(.+?)\n\n---\n\n## Message B/,
        'Message A closing',
      ),
    },
    coordinator: {
      title: capture(markdown, /\*\*(As workgroup coordinator)\*\*/, 'coordinator title'),
      intro: capture(
        markdown,
        /\*\*As workgroup coordinator\*\*\n\n(.+?)\n\n-/,
        'coordinator introduction',
      ),
      items: captureItems(
        markdown,
        /\*\*As workgroup coordinator\*\*\n\n.+?\n\n([\s\S]*?)\n\n---\n\n## Short onboarding/,
        'coordinator items',
      ),
    },
    profileWelcome: parseProfileWelcome(markdown),
  };
}

function parseProfileWelcome(markdown) {
  const blockMatch = markdown.match(/## Short onboarding blurb[\s\S]*?\n\n((?:> .+\n?)+)/);
  if (!blockMatch?.[1]) fail('short onboarding blurb');

  const lines = blockMatch[1]
    .split('\n')
    .filter((line) => line.startsWith('> '))
    .map((line) => cleanMarkdown(line.slice(2).trim()))
    .filter(Boolean);

  const memberBody = lines
    .filter((line) => !/^You joined\b/i.test(line))
    .join(' ')
    .trim();
  if (!memberBody) fail('member profile welcome body');

  return {
    member: {
      title: capture(
        markdown,
        /## Message A[\s\S]*?\*\*Subject:\*\*\s*(.+?)\n/,
        'member profile welcome title',
      ),
      body: memberBody,
      linkLabel: 'Open your welcome guide',
    },
    coordinator: {
      title: capture(
        markdown,
        /## Message B[\s\S]*?\*\*Subject:\*\*\s*(.+?)\n/,
        'coordinator profile welcome title',
      ),
      body: capture(
        markdown,
        /\*\*As workgroup coordinator\*\*\n\n(.+?)\n\n-/,
        'coordinator profile welcome body',
      ),
      linkLabel: 'Open your combined welcome guide',
    },
  };
}

export function renderWelcomeContent(content) {
  return `// This file is generated from docs/dp-welcome-messages.md. Do not edit manually.\n\n` +
    `export const DP_WELCOME_SUBJECT_MEMBER = ${JSON.stringify(content.memberSubject)};\n` +
    `export const DP_WELCOME_SUBJECT_COORDINATOR = ${JSON.stringify(content.coordinatorSubject)};\n\n` +
    `export const CHALLENGE_KEY_DATES = ${JSON.stringify(content.keyDates, null, 2)} as const;\n\n` +
    `export const MESSAGE_A_SECTIONS = ${JSON.stringify(content.messageA, null, 2)} as const;\n\n` +
    `export const MESSAGE_B_COORDINATOR = ${JSON.stringify(content.coordinator, null, 2)} as const;\n\n` +
    `export const PROFILE_WELCOME_MEMBER = ${JSON.stringify(content.profileWelcome.member, null, 2)} as const;\n\n` +
    `export const PROFILE_WELCOME_COORDINATOR = ${JSON.stringify(content.profileWelcome.coordinator, null, 2)} as const;\n\n` +
    `export type DpWelcomeVariant = 'member' | 'coordinator';\n`;
}

export async function generateWelcomeContent() {
  const markdown = await readFile(docsPath, 'utf8');
  const output = renderWelcomeContent(parseWelcomeContent(markdown));
  await writeFile(outputPath, output);
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generateWelcomeContent();
}
