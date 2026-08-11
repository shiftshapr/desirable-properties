/** Opens /support with feedback form pre-selected (category + subject hint). */
export function hermesExperimentalFeedbackHref(opts?: {
  workgroupSlug?: string;
  workgroupName?: string;
}): string {
  const params = new URLSearchParams({ feedback: '1' });
  if (opts?.workgroupSlug) params.set('workgroup', opts.workgroupSlug);
  if (opts?.workgroupName) params.set('context', opts.workgroupName);
  return `/support?${params.toString()}`;
}
