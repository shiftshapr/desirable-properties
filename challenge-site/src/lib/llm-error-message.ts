/**
 * What to tell a reviewer when the style-check model call fails. The raw provider error is kept in
 * dp_style_check; people see the cause in plain words.
 */
export function llmErrorMessage(raw: string | null | undefined): string {
  const text = String(raw || '');
  if (/\b402\b|insufficient[_ ]balance|insufficient_quota|exceeded your current quota|billing|credit balance/i.test(text)) {
    return 'The style-check model account is out of credit. An admin needs to top it up.';
  }
  if (/\b401\b|\b403\b|invalid[_ ]api[_ ]key|unauthori[sz]ed/i.test(text)) {
    return "The style-check model rejected this server's key. An admin needs to check it.";
  }
  if (/\b429\b|rate[_ ]limit/i.test(text)) return 'The style-check model is busy.';
  if (/No model API key/i.test(text)) return 'Style check is not configured on this server.';
  return 'The style-check model did not answer.';
}
