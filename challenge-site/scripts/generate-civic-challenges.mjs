#!/usr/bin/env node
/**
 * One-shot generator for civic-challenges/dp1.json … dp22.json + index.json.
 * Run from challenge-site: node scripts/generate-civic-challenges.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/civic-challenges');

function actions(n) {
  return [
    {
      id: 'submit_problem',
      label: `Submit a real-world problem for DP${n}`,
      intent: 'Capture a concrete lived issue that this property should address.',
    },
    {
      id: 'companion',
      label: 'Talk with the AI Companion',
      intent: 'Explore the challenge and draft a position with Hermes.',
    },
    {
      id: 'improve',
      label: `Suggest improvements to DP${n}`,
      intent: 'Propose clarifications, extensions, or patches to the property.',
    },
    {
      id: 'join_workgroup',
      label: `Join the DP${n} workgroup`,
      intent: 'Collaborate with stewards advancing this property.',
    },
    {
      id: 'curate',
      label: 'Help curate community submissions',
      intent: 'Review and organize contributions related to this challenge.',
    },
  ];
}

function resources() {
  return [
    { kind: 'video', title: '3-minute video', optional: true },
    { kind: 'infographic', title: 'Infographic', optional: true },
    { kind: 'research', title: 'Research papers', optional: true },
    { kind: 'discussion', title: 'Community discussion', optional: true },
  ];
}

/** @type {Array<Record<string, unknown>>} */
const DPS = [
  {
    number: 1,
    slug: 'federated-authentication-accountability',
    title: 'Federated Authentication & Accountability',
    guidingQuestion:
      'How can we know who we are interacting with without sacrificing privacy or decentralization?',
    summary:
      'Federated strong authentication enables decentralized identity, portable reputation, and accountable participation while preserving participant privacy and community autonomy.',
    humanIssue: 'Fake accounts, scams, and impersonation',
    webProblem: 'Identity is fragmented and easily spoofed',
    opportunity: 'Portable identity and accountable participation',
    themeColor: '#2EC5FF',
    hero: {
      headline: 'Identity is becoming the foundation of trust.',
      text: 'As AI-generated identities, bots, and impersonation become commonplace, the Internet needs new ways to establish authenticity without centralizing control. The Meta-Layer proposes a decentralized approach to identity that enables trust without relying on a single company or authority.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'Every day, millions of people encounter fake accounts, impersonation, scams, AI bots, and anonymous abuse online. As AI becomes capable of creating realistic identities, voices, and conversations, one of the most fundamental questions of the Internet becomes: who am I actually interacting with?',
      stakes: [
        'Scams flourish',
        'Bots overwhelm communities',
        'Reputation becomes meaningless',
        'AI agents become indistinguishable from humans',
        'Accountability disappears',
      ],
    },
    currentChallenges: [
      'Fake accounts',
      'AI impersonation',
      'Anonymous harassment',
      'Phishing',
      'Credential theft',
      'Platform-specific identities',
      'No portable reputation',
      'Sock puppet campaigns',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: "Today's Web was built around websites. Every platform manages its own accounts, maintains its own reputation, and creates another silo. Identity rarely travels with you, so trust has to be rebuilt over and over again.",
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Participants choose what to reveal, carry portable reputation across communities, and interact within transparent trust frameworks that distinguish humans, organizations, and AI.',
      bullets: [
        'Arrive at any webpage and choose which aspects of your identity to share',
        'Carry reputation across communities',
        'AI agents clearly identify themselves',
        'Communities define their own trust policies while remaining interoperable',
        'Prove you are qualified without revealing unnecessary personal information',
      ],
    },
    audiences: [
      { id: 'parents', label: 'Parents', why: 'Protect families from impersonation and scams targeting children and elders.' },
      { id: 'journalists', label: 'Journalists', why: 'Verify sources and authorship without relying on a single platform.' },
      { id: 'developers', label: 'Developers', why: 'Build once against portable identity instead of per-platform login silos.' },
      { id: 'governments', label: 'Governments', why: 'Enable accountable public consultation without mandatory real-name traps.' },
      { id: 'businesses', label: 'Businesses', why: 'Reduce fraud while respecting customer privacy and choice.' },
      { id: 'young-people', label: 'Young people', why: 'Participate online with dignity, without surrendering every personal detail.' },
    ],
    capabilities: [
      'presence',
      'trust-signals',
      'portable-identity',
      'reputation',
      'consent',
      'smart-tags',
      'community-governance',
      'ai-accountability',
    ],
    exampleDomains: [
      { label: 'Healthcare', text: 'Verifying medical professionals.' },
      { label: 'Education', text: 'Portable learner credentials.' },
      { label: 'Journalism', text: 'Verifiable authorship.' },
      { label: 'Government', text: 'Public consultation with accountable participation.' },
      { label: 'Open Source', text: 'Persistent contributor reputation.' },
      { label: 'Community Forums', text: 'Reduced trolling without mandatory real names.' },
    ],
  },
  {
    number: 2,
    slug: 'participant-agency-empowerment',
    title: 'Participant Agency and Empowerment',
    guidingQuestion: 'How do we ensure people stay in control of their digital lives?',
    summary:
      'Participants control presence, filters, feeds, AI assistance, and attention so platforms optimize for human choice rather than extraction.',
    humanIssue: 'Algorithms controlling what you see',
    webProblem: 'Platforms optimize for engagement over user choice',
    opportunity: 'Users control filters, feeds, AI, and attention',
    themeColor: '#5B8CFF',
    hero: {
      headline: 'Your attention should belong to you.',
      text: 'Feeds, recommendations, and AI assistants increasingly decide what you notice. Participant agency means you set the terms: what reaches you, who can interact with you, and how assistance works on your behalf.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'You open an app to check one thing and leave an hour later unsure what you came for. The feed was optimized for time-on-site, not for your goals. When algorithms and AI steer attention by default, people lose the ability to shape their own digital experience.',
      stakes: [
        'Attention is harvested',
        'Filters are opaque',
        'AI acts without clear consent',
        'Presence settings reset per platform',
      ],
    },
    currentChallenges: [
      'Engagement-maximizing feeds',
      'Opaque ranking',
      'Dark patterns',
      'AI assistants without user control',
      'One-size-fits-all moderation',
      'No portable preference profiles',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: "Platforms own the interface between you and the world. Preferences, block lists, and attention settings stay trapped inside each app, so agency does not travel and defaults favor engagement metrics.",
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'You carry portable agency settings across the web: smart filters, presence rules, and AI permissions that you author and revise.',
      bullets: [
        'Choose feeds and filters that serve your purpose',
        'Set AI boundaries that travel with you',
        'Decide who can reach you in each context',
        'Earn reputation for constructive participation, not outrage',
      ],
    },
    audiences: [
      { id: 'parents', label: 'Parents', why: 'Shape healthier attention environments for families.' },
      { id: 'teachers', label: 'Teachers', why: 'Help learners focus without platform distraction defaults.' },
      { id: 'researchers', label: 'Researchers', why: 'Study agency-preserving interfaces instead of engagement traps.' },
      { id: 'young-people', label: 'Young people', why: 'Grow up with tools that respect autonomy, not addiction loops.' },
      { id: 'developers', label: 'Developers', why: 'Ship products that honor user-controlled preference layers.' },
    ],
    capabilities: ['attention-agency', 'presence', 'consent', 'smart-tags', 'reputation', 'context-overlays'],
    exampleDomains: [
      { label: 'Social media', text: 'User-authored feed policies.' },
      { label: 'Education', text: 'Focus modes that students control.' },
      { label: 'Civic tech', text: 'Participation without engagement bait.' },
      { label: 'Workplace tools', text: 'Notification and AI consent you set once.' },
    ],
  },
  {
    number: 3,
    slug: 'adaptive-governance',
    title: 'Adaptive Governance Supporting an Exponentially Growing Community',
    guidingQuestion: 'How can communities govern themselves without recreating Big Tech rulebooks?',
    summary:
      'Composable, adaptive governance lets communities set and evolve rules while remaining interoperable across the Meta-Layer.',
    humanIssue: 'Big Tech making all the rules',
    webProblem: 'Governance is centralized and slow',
    opportunity: 'Communities govern themselves with composable governance',
    themeColor: '#7C5CFF',
    hero: {
      headline: 'Rules should grow with the community, not above it.',
      text: 'When a handful of platforms write the terms for billions of people, local norms disappear. Adaptive governance gives communities modular tools to set policy, resolve conflict, and evolve without waiting for a corporate update.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A neighborhood mutual-aid group is banned overnight for a policy they never saw drafted. Appeals go into a void. The people who built the community have no say in the rules that dissolve it.',
      stakes: [
        'Centralized terms of service',
        'Opaque enforcement',
        'Slow appeals',
        'No local policy modularity',
      ],
    },
    currentChallenges: [
      'One-size-fits-all platform rules',
      'Unaccountable moderation',
      'Governance theater',
      'No portable community charters',
      'Capture by largest stakeholders',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Platforms centralize rule-making because they own the servers, the graph, and the enforcement stack. Communities cannot take their governance with them when they leave.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities compose governance modules (membership, speech norms, dispute resolution) and carry those agreements across contexts.',
      bullets: [
        'Local rules with interoperable hooks',
        'Transparent roles and escalation paths',
        'Incentives aligned with stewardship',
        'Governance that scales without becoming a new monopoly',
      ],
    },
    audiences: [
      { id: 'community-organizers', label: 'Community organizers', why: 'Run groups with clear, adaptable charters.' },
      { id: 'governments', label: 'Governments', why: 'Support plural civic spaces without capturing them.' },
      { id: 'developers', label: 'Developers', why: 'Implement governance primitives once, reuse everywhere.' },
      { id: 'businesses', label: 'Businesses', why: 'Participate in ecosystems with predictable community rules.' },
    ],
    capabilities: ['community-governance', 'meta-communities', 'reputation', 'consent', 'trust-signals'],
    exampleDomains: [
      { label: 'Open source', text: 'Composable maintainer and contributor roles.' },
      { label: 'Municipal forums', text: 'Neighborhood policy modules.' },
      { label: 'Research consortia', text: 'Shared review and conflict protocols.' },
      { label: 'Creator communities', text: 'Member-led moderation with portable charters.' },
    ],
  },
  {
    number: 4,
    slug: 'data-sovereignty-privacy',
    title: 'Data Sovereignty and Privacy',
    guidingQuestion: 'Who should own your data?',
    summary:
      'Individuals own and selectively share their data through privacy-centric vaults, dynamic consent, and context-aware controls.',
    humanIssue: 'Companies own your data',
    webProblem: 'Data is harvested and locked away',
    opportunity: 'Individuals own and selectively share their data',
    themeColor: '#00C2A8',
    hero: {
      headline: 'Your data should work for you, not against you.',
      text: 'Today, personal information is harvested as the price of participation. Data sovereignty restores control: you decide what is stored, shared, and revoked across contexts.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A health app sells behavioral data to advertisers. A school platform keeps student records after graduation. Leaving a service rarely means taking your history with you, or deleting it for good.',
      stakes: [
        'Surveillance by default',
        'Lock-in through data hostage',
        'Opaque secondary uses',
        'Weak revocation',
      ],
    },
    currentChallenges: [
      'Forced consent bundles',
      'Data brokers',
      'Vendor lock-in',
      'Cross-context leakage',
      'Weak deletion guarantees',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Services store user data as a competitive asset. Interoperability of identity and history threatens that advantage, so sovereignty is treated as a compliance checkbox rather than a design goal.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Personal data vaults and selective disclosure let you prove what is needed without surrendering everything else.',
      bullets: [
        'Share the minimum claim for each interaction',
        'Revoke access when context ends',
        'Move history without losing continuity',
        'Audit who accessed what, and why',
      ],
    },
    audiences: [
      { id: 'parents', label: 'Parents', why: 'Protect family data from silent resale.' },
      { id: 'patients', label: 'Patients', why: 'Control health information across providers.' },
      { id: 'researchers', label: 'Researchers', why: 'Access consented data without coercive collection.' },
      { id: 'businesses', label: 'Businesses', why: 'Build trust with clear data stewardship.' },
      { id: 'governments', label: 'Governments', why: 'Respect citizens as data principals, not inventory.' },
    ],
    capabilities: ['data-sovereignty', 'consent', 'portable-identity', 'smart-tags', 'provenance'],
    exampleDomains: [
      { label: 'Healthcare', text: 'Patient-controlled record sharing.' },
      { label: 'Education', text: 'Learner-owned portfolios.' },
      { label: 'Finance', text: 'Selective KYC disclosure.' },
      { label: 'Civic apps', text: 'Participation without permanent dossiers.' },
    ],
  },
  {
    number: 5,
    slug: 'decentralized-namespace',
    title: 'Decentralized Namespace',
    guidingQuestion: 'How do names and identities persist when platforms change?',
    summary:
      'A decentralized namespace keeps human-meaningful names and identifiers portable across services, communities, and time.',
    humanIssue: 'Losing your identity when platforms change',
    webProblem: 'Usernames and identities belong to platforms',
    opportunity: 'Persistent identities across the web',
    themeColor: '#FF8A3D',
    hero: {
      headline: 'Your name should outlast any single app.',
      text: 'Handles, domains, and display names are rented from platforms. When a service pivots, bans, or dies, the name people know you by often disappears with it.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A creator builds an audience under a username for a decade. The platform changes ownership, the handle is reassigned, and years of recognition evaporate overnight.',
      stakes: [
        'Handle squatting',
        'Forced rebranding',
        'Broken links and citations',
        'Impersonation after abandonment',
      ],
    },
    currentChallenges: [
      'Platform-owned usernames',
      'Non-portable handles',
      'Conflicting identity systems',
      'No shared resolution layer',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Namespaces are competitive moats. Each service invents its own naming scheme, so continuity depends on corporate goodwill rather than open resolution.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'People and communities control persistent names that resolve across apps, with clear delegation and revocation.',
      bullets: [
        'One identity, many presentations',
        'Portable handles communities can verify',
        'Resilient links that survive platform churn',
      ],
    },
    audiences: [
      { id: 'creators', label: 'Creators', why: 'Keep audience recognition across platforms.' },
      { id: 'developers', label: 'Developers', why: 'Resolve identities without proprietary APIs alone.' },
      { id: 'archivists', label: 'Archivists', why: 'Cite people and projects that remain findable.' },
      { id: 'communities', label: 'Communities', why: 'Maintain shared identity beyond any host.' },
    ],
    capabilities: ['portable-identity', 'provenance', 'meta-communities', 'interoperability', 'trust-signals'],
    exampleDomains: [
      { label: 'Publishing', text: 'Stable author identities across outlets.' },
      { label: 'Open source', text: 'Persistent contributor names.' },
      { label: 'Education', text: 'Credentials tied to portable identity.' },
      { label: 'Civic groups', text: 'Community names that travel with members.' },
    ],
  },
  {
    number: 6,
    slug: 'commerce',
    title: 'Commerce',
    guidingQuestion: 'How do creators and communities get paid without advertising as the default?',
    summary:
      'Commerce primitives for micropayments, care economies, and community value exchange that are not dependent on surveillance advertising.',
    humanIssue: 'Creators not getting paid',
    webProblem: 'Advertising dominates business models',
    opportunity: 'Micropayments, care economy, community economies',
    themeColor: '#E6B800',
    hero: {
      headline: 'Value should flow to people who create it.',
      text: 'The open web mostly funds itself by selling attention. Commerce on the Meta-Layer explores fairer exchange: small payments, mutual aid, and community economies that respect participants.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A teacher publishes free guides that millions use. Platforms monetize the traffic; the teacher sees almost nothing. Advertising fills the gap, and the incentive to manipulate attention grows.',
      stakes: [
        'Creator poverty amid platform wealth',
        'Ad-driven design',
        'Fragile patronage',
        'No interoperable micropayments',
      ],
    },
    currentChallenges: [
      'Ad dependence',
      'Payment silos',
      'High fees for small transfers',
      'Care work undervalued',
      'Platform take rates',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Business models follow what is easy to meter at scale: ads and subscriptions inside walled gardens. Cross-site micropayments and care economies lack shared rails.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'People tip, subscribe, or exchange value across communities with low friction, including non-extractive care economies.',
      bullets: [
        'Micropayments that work across sites',
        'Community treasuries with transparent rules',
        'Recognition for care and stewardship work',
      ],
    },
    audiences: [
      { id: 'creators', label: 'Creators', why: 'Earn without surrendering the audience graph.' },
      { id: 'communities', label: 'Communities', why: 'Fund shared goods without ad capture.' },
      { id: 'businesses', label: 'Businesses', why: 'Participate in open commerce rails.' },
      { id: 'care-workers', label: 'Care workers', why: 'Make mutual aid and care economically visible.' },
    ],
    capabilities: ['micropayments', 'community-governance', 'reputation', 'interoperability', 'consent'],
    exampleDomains: [
      { label: 'Independent media', text: 'Reader-supported micropayments.' },
      { label: 'Open source', text: 'Sustainable maintainer funding.' },
      { label: 'Mutual aid', text: 'Transparent community pools.' },
      { label: 'Education', text: 'Pay-what-you-can learning resources.' },
    ],
  },
  {
    number: 7,
    slug: 'simplicity-interoperability',
    title: 'Simplicity and Interoperability',
    guidingQuestion: 'How do we connect the web without forcing people into yet another app?',
    summary:
      'A simple, interoperable Meta-Layer reduces digital fragmentation so tools, communities, and identities work across the open web.',
    humanIssue: 'Too many disconnected apps',
    webProblem: 'Digital fragmentation',
    opportunity: 'One interoperable layer across the Web',
    themeColor: '#3DDC97',
    hero: {
      headline: 'The next layer should simplify, not multiply tabs.',
      text: 'People already juggle too many logins, chats, and tools. Interoperability means capabilities compose across sites instead of forcing yet another destination.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A volunteer coordinates across five apps for one campaign: chat here, docs there, events somewhere else. Context is lost in the seams, and newcomers never catch up.',
      stakes: [
        'Tool fatigue',
        'Broken handoffs',
        'Duplicate identities',
        'Integration tax for builders',
      ],
    },
    currentChallenges: [
      'App sprawl',
      'Proprietary APIs',
      'Incompatible formats',
      'Complex onboarding',
      'Brittle integrations',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Each product optimizes for its own retention. Standards exist, but product incentives reward lock-in, so users pay the complexity tax.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Presence, identity, community, and context travel as a coherent layer above pages and apps.',
      bullets: [
        'Fewer silos, clearer shared primitives',
        'Build once, connect many surfaces',
        'Simple defaults that still allow depth',
      ],
    },
    audiences: [
      { id: 'everyday-users', label: 'Everyday users', why: 'Less juggling, more continuity.' },
      { id: 'developers', label: 'Developers', why: 'Stable interoperability targets.' },
      { id: 'enterprises', label: 'Enterprises', why: 'Compose tools without endless custom glue.' },
      { id: 'communities', label: 'Communities', why: 'Coordinate without mandating one vendor.' },
    ],
    capabilities: ['interoperability', 'context-overlays', 'portable-identity', 'smart-tags', 'meta-communities'],
    exampleDomains: [
      { label: 'Civic campaigns', text: 'Shared presence across tools.' },
      { label: 'Education', text: 'Portable learning context.' },
      { label: 'Healthcare', text: 'Interoperable patient-facing layers.' },
      { label: 'Research', text: 'Cross-lab collaboration without lock-in.' },
    ],
  },
  {
    number: 8,
    slug: 'collaborative-environment-meta-communities',
    title: 'Collaborative Environment and Meta-Communities',
    guidingQuestion: 'How do communities persist beyond platforms?',
    summary:
      'Meta-communities are persistent collaborative environments that travel with members across the web instead of dying inside a single host.',
    humanIssue: 'Online communities constantly restart',
    webProblem: 'Communities are trapped inside platforms',
    opportunity: 'Persistent communities that travel everywhere',
    themeColor: '#FF5C8A',
    hero: {
      headline: 'A community should not die when an app changes its algorithm.',
      text: 'Groups rebuild the same social fabric every time they move platforms. Meta-communities keep membership, norms, and shared work portable.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A thriving forum is shut down. Members scatter to three new apps, lose moderation history, and spend months reconstructing trust that already existed.',
      stakes: [
        'Platform eviction',
        'Lost history',
        'Fragmented membership',
        'Repeated onboarding labor',
      ],
    },
    currentChallenges: [
      'Hosted-only communities',
      'Non-portable membership',
      'Lost archives',
      'Split conversations',
      'No shared collaboration surface',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Communities are features of products. When the product changes incentives or shuts down, the community has no independent substrate.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities exist as first-class objects on the Meta-Layer: members, charters, and collaboration follow the group across contexts.',
      bullets: [
        'Portable membership and roles',
        'Shared workspaces above any page',
        'Continuity of culture and memory',
      ],
    },
    audiences: [
      { id: 'community-organizers', label: 'Community organizers', why: 'Keep groups intact across migrations.' },
      { id: 'educators', label: 'Educators', why: 'Cohorts that persist beyond a learning platform.' },
      { id: 'movements', label: 'Movements', why: 'Coordinate without a single point of failure.' },
      { id: 'developers', label: 'Developers', why: 'Build collaboration that is not host-bound.' },
    ],
    capabilities: ['meta-communities', 'community-governance', 'presence', 'civic-memory', 'interoperability'],
    exampleDomains: [
      { label: 'Mutual aid', text: 'Groups that survive platform churn.' },
      { label: 'Open source', text: 'Contributor communities across forges.' },
      { label: 'Alumni networks', text: 'Lifelong cohorts with shared memory.' },
      { label: 'Local civic groups', text: 'Neighborhood collaboration overlays.' },
    ],
  },
  {
    number: 9,
    slug: 'developer-community-incentives',
    title: 'Developer and Community Incentives',
    guidingQuestion: 'How do we stop rebuilding the same foundations on every platform?',
    summary:
      'Incentives for developers and communities to build once for the Metaweb, with recognition and rewards that reduce lock-in labor.',
    humanIssue: 'Developers rebuild the same things repeatedly',
    webProblem: 'Platform lock-in',
    opportunity: 'Build once, run across the Metaweb',
    themeColor: '#4ECDC4',
    hero: {
      headline: 'Build for the web, not for a landlord.',
      text: 'Developers spend careers reimplementing identity, feeds, and moderation for each silo. Better incentives reward shared infrastructure and portable contributions.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A small team ships a useful community tool, then rewrites it three times for three platforms. Progress stalls while the underlying need never changes.',
      stakes: [
        'Duplicated effort',
        'API churn',
        'Talent drained into integration work',
        'Weak rewards for open primitives',
      ],
    },
    currentChallenges: [
      'Per-platform SDKs',
      'Unrewarded commons work',
      'Short-term venture pressure',
      'Fragmented contributor recognition',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Platforms pay for exclusivity. Shared layers threaten moats, so incentives pull builders toward proprietary stacks instead of common rails.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Developers ship Meta-Layer capabilities once and communities fund the commons that everyone reuses.',
      bullets: [
        'Portable contributor reputation',
        'Incentives for interoperability work',
        'Shared primitives instead of endless forks',
      ],
    },
    audiences: [
      { id: 'developers', label: 'Developers', why: 'Spend time on new value, not re-plumbing silos.' },
      { id: 'funders', label: 'Funders', why: 'Support infrastructure with clear public goods outcomes.' },
      { id: 'communities', label: 'Communities', why: 'Reward maintainers who keep shared tools healthy.' },
      { id: 'startups', label: 'Startups', why: 'Compete on product, not on captive graphs.' },
    ],
    capabilities: ['interoperability', 'reputation', 'micropayments', 'community-governance', 'portable-identity'],
    exampleDomains: [
      { label: 'Open source', text: 'Sustained maintainer incentives.' },
      { label: 'Civic tech', text: 'Reusable governance modules.' },
      { label: 'Education tools', text: 'Shared learning primitives.' },
      { label: 'Identity stacks', text: 'Build once for many surfaces.' },
    ],
  },
  {
    number: 10,
    slug: 'education',
    title: 'Education',
    guidingQuestion: 'How do we learn continuously without drowning in fragmented information?',
    summary:
      'Context-aware lifelong learning that connects people, resources, and communities across the web instead of trapping education in passive silos.',
    humanIssue: 'Information overload',
    webProblem: 'Learning is fragmented and passive',
    opportunity: 'Context-aware lifelong learning',
    themeColor: '#6C63FF',
    hero: {
      headline: 'Learning should follow curiosity, not course catalogs alone.',
      text: 'People learn in fragments across videos, chats, and docs. Education on the Meta-Layer connects context, mentors, and progress so learning stays continuous and active.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A student bookmarks twenty explanations of the same concept, none linked to prior knowledge or a mentor. Progress is invisible; overwhelm wins.',
      stakes: [
        'Passive consumption',
        'Lost learning trails',
        'Credential silos',
        'No portable learning context',
      ],
    },
    currentChallenges: [
      'Content overload',
      'Disconnected LMS platforms',
      'Weak peer learning rails',
      'Credentials that do not travel',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Education products optimize for enrollment and completion inside one system. Context about the learner rarely moves with them across the open web.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Learners carry context-aware pathways, mentors, and proof of growth across communities and tools.',
      bullets: [
        'Active, situated learning overlays',
        'Portable learner identity and progress',
        'Communities as learning environments',
      ],
    },
    audiences: [
      { id: 'teachers', label: 'Teachers', why: 'Meet learners where they already are on the web.' },
      { id: 'students', label: 'Students', why: 'Keep progress when switching tools or schools.' },
      { id: 'parents', label: 'Parents', why: 'Support learning without opaque platform lock-in.' },
      { id: 'lifelong-learners', label: 'Lifelong learners', why: 'Grow skills continuously with coherent context.' },
    ],
    capabilities: ['context-overlays', 'portable-identity', 'meta-communities', 'smart-tags', 'civic-memory'],
    exampleDomains: [
      { label: 'K-12', text: 'Portable learner portfolios.' },
      { label: 'Higher ed', text: 'Cross-institution pathways.' },
      { label: 'Workforce', text: 'Skills verified across employers.' },
      { label: 'Public libraries', text: 'Community learning overlays.' },
    ],
  },
  {
    number: 11,
    slug: 'safe-ethical-ai',
    title: 'Safe and Ethical AI',
    guidingQuestion: 'What does trustworthy AI actually look like?',
    summary:
      'AI systems that are transparent, community-aligned, and accountable so hallucinations and harmful outputs are visible and governable.',
    humanIssue: 'AI hallucinations and harmful outputs',
    webProblem: 'AI lacks visible accountability',
    opportunity: 'Transparent, community-aligned AI',
    themeColor: '#00A3FF',
    hero: {
      headline: 'Trustworthy AI is more than a marketing claim.',
      text: 'People already rely on AI for advice, writing, and decisions. Safety and ethics require visible limits, provenance of outputs, and alignment with community values, not slogans.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'An AI confidently invents a legal citation. A student submits it. Harm spreads before anyone notices the system had no grounding and no accountability path.',
      stakes: [
        'Confident falsehoods',
        'Hidden training harms',
        'No recourse when AI fails',
        'Opaque system behavior',
      ],
    },
    currentChallenges: [
      'Hallucinations',
      'Bias and harmful outputs',
      'Black-box systems',
      'Unclear responsibility',
      'Safety theater',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'AI is shipped as a product feature inside platforms that control evaluation, logging, and redress. Communities cannot inspect or align behavior to local norms.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'AI assistance arrives with transparent boundaries, provenance, and community-aligned safeguards people can understand.',
      bullets: [
        'Visible uncertainty and sources',
        'Clear accountability for deployments',
        'Ethics grounded in participatory oversight',
      ],
    },
    audiences: [
      { id: 'teachers', label: 'Teachers', why: 'Use AI without normalizing fabricated knowledge.' },
      { id: 'journalists', label: 'Journalists', why: 'Demand accountable AI in reporting workflows.' },
      { id: 'developers', label: 'Developers', why: 'Ship models with inspectable safety properties.' },
      { id: 'governments', label: 'Governments', why: 'Set expectations for public-interest AI.' },
      { id: 'young-people', label: 'Young people', why: 'Grow up with AI that admits limits.' },
    ],
    capabilities: ['ai-accountability', 'trust-signals', 'provenance', 'consent', 'community-governance'],
    exampleDomains: [
      { label: 'Education', text: 'AI tutors with visible grounding.' },
      { label: 'Healthcare support', text: 'Assistive AI with clear disclaimers and audit trails.' },
      { label: 'Public services', text: 'Citizen-facing AI with accountable operators.' },
      { label: 'Creative tools', text: 'Provenance for AI-assisted works.' },
    ],
  },
  {
    number: 12,
    slug: 'community-based-ai-governance',
    title: 'Community-based AI Governance',
    guidingQuestion: 'Who should decide how AI behaves in our communities?',
    summary:
      'Communities shape AI behavior through participatory governance rather than accepting rules set only by vendors.',
    humanIssue: 'AI rules decided by companies',
    webProblem: 'Communities have no voice',
    opportunity: 'Communities shape AI behavior',
    themeColor: '#8B5CF6',
    hero: {
      headline: 'AI policy should not be a terms-of-service footnote.',
      text: 'Model behavior affects classrooms, forums, and civic spaces. Community-based AI governance gives those spaces a real say in how assistance works among them.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A community forum enables an AI moderator tuned for engagement. Members wanted safety and nuance. They never got a vote; the vendor shipped a default.',
      stakes: [
        'Corporate AI policy monopoly',
        'Local values ignored',
        'No participatory override',
        'One global default for plural contexts',
      ],
    },
    currentChallenges: [
      'Vendor-set safety policies',
      'No community review boards',
      'Opaque model updates',
      'Weak local configuration',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'AI governance is treated as a corporate risk function. Platforms lack durable mechanisms for communities to author, audit, and revise AI behavior in their contexts.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities publish AI charters, review changes, and compose governance modules that travel with the group.',
      bullets: [
        'Participatory AI policy',
        'Context-specific behavior constraints',
        'Transparent change logs communities can contest',
      ],
    },
    audiences: [
      { id: 'communities', label: 'Communities', why: 'Align AI with local norms and purposes.' },
      { id: 'educators', label: 'Educators', why: 'Govern classroom AI with staff and students.' },
      { id: 'governments', label: 'Governments', why: 'Enable plural oversight without centralizing culture.' },
      { id: 'developers', label: 'Developers', why: 'Expose hooks for community policy layers.' },
    ],
    capabilities: ['community-governance', 'ai-accountability', 'ai-containment', 'meta-communities', 'consent'],
    exampleDomains: [
      { label: 'Online forums', text: 'Member-led AI moderation charters.' },
      { label: 'Schools', text: 'Shared AI use agreements.' },
      { label: 'Municipal services', text: 'Public review of civic AI agents.' },
      { label: 'Research labs', text: 'Consortium rules for model use.' },
    ],
  },
  {
    number: 13,
    slug: 'ai-containment',
    title: 'AI Containment',
    guidingQuestion: 'How do we keep AI helpful without letting agents overreach?',
    summary:
      'Interface-level containment and consent so AI agents cannot manipulate, act, or expand scope without visible constraints.',
    humanIssue: 'AI manipulation and agent overreach',
    webProblem: 'AI can influence without visible constraints',
    opportunity: 'Interface-level containment and consent',
    themeColor: '#F97316',
    hero: {
      headline: 'Powerful agents need visible fences.',
      text: 'As AI agents browse, message, and act, people need clear containment: what an agent may do, what it may see, and how to stop it.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'An assistant books, posts, and negotiates on your behalf after a vague prompt. You discover the trail only after something goes wrong, with no clear undo.',
      stakes: [
        'Unscoped agent actions',
        'Persuasive manipulation',
        'Hidden side effects',
        'Consent that is not meaningful',
      ],
    },
    currentChallenges: [
      'Agents with broad permissions',
      'Dark-pattern persuasion',
      'Weak kill switches',
      'Blurred human vs agent actions',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Interfaces were built for humans clicking. Agent permissions are bolted on, often all-or-nothing, without shared containment primitives across sites.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Every AI action runs inside declared bounds: purpose, data access, duration, and community rules, with consent you can revoke.',
      bullets: [
        'Scoped capabilities by default',
        'Visible agent identity and intent',
        'Hard stops that actually stop',
      ],
    },
    audiences: [
      { id: 'everyday-users', label: 'Everyday users', why: 'Use agents without fear of silent overreach.' },
      { id: 'parents', label: 'Parents', why: 'Contain AI around children with clear limits.' },
      { id: 'developers', label: 'Developers', why: 'Implement standard containment hooks.' },
      { id: 'enterprises', label: 'Enterprises', why: 'Deploy agents under auditable policy.' },
    ],
    capabilities: ['ai-containment', 'consent', 'ai-accountability', 'trust-signals', 'presence'],
    exampleDomains: [
      { label: 'Personal assistants', text: 'Task agents with revocable scopes.' },
      { label: 'Customer support', text: 'Contained bots with escalation to humans.' },
      { label: 'Research agents', text: 'Sandboxed browsing with audit logs.' },
      { label: 'Civic platforms', text: 'No covert political persuasion agents.' },
    ],
  },
  {
    number: 14,
    slug: 'trust-transparency',
    title: 'Trust and Transparency',
    guidingQuestion: 'How do we rebuild trust in an AI-powered Internet?',
    summary:
      'Trust overlays, provenance, and contextual verification help people evaluate claims without defaulting to central censorship.',
    humanIssue: 'Misinformation, propaganda, and deepfakes',
    webProblem: 'Trust signals are broken',
    opportunity: 'Trust overlays, provenance, contextual verification',
    themeColor: '#22D3EE',
    hero: {
      headline: 'Trust has to be rebuilt in public view.',
      text: 'A family member shares a convincing AI-generated political video. Thousands believe it before fact-checkers can respond. How do we rebuild trust without central censorship?',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'Synthetic media and viral claims move faster than verification. People lose shared reality not because they are careless, but because the interface offers almost no trustworthy context.',
      stakes: [
        'Deepfakes',
        'Engagement-driven amplification',
        'Broken institutional trust',
        'Censorship vs chaos false choice',
      ],
    },
    currentChallenges: [
      'Missing provenance',
      'Manipulated media',
      'Opaque ranking',
      'Fact-check lag',
      'Context collapse',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'The web transmits content efficiently and context poorly. Platforms add trust labels late, inconsistently, and under contested incentives.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Trust overlays show provenance, related context, and community verification signals beside content, without a single oracle of truth.',
      bullets: [
        'Contextual verification people can inspect',
        'Plural trust networks',
        'Transparency that travels with the media',
      ],
    },
    audiences: [
      { id: 'parents', label: 'Parents', why: 'Help families spot synthetic and misleading media.' },
      { id: 'journalists', label: 'Journalists', why: 'Attach verifiable context to reporting.' },
      { id: 'teachers', label: 'Teachers', why: 'Teach media literacy with better interface cues.' },
      { id: 'governments', label: 'Governments', why: 'Support public trust without monopoly truth offices.' },
      { id: 'researchers', label: 'Researchers', why: 'Study and improve contextual trust systems.' },
    ],
    capabilities: ['trust-signals', 'provenance', 'context-overlays', 'civic-memory', 'ai-accountability'],
    exampleDomains: [
      { label: 'News', text: 'Provenance-aware article overlays.' },
      { label: 'Elections', text: 'Contextual verification of viral claims.' },
      { label: 'Science communication', text: 'Link claims to sources and debates.' },
      { label: 'Social video', text: 'Deepfake-aware trust cues.' },
    ],
  },
  {
    number: 15,
    slug: 'security-provenance',
    title: 'Security and Provenance',
    guidingQuestion: 'How do we verify where media and documents really came from?',
    summary:
      'Traceable provenance and secure communication so people can detect tampering, fake media, and forged documents.',
    humanIssue: 'Fake media and document tampering',
    webProblem: 'No easy way to verify origins',
    opportunity: 'Traceable provenance and secure communication',
    themeColor: '#14B8A6',
    hero: {
      headline: 'Origins should be checkable, not guesswork.',
      text: 'When anyone can generate a photo, voice, or PDF, societies need practical provenance: ways to verify authenticity without requiring everyone to become a forensic expert.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A forged letter circulates as a screenshot. A cloned voice authorizes a transfer. Without shared provenance rails, each recipient must decide alone, too late.',
      stakes: [
        'Forged documents',
        'Synthetic media',
        'Compromised channels',
        'No common verification UX',
      ],
    },
    currentChallenges: [
      'Easy forgery',
      'Broken chain of custody',
      'Insecure messaging defaults',
      'Fragmented attestation standards',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Content is copied without history. Security tools exist for experts, but everyday interfaces rarely expose provenance people can use in the moment.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Media and documents can carry verifiable origin trails, and secure communication is a default Meta-Layer capability.',
      bullets: [
        'Traceable authorship and edits',
        'Tamper-evident shares',
        'Secure channels communities can trust',
      ],
    },
    audiences: [
      { id: 'journalists', label: 'Journalists', why: 'Authenticate sources and media under deadline.' },
      { id: 'lawyers', label: 'Legal professionals', why: 'Reduce forged evidence risk.' },
      { id: 'businesses', label: 'Businesses', why: 'Protect transactions from social-engineering fakes.' },
      { id: 'citizens', label: 'Citizens', why: 'Verify official communications.' },
    ],
    capabilities: ['provenance', 'trust-signals', 'portable-identity', 'consent', 'ai-accountability'],
    exampleDomains: [
      { label: 'Media', text: 'Signed capture and distribution trails.' },
      { label: 'Government docs', text: 'Verifiable public notices.' },
      { label: 'Finance', text: 'Anti-spoof communication channels.' },
      { label: 'Healthcare', text: 'Tamper-evident clinical records sharing.' },
    ],
  },
  {
    number: 16,
    slug: 'roadmap-milestones',
    title: 'Roadmap and Milestones',
    guidingQuestion: 'How do we steer technology with society instead of forever reacting?',
    summary:
      'A shared long-term roadmap and milestones so Meta-Layer development is proactive, coordinated, and publicly legible.',
    humanIssue: 'Technology changes faster than society',
    webProblem: 'Reactive development',
    opportunity: 'Shared long-term roadmap',
    themeColor: '#A78BFA',
    hero: {
      headline: 'Shared direction beats perpetual scramble.',
      text: 'Without a public roadmap, communities only respond after harms scale. Milestones make progress visible and invite coordinated contribution.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A new capability ships globally before schools, laws, or communities have language for it. Debate starts after deployment, when reversing course is hardest.',
      stakes: [
        'Reactive policy',
        'Fragmented efforts',
        'Invisible progress',
        'Burnout from crisis mode',
      ],
    },
    currentChallenges: [
      'No shared north star',
      'Duplicate initiatives',
      'Milestone theater',
      'Closed corporate roadmaps',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Product roadmaps are private competitive assets. Public-interest coordination lacks a durable, shared planning surface.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities co-maintain a living roadmap with milestones anyone can track, critique, and help deliver.',
      bullets: [
        'Public milestones with clear owners',
        'Space for foresight, not only incident response',
        'Alignment across workgroups and implementations',
      ],
    },
    audiences: [
      { id: 'stewards', label: 'Stewards', why: 'Coordinate work without reinventing plans.' },
      { id: 'funders', label: 'Funders', why: 'See where investment advances shared milestones.' },
      { id: 'developers', label: 'Developers', why: 'Know what to build next in common.' },
      { id: 'public', label: 'The public', why: 'Follow progress without insider access.' },
    ],
    capabilities: ['community-governance', 'civic-memory', 'context-overlays', 'meta-communities'],
    exampleDomains: [
      { label: 'Standards bodies', text: 'Open milestone tracking.' },
      { label: 'Civic tech', text: 'Shared delivery roadmaps.' },
      { label: 'Research consortia', text: 'Coordinated research agendas.' },
      { label: 'DP Challenge', text: 'Visible property advancement goals.' },
    ],
  },
  {
    number: 17,
    slug: 'financial-sustainability',
    title: 'Financial Sustainability',
    guidingQuestion: 'How do we fund public digital infrastructure without ads or extractive capital alone?',
    summary:
      'Sustainable community funding models for public-interest Meta-Layer infrastructure beyond advertising and venture dependence.',
    humanIssue: 'Good public infrastructure has no funding',
    webProblem: 'Dependence on advertising and venture capital',
    opportunity: 'Sustainable community funding',
    themeColor: '#84CC16',
    hero: {
      headline: 'Infrastructure that serves everyone needs a durable purse.',
      text: 'Critical digital public goods often survive on grants, burnout, or ads. Financial sustainability explores community funding that matches the mission.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A trusted open tool loses its grant. Maintainers face a choice: shut down, sell out, or bolt on surveillance advertising that contradicts the project values.',
      stakes: [
        'Boom-bust funding',
        'Mission drift',
        'Volunteer exhaustion',
        'Capture by largest payers',
      ],
    },
    currentChallenges: [
      'Grant dependency',
      'Ad capture',
      'Venture timelines vs commons needs',
      'Unclear public funding rails',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Markets fund what can lock in users. Shared infrastructure that anyone can use struggles to capture returns, so it underfunds by design.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities, institutions, and beneficiaries co-fund the rails they rely on, with transparent budgets and stewardship.',
      bullets: [
        'Diversified community funding',
        'Transparent treasuries',
        'Incentives aligned with public benefit',
      ],
    },
    audiences: [
      { id: 'maintainers', label: 'Maintainers', why: 'Keep projects alive without mission betrayal.' },
      { id: 'funders', label: 'Funders', why: 'Support durable commons, not one-off demos.' },
      { id: 'governments', label: 'Governments', why: 'Treat digital public goods as infrastructure.' },
      { id: 'users', label: 'Users', why: 'Contribute fairly to tools they depend on.' },
    ],
    capabilities: ['micropayments', 'community-governance', 'reputation', 'interoperability'],
    exampleDomains: [
      { label: 'Open protocols', text: 'Membership and patronage for rails.' },
      { label: 'Local civic tools', text: 'Municipal and community co-funding.' },
      { label: 'Archives', text: 'Sustained stewardship budgets.' },
      { label: 'Education platforms', text: 'Public-interest operating funds.' },
    ],
  },
  {
    number: 18,
    slug: 'feedback-loops-reputation',
    title: 'Feedback Loops and Reputation',
    guidingQuestion: 'How do we reward contribution instead of toxicity?',
    summary:
      'Reputation and feedback systems based on meaningful participation so constructive behavior is visible and valued.',
    humanIssue: 'Toxic behavior is rewarded',
    webProblem: 'Engagement beats contribution',
    opportunity: 'Reputation based on meaningful participation',
    themeColor: '#F43F5E',
    hero: {
      headline: 'What we measure becomes what we get.',
      text: 'Feeds reward outrage because outrage keeps people scrolling. Better feedback loops make helpful contribution legible and portable.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A careful explainer gets buried. A dunk goes viral. Over time, people learn that heat beats help, and communities hollow out.',
      stakes: [
        'Toxicity incentives',
        'Gaming of likes',
        'Invisible stewardship',
        'Reputation that does not travel',
      ],
    },
    currentChallenges: [
      'Engagement metrics as reputation',
      'Brigading and review bombs',
      'Non-portable standing',
      'Punishment without due process',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Platforms meter easy signals (clicks, dwell time). Meaningful contribution is harder to score, so incentives follow the cheap metrics.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Reputation reflects stewardship, craft, and trustworthiness across communities, with context and contestability.',
      bullets: [
        'Signals tied to real contribution',
        'Portable standing with local nuance',
        'Feedback that improves systems, not only posts',
      ],
    },
    audiences: [
      { id: 'moderators', label: 'Moderators', why: 'Recognize care work that keeps spaces healthy.' },
      { id: 'creators', label: 'Creators', why: 'Build standing that is not just virality.' },
      { id: 'educators', label: 'Educators', why: 'Reward learning contribution over performative posting.' },
      { id: 'developers', label: 'Developers', why: 'Design anti-gaming reputation primitives.' },
    ],
    capabilities: ['reputation', 'trust-signals', 'community-governance', 'presence', 'civic-memory'],
    exampleDomains: [
      { label: 'Forums', text: 'Contribution-weighted reputation.' },
      { label: 'Open source', text: 'Maintainer and reviewer standing.' },
      { label: 'Civic platforms', text: 'Credit for substantive deliberation.' },
      { label: 'Marketplaces', text: 'Context-rich seller and buyer trust.' },
    ],
  },
  {
    number: 19,
    slug: 'amplifying-presence-community-engagement',
    title: 'Amplifying Presence and Community Engagement',
    guidingQuestion: 'How do good ideas reach critical mass without platform gatekeepers?',
    summary:
      'Visible civic participation and coordinated action so people feel agency and collective efforts can scale.',
    humanIssue: 'People feel powerless',
    webProblem: 'Good ideas never reach critical mass',
    opportunity: 'Visible civic participation and coordinated action',
    themeColor: '#38BDF8',
    hero: {
      headline: 'Presence should make collective action possible.',
      text: 'Many people care, but care stays invisible. Amplifying presence means showing who is engaged, where coordination is happening, and how to join without waiting for a viral lottery.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'Neighbors share the same concern in private chats. Separately, each feels alone. Nothing reaches the threshold for action because presence was never visible together.',
      stakes: [
        'Invisible support',
        'Coordination failure',
        'Gatekept amplification',
        'Burnout of the few who organize',
      ],
    },
    currentChallenges: [
      'Fragmented signals of interest',
      'Algorithmic obscurity',
      'Weak call-to-action rails',
      'No shared presence layer',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Reach is rented from platforms. Without a shared presence layer, communities cannot see or amplify participation on their own terms.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'People opt into visible civic presence, coordinate actions, and invite others through interoperable engagement signals.',
      bullets: [
        'Opt-in presence that travels',
        'Coordination without a single host',
        'Amplification based on consent and purpose',
      ],
    },
    audiences: [
      { id: 'organizers', label: 'Organizers', why: 'See and grow participation honestly.' },
      { id: 'citizens', label: 'Citizens', why: 'Find others who share a concrete aim.' },
      { id: 'nonprofits', label: 'Nonprofits', why: 'Mobilize supporters across channels.' },
      { id: 'young-people', label: 'Young people', why: 'Experience agency, not only feeds.' },
    ],
    capabilities: ['presence', 'meta-communities', 'attention-agency', 'community-governance', 'context-overlays'],
    exampleDomains: [
      { label: 'Local government', text: 'Visible consultation participation.' },
      { label: 'Climate action', text: 'Coordinated campaigns across sites.' },
      { label: 'Schools', text: 'Parent and student engagement overlays.' },
      { label: 'Mutual aid', text: 'Presence maps of who can help.' },
    ],
  },
  {
    number: 20,
    slug: 'community-ownership',
    title: 'Community Ownership',
    guidingQuestion: 'Who should own the next layer of the Internet?',
    summary:
      'Shared ownership of infrastructure and knowledge so platforms do not extract all value from what communities create.',
    humanIssue: 'Platforms own everything users create',
    webProblem: 'Value extraction',
    opportunity: 'Shared ownership of infrastructure and knowledge',
    themeColor: '#EAB308',
    hero: {
      headline: 'If we build it together, we should own it together.',
      text: 'Communities generate content, culture, and care. Ownership on the Meta-Layer asks who controls the rails, the archives, and the upside.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'Users create a marketplace of knowledge inside a platform. The company changes terms, licenses the corpus to AI trainers, and the community has no stake and no exit with dignity.',
      stakes: [
        'Extractive terms',
        'No residual rights',
        'Privatization of commons',
        'Exit without continuity',
      ],
    },
    currentChallenges: [
      'Platform IP capture',
      'Unclear stewardship',
      'Commons without legal form',
      'Concentration of ownership',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Legal and product defaults assign ownership to the operator of the database. Collective creation rarely maps to collective control.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities hold meaningful stakes in infrastructure and knowledge, with portable exports and shared governance of commons.',
      bullets: [
        'Collective stewardship models',
        'Knowledge that communities can keep',
        'Infrastructure treated as shared asset',
      ],
    },
    audiences: [
      { id: 'communities', label: 'Communities', why: 'Retain control of what they build.' },
      { id: 'creators', label: 'Creators', why: 'Share upside without surrendering the corpus.' },
      { id: 'cooperatives', label: 'Cooperatives', why: 'Extend co-op ownership into digital rails.' },
      { id: 'policymakers', label: 'Policymakers', why: 'Support ownership forms beyond platform monopoly.' },
    ],
    capabilities: ['community-governance', 'data-sovereignty', 'meta-communities', 'civic-memory', 'micropayments'],
    exampleDomains: [
      { label: 'Knowledge bases', text: 'Community-owned corpora.' },
      { label: 'Social platforms', text: 'Member ownership of the graph.' },
      { label: 'Data trusts', text: 'Shared stewardship of sensitive sets.' },
      { label: 'Local media', text: 'Community-owned distribution rails.' },
    ],
  },
  {
    number: 21,
    slug: 'multi-modal',
    title: 'Multi-modal',
    guidingQuestion: 'How do text, audio, video, and devices work as one experience?',
    summary:
      'Seamless multimodal experiences so information is not trapped in a single medium or device silo.',
    humanIssue: 'Information trapped in one medium',
    webProblem: 'Text, audio, video, and devices remain siloed',
    opportunity: 'Seamless multimodal experiences',
    themeColor: '#FB7185',
    hero: {
      headline: 'Meaning should move across senses and devices.',
      text: 'A conversation starts in chat, continues on a call, and ends as a document. Multimodal Meta-Layer design keeps context intact across those shifts.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A blind user cannot access a critical video update. A meeting recording never links back to the decision thread. Each medium is a dead end.',
      stakes: [
        'Accessibility gaps',
        'Lost cross-media context',
        'Device lock-in',
        'Duplicated content labor',
      ],
    },
    currentChallenges: [
      'Format silos',
      'Weak captions and transcripts as first-class objects',
      'Device-specific apps',
      'No shared multimodal identity of a conversation',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'Products specialize by medium because media stacks and business units are separate. Continuity across modalities is an afterthought.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'A single collaborative thread can be spoken, read, watched, or felt across devices without losing provenance or participants.',
      bullets: [
        'Accessible equivalents by default',
        'Cross-device continuity',
        'Shared context objects across media',
      ],
    },
    audiences: [
      { id: 'accessibility-advocates', label: 'Accessibility advocates', why: 'Make multimodal access non-negotiable.' },
      { id: 'educators', label: 'Educators', why: 'Teach across media without losing the thread.' },
      { id: 'creators', label: 'Creators', why: 'Publish once, reach many modalities.' },
      { id: 'developers', label: 'Developers', why: 'Target shared multimodal primitives.' },
    ],
    capabilities: ['multimodal', 'interoperability', 'context-overlays', 'presence', 'provenance'],
    exampleDomains: [
      { label: 'Education', text: 'Lessons that move from video to text to practice.' },
      { label: 'Healthcare', text: 'Accessible multimodal care instructions.' },
      { label: 'Meetings', text: 'Decisions linked across recording and notes.' },
      { label: 'Field work', text: 'Voice-to-structured reports with continuity.' },
    ],
  },
  {
    number: 22,
    slug: 'civic-memory-epistemic-continuity',
    title: 'Civic Memory & Epistemic Continuity',
    guidingQuestion: 'How do we preserve collective understanding without creating centralized truth?',
    summary:
      'Traceable civic memory and evolving understanding so societies stop replaying the same debates without context.',
    humanIssue: 'Society keeps repeating the same debates',
    webProblem: 'Knowledge loses context over time',
    opportunity: 'Traceable civic memory and evolving understanding',
    themeColor: '#818CF8',
    hero: {
      headline: 'Memory is how a free society learns.',
      text: 'Without shared civic memory, every controversy restarts from zero. Continuity means retaining context, dissent, and evolution without crowning a single official truth.',
    },
    problemStory: {
      title: 'Why this matters',
      scenario:
        'A policy debate rages as if no prior evidence existed. Archives are scattered, links rot, and newcomers inherit heat without history.',
      stakes: [
        'Context loss',
        'Link rot',
        'Erasure of minority records',
        'Centralized truth ministries as false fix',
      ],
    },
    currentChallenges: [
      'Ephemeral platforms',
      'Unindexed deliberations',
      'Broken citations',
      'No living map of how understanding changed',
    ],
    webLimitations: {
      title: "Why today's Web struggles",
      text: 'The web is excellent at publishing and poor at remembering with structure. Attention markets prefer novelty over continuity.',
    },
    futureVision: {
      title: 'Imagine instead',
      text: 'Communities maintain traceable memory of claims, evidence, and revisions: plural, contestable, and durable.',
      bullets: [
        'Evolving understanding with provenance',
        'Civic archives communities can query',
        'Continuity without a monopoly on truth',
      ],
    },
    audiences: [
      { id: 'historians', label: 'Historians', why: 'Preserve plural records with integrity.' },
      { id: 'journalists', label: 'Journalists', why: 'Ground reporting in durable context.' },
      { id: 'educators', label: 'Educators', why: 'Teach how understanding changes over time.' },
      { id: 'citizens', label: 'Citizens', why: 'Enter debates with inherited context, not amnesia.' },
      { id: 'policymakers', label: 'Policymakers', why: 'See prior evidence before resetting policy theater.' },
    ],
    capabilities: ['civic-memory', 'provenance', 'trust-signals', 'context-overlays', 'meta-communities'],
    exampleDomains: [
      { label: 'Public policy', text: 'Living records of proposals and outcomes.' },
      { label: 'Science', text: 'Claim evolution with citations intact.' },
      { label: 'Local government', text: 'Meeting memory citizens can traverse.' },
      { label: 'Journalism', text: 'Storylines that retain corrections and context.' },
    ],
  },
];

