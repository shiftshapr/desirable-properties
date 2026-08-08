/** Shared types for contextual pathways through the Desirable Properties. */

export type PathwayDpLink = {
  id: string;
  name: string;
  href: string;
};

export type PathwayQuestion = {
  id: string;
  title: string;
  framing: string[];
  dpLinks: PathwayDpLink[];
  candidateConcept?: {
    name: string;
    description: string;
  };
  prompt: string;
};

export type PathwayPrinciple = {
  id: string;
  title: string;
  statement: string;
  body: string[];
};

export type PathwayMeta = {
  slug: string;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  hermesPrompt: string;
  hermesHref: string;
};
