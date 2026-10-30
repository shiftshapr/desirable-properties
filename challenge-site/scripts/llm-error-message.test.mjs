// Style check: provider errors become plain words for reviewers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { llmErrorMessage } from '../src/lib/llm-error-message.ts';

test('out of credit, bad key, rate limit and unknown errors read plainly', () => {
  const minimax = 'openai 402: {"type":"error","error":{"type":"insufficient_balance_error","message":"insufficient balance (1008)","http_code":"402"}}';
  assert.match(llmErrorMessage(minimax), /out of credit/);
  assert.match(llmErrorMessage('openai 429: {"error":{"type":"insufficient_quota"}}'), /out of credit/);
  assert.match(llmErrorMessage('openai 401: invalid_api_key'), /rejected this server's key/);
  assert.match(llmErrorMessage('openai 429: rate_limit_exceeded'), /busy/);
  assert.match(llmErrorMessage('No model API key on this server.'), /not configured/);
  assert.match(llmErrorMessage('socket hang up'), /did not answer/);
  assert.match(llmErrorMessage(null), /did not answer/);
});
