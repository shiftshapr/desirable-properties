'use client';

import { useEffect, useState } from 'react';
import { fetchHermesSettings, updateHermesSettings } from '@/lib/hermes-ambient-api';
import {
  DEFAULT_HERMES_WORKGROUP_SETTINGS,
  HERMES_MODE_LABELS,
  type HermesAmbientMode,
  type HermesWorkgroupSettings,
} from '@/lib/hermes-ambient-types';

const ALL_MODES: HermesAmbientMode[] = ['observer', 'facilitator', 'devils_advocate'];

type Props = {
  workgroupId: string;
};

export default function HermesAmbientSettingsPanel({ workgroupId }: Props) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<HermesWorkgroupSettings | null>(null);
  const [configured, setConfigured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const data = await fetchHermesSettings(workgroupId);
        setConfigured(data.configured);
        setSettings(
          data.settings || {
            workgroupId,
            ...DEFAULT_HERMES_WORKGROUP_SETTINGS,
            updatedAt: null,
            updatedBy: null,
          },
        );
      } catch {
        setMessage('Could not load Hermes settings');
      }
    })();
  }, [open, workgroupId]);

  if (!configured) return null;

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateHermesSettings(workgroupId, {
        confidenceThreshold: settings.confidenceThreshold,
        allowedModes: settings.allowedModes,
        cooldownMinutes: settings.cooldownMinutes,
        devilsAdvocateMode: settings.devilsAdvocateMode,
      });
      setSettings(result.settings);
      setMessage('Settings saved');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function toggleMode(mode: HermesAmbientMode) {
    if (!settings) return;
    const has = settings.allowedModes.includes(mode);
    const next = has
      ? settings.allowedModes.filter((m) => m !== mode)
      : [...settings.allowedModes, mode];
    setSettings({ ...settings, allowedModes: next.length ? next : ['observer'] });
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white"
      >
        <span>Hermes ambient settings</span>
        <span className="text-xs text-slate-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && settings ? (
        <div className="space-y-4 border-t border-slate-800 px-4 py-4 text-sm">
          <label className="block">
            <span className="text-slate-400">
              Confidence threshold ({settings.confidenceThreshold.toFixed(2)})
            </span>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={settings.confidenceThreshold}
              onChange={(e) =>
                setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })
              }
              className="mt-1 w-full"
            />
          </label>

          <fieldset>
            <legend className="text-slate-400">Allowed modes</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {ALL_MODES.map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.allowedModes.includes(mode)}
                    onChange={() => toggleMode(mode)}
                  />
                  {HERMES_MODE_LABELS[mode]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-slate-400">Cooldown between ambient signals (minutes)</span>
            <input
              type="number"
              min={0}
              max={120}
              value={settings.cooldownMinutes}
              onChange={(e) =>
                setSettings({ ...settings, cooldownMinutes: Number(e.target.value) || 0 })
              }
              className="mt-1 w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
            />
          </label>

          <label className="block">
            <span className="text-slate-400">Devil&apos;s advocate</span>
            <select
              value={settings.devilsAdvocateMode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  devilsAdvocateMode: e.target.value as HermesWorkgroupSettings['devilsAdvocateMode'],
                })
              }
              className="mt-1 block rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
            >
              <option value="request_only">Request only (@Hermes)</option>
              <option value="facilitator_enabled">Allow ambient when enabled</option>
            </select>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-violet-800 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {message ? <span className="text-xs text-slate-400">{message}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