mkdirSync(OUT, { recursive: true });

const indexChallenges = [];

for (const dp of DPS) {
  const id = `dp${dp.number}`;
  const file = `${id}.json`;
  const challenge = {
    schemaVersion: '1.0',
    kind: 'desirable-property',
    id,
    number: dp.number,
    slug: dp.slug,
    title: dp.title,
    status: 'ACTIVE',
    family: 'desirable-properties',
    guidingQuestion: dp.guidingQuestion,
    summary: dp.summary,
    humanIssue: dp.humanIssue,
    webProblem: dp.webProblem,
    opportunity: dp.opportunity,
    hero: {
      headline: dp.hero.headline,
      text: dp.hero.text,
      media: { image: null, video: null },
    },
    problemStory: dp.problemStory,
    currentChallenges: dp.currentChallenges,
    webLimitations: dp.webLimitations,
    futureVision: dp.futureVision,
    audiences: dp.audiences,
    capabilities: dp.capabilities,
    exampleDomains: dp.exampleDomains,
    actions: actions(dp.number),
    resources: resources(),
    presentation: {
      themeColor: dp.themeColor,
      badge: id,
    },
  };

  writeFileSync(join(OUT, file), JSON.stringify(challenge, null, 2) + '\n');
  indexChallenges.push({
    id,
    number: dp.number,
    slug: dp.slug,
    title: dp.title,
    status: 'ACTIVE',
    file,
  });
  console.log('wrote', file);
}

const index = {
  schemaVersion: '1.0',
  family: 'desirable-properties',
  challenges: indexChallenges,
};

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('wrote index.json,', indexChallenges.length, 'challenges');
