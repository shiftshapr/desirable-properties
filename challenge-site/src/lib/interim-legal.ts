import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readLegal(name: string): string {
  return readFileSync(join(process.cwd(), 'src/data/legal', name), 'utf8');
}

export function privacyBodyHtml(): string {
  return readLegal('privacy-body.html');
}

export function termsBodyHtml(): string {
  return readLegal('terms-body.html');
}

export function oarsDpHtml(): string {
  return readLegal('oars-dp.html');
}
