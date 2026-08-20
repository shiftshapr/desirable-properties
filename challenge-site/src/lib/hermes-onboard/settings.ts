import { isOnboardTabId, type OnboardTabId } from '@/lib/hermes-onboard/tabs';
import { ensureDpSchema } from '@/lib/dp-db';
import fs from 'fs';
import path from 'path';

export type OnSettings = {
  property: string;
  defaultTab: OnboardTabId;
  updatedAt: string | null;
  updatedBy: string | null;
};

const DATA_DIR = path.join(process.cwd(), 'data', 'hermes-onboard');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export function onPropertyId(): string {
  const explicit = process.env.DP_ON_PROPERTY?.trim();
  if (explicit) return explicit;
  const base = process.env.DP_PUBLIC_BASE || '';
  if (base.includes('theoverweb')) return 'theoverweb';
  return 'desirableproperties';
}

function envDefaultTab(): OnboardTabId | null {
  const raw = process.env.DP_ON_DEFAULT_TAB?.trim();
  return isOnboardTabId(raw) ? raw : null;
}

function readFileSettings(): OnSettings | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as Partial<OnSettings>;
    if (!isOnboardTabId(parsed.defaultTab)) return null;
    return {
      property: String(parsed.property || onPropertyId()),
      defaultTab: parsed.defaultTab,
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || null,
    };
  } catch {
    return null;
  }
}

function writeFileSettings(settings: OnSettings): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
}

export async function getOnSettings(): Promise<OnSettings> {
  const property = onPropertyId();
  const pool = await ensureDpSchema();
  if (pool) {
    const result = await pool.query(
      'SELECT property, default_tab, updated_at, updated_by FROM hermes_on_settings WHERE property = $1',
      [property],
    );
    const row = result.rows[0];
    if (row && isOnboardTabId(row.default_tab)) {
      return {
        property,
        defaultTab: row.default_tab,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        updatedBy: row.updated_by || null,
      };
    }
  } else {
    const file = readFileSettings();
    if (file) return file;
  }
  return {
    property,
    defaultTab: envDefaultTab() || 'dp',
    updatedAt: null,
    updatedBy: null,
  };
}

export async function saveOnSettings(
  defaultTab: OnboardTabId,
  updatedBy: string | null,
): Promise<OnSettings> {
  const property = onPropertyId();
  const settings: OnSettings = {
    property,
    defaultTab,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  const pool = await ensureDpSchema();
  if (pool) {
    await pool.query(
      `INSERT INTO hermes_on_settings (property, default_tab, updated_at, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (property) DO UPDATE SET
         default_tab = EXCLUDED.default_tab,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by`,
      [property, defaultTab, settings.updatedAt, updatedBy],
    );
    return settings;
  }
  writeFileSettings(settings);
  return settings;
}
