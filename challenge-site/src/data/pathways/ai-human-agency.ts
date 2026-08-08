import type {
  PathwayMeta,
  PathwayPrinciple,
  PathwayQuestion,
} from '@/lib/pathways';

function dp(id: string, name: string) {
  return { id, name, href: `/dp/${id.toLowerCase()}` };
}

export const AI_HUMAN_AGENCY_META: PathwayMeta = {
  slug: 'ai-human-agency',
  title: 'AI & Human Agency',
  subtitle: 'A pro-human pathway through the Desirable Properties',
  seoTitle: 'AI & Human Agency | Desirable Properties Challenge',
  seoDescription:
    'What properties should the digital world possess if AI becomes our primary interface to the Internet? Explore intellectual sovereignty, intellectual subsidiarity, human agency, shared context, and the Desirable Properties of a human-centered layered Web.',
  hermesPrompt:
    'Help me evaluate the Desirable Properties from a pro-human AI perspective. I am particularly interested in intellectual sovereignty, intellectual subsidiarity, persistent human context, freedom from mandatory AI mediation, community autonomy, and the ability for humans to encounter one another directly. Show me what the current Desirable Properties already address, where tensions exist, and where there may be gaps.',
  hermesHref:
    '/agent?starter=ai-human-agency&prompt=' +
    encodeURIComponent(
      'Help me evaluate the Desirable Properties from a pro-human AI perspective. I am particularly interested in intellectual sovereignty, intellectual subsidiarity, persistent human context, freedom from mandatory AI mediation, community autonomy, and the ability for humans to encounter one another directly. Show me what the current Desirable Properties already address, where tensions exist, and where there may be gaps.',
    ),
};

export const AI_HUMAN_AGENCY_PRINCIPLES: PathwayPrinciple[] = [
  {
    id: 'intellectual-sovereignty',
    title: 'Intellectual Sovereignty',
    statement:
      'Humans and human communities should retain ultimate authority over their judgment, meaning-making, and understanding of the world.',
    body: [
      'Intellectual sovereignty does not mean refusing AI assistance. It asks whether people retain meaningful access to information, competing interpretations, collective memory, and the ability to reason and associate independently of a mandatory cognitive intermediary.',
    ],
  },
  {
    id: 'intellectual-subsidiarity',
    title: 'Intellectual Subsidiarity',
    statement:
      'Cognitive functions should remain as close as practicable to the people and communities capable of exercising them, while being delegated to AI when delegation genuinely increases human capability without unnecessarily transferring human agency.',
    body: [
      'AI can search, translate, summarize, retrieve, compare, calculate, and identify patterns without therefore becoming the authority that determines what a community believes or what an individual should value.',
    ],
  },
];

