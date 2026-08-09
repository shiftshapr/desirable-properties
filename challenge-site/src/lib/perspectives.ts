/** Lightweight Perspectives content type – essays for discussion, not canonical DPs. */

export type PerspectiveMeta = {
  slug: string;
  title: string;
  subtitle: string;
  deck: string;
  seoTitle: string;
  seoDescription: string;
  /** Essay body as Markdown (headings, paragraphs, lists, links). */
  bodyMarkdown: string;
};
