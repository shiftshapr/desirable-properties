import fs from 'fs';

const ESTATE_ENV_PATHS = [
  '/home/ubuntu/neo4j-knowledge-graph/.env',
  '/home/ubuntu/metaweb-book/stripe-server/.env',
  '/home/ubuntu/canopi/.env',
] as const;

function readEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/** Match neo4j-knowledge-graph/src/hermes/env.js secret resolution for Hermes HTTP. */
export function resolveHermesChatSecret(): string {
  for (const filePath of ESTATE_ENV_PATHS) {
    const env = readEnvFile(filePath);
    const secret = env.HERMES_CHAT_SECRET || env.METAWEB_OPS_SECRET || '';
    if (secret) return secret;
  }
  return process.env.HERMES_CHAT_SECRET || process.env.METAWEB_OPS_SECRET || '';
}