export const AI_HUMAN_AGENCY_QUESTIONS: PathwayQuestion[] = [
  {
    id: 'who-remains-in-control',
    title: 'Who remains in control?',
    framing: [
      'As AI increasingly selects, interprets, recommends, and acts upon information, how do individuals retain meaningful authority over their digital experience rather than merely choosing among experiences constructed for them?',
    ],
    dpLinks: [
      dp('DP2', 'Participant Agency and Empowerment'),
      dp('DP4', 'Data Sovereignty and Privacy'),
      dp('DP12', 'Community-based AI Governance'),
      dp('DP1', 'Federated Authentication & Accountability'),
    ],
    prompt:
      'Does participant agency adequately encompass intellectual sovereignty, or is cognitive authority distinct enough to require additional treatment?',
  },
  {
    id: 'who-governs-the-intelligence',
    title: 'Who governs the intelligence?',
    framing: [
      'Should the behavioral boundaries of AI be determined by model providers, governments, individuals, communities, or some combination of these? A plural digital environment should allow communities to establish meaningful rules without requiring one global conception of acceptable machine behavior.',
    ],
    dpLinks: [
      dp('DP11', 'Safe and Ethical AI'),
      dp('DP12', 'Community-based AI Governance'),
      dp('DP13', 'AI Containment'),
      dp('DP3', 'Adaptive Governance Supporting an Exponentially Growing Community'),
      dp('DP14', 'Trust and Transparency'),
    ],
    prompt: 'How should global safeguards coexist with local and community authority?',
  },
  {
    id: 'who-interprets-reality',
    title: 'Who interprets reality?',
    framing: [
      'AI increasingly summarizes, ranks, retrieves, contextualizes, and synthesizes information. These operations shape meaning, even when the underlying information remains unchanged. How do we preserve competing interpretations, provenance, contestability, and shared reference points?',
    ],
    dpLinks: [
      dp('DP22', 'Civic Memory & Epistemic Continuity'),
      dp('DP14', 'Trust and Transparency'),
      dp('DP15', 'Security and Provenance'),
      dp('DP2', 'Participant Agency and Empowerment'),
    ],
    prompt:
      'How do we prevent personalized AI mediation from turning shared reality into isolated private narratives—or machine synthesis into an implicit truth authority?',
  },
  {
    id: 'where-do-humans-meet',
    title: 'Where do humans meet?',
    framing: [
      'An AI can summarize a community without creating a community. It can tell us what others think without giving those people persistent space in which to encounter one another. If AI increasingly becomes our interface to information, where does independent human presence live?',
    ],
    dpLinks: [
      dp('DP8', 'Collaborative Environment and Meta-Communities'),
      dp('DP19', 'Amplifying Presence and Community Engagement'),
      dp('DP22', 'Civic Memory & Epistemic Continuity'),
      dp('DP2', 'Participant Agency and Empowerment'),
      dp('DP20', 'Community Ownership'),
    ],
    prompt:
      'Should persistent human-to-human space be an explicit architectural requirement of a pro-human Meta-Layer?',
  },
  {
    id: 'must-everything-pass-through-ai',
    title: 'Must everything pass through AI?',
    framing: [
      'AI may become an extraordinarily useful universal adapter between people, websites, applications, agents, databases, and services. But interoperability mediated by AI is not the same as interoperability among the underlying participants.',
    ],
    dpLinks: [
      dp('DP7', 'Simplicity and Interoperability'),
      dp('DP2', 'Participant Agency and Empowerment'),
      dp('DP8', 'Collaborative Environment and Meta-Communities'),
      dp('DP4', 'Data Sovereignty and Privacy'),
      dp('DP5', 'Decentralized Namespace'),
    ],
    candidateConcept: {
      name: 'Freedom from Mandatory AI Mediation',
      description:
        'Should humans and communities retain practical pathways to discover, interact, associate, and exchange context without requiring an AI intermediary?',
    },
    prompt:
      'Is freedom from mandatory AI mediation already implicit in interoperability and agency—or should it be made explicit?',
  },
  {
    id: 'what-should-we-delegate',
    title: 'What should we delegate?',
    framing: [
      'Pro-human design does not require humans to perform tasks machines can perform better. The question is where assistance ends and unnecessary transfer of intellectual agency begins.',
      'AI can scan thousands of documents while humans determine what matters. AI can translate a community’s discussion without replacing the community’s voice. AI can summarize deliberation without eliminating the deliberation. AI can identify patterns without possessing final authority over their meaning.',
    ],
    dpLinks: [
      dp('DP11', 'Safe and Ethical AI'),
      dp('DP12', 'Community-based AI Governance'),
      dp('DP2', 'Participant Agency and Empowerment'),
      dp('DP8', 'Collaborative Environment and Meta-Communities'),
    ],
    candidateConcept: {
      name: 'Intellectual Subsidiarity',
      description:
        'Cognitive functions remain as close as practicable to the people and communities capable of exercising them, while being delegated upward when doing so genuinely increases human capability without unnecessarily transferring agency.',
    },
    prompt:
      'Is intellectual subsidiarity already implicit across the current Desirable Properties, should it become a cross-cutting design principle, or does it identify a missing property?',
  },
  {
    id: 'who-holds-cognitive-authority',
    title: 'Who ultimately holds cognitive authority?',
    framing: [
      'A society may technically retain access to information while becoming functionally dependent upon a small number of systems to interpret that information. Pro-human infrastructure should consider not only data sovereignty but sovereignty over judgment and meaning.',
    ],
    dpLinks: [
      dp('DP2', 'Participant Agency and Empowerment'),
      dp('DP4', 'Data Sovereignty and Privacy'),
      dp('DP22', 'Civic Memory & Epistemic Continuity'),
      dp('DP14', 'Trust and Transparency'),
    ],
    candidateConcept: {
      name: 'Intellectual Sovereignty',
      description:
        'Humans and human communities retain ultimate authority over judgment, meaning-making, and understanding.',
    },
    prompt:
      'Does Participant Agency sufficiently protect this, or should intellectual sovereignty be treated separately from control over identity, data, and interface?',
  },
];

/** DP pages that should show a Related Pathway card. */
export const AI_HUMAN_AGENCY_RELATED_DP_IDS = [
  'DP2',
  'DP8',
  'DP11',
  'DP12',
  'DP13',
  'DP22',
] as const;
