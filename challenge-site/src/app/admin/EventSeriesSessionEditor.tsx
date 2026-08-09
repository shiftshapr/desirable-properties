'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminSessionDetail } from '@/lib/dp-event-series-store';
import {
  datetimeLocalInputToIso,
  isoToDatetimeLocalInput,
} from '@/lib/event-series-session-ui';

type Props = {
  sessionId: string;
  seriesSlug: string;
  onClose: () => void;
  onFlash: (msg: string) => void;
};

const FIELD_TYPES = ['textarea', 'checkbox', 'dp_hook', 'select'] as const;

async function apiJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

export default function EventSeriesSessionEditor({
  sessionId,
  seriesSlug,
  onClose,
  onFlash,
}: Props) {
  const [session, setSession] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dpInput, setDpInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson(
        `/api/admin/event-series/sessions/${encodeURIComponent(sessionId)}`,
        'GET',
      );
      setSession(data.session);
      setDpInput((data.session.relatedDpIds || []).join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveSessionMeta() {
    if (!session) return;
    await runAction(async () => {
      const relatedDpIds = dpInput
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      await apiJson(
        `/api/admin/event-series/sessions/${encodeURIComponent(sessionId)}`,
        'PATCH',
        {
          title: session.title,
          imageUrl: session.imageUrl,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          liveUrl: session.liveUrl,
          recordingUrl: session.recordingUrl,
          facilitatorBlurbMd: session.facilitatorBlurbMd,
          active: session.active,
          relatedDpIds,
        },
      );
      onFlash('Session saved.');
    });
  }

  if (loading) return <p className="text-sm text-slate-500">Loading session editor…</p>;
  if (!session) return <p className="text-sm text-rose-300">Session not found.</p>;

  return (
    <div className="mt-4 rounded-xl border border-violet-900/50 bg-violet-950/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-violet-300">Session editor</p>
          <h4 className="text-lg font-semibold text-white">
            {session.sessionNumber}. {session.title}
          </h4>
        </div>
        <div className="flex gap-2">
          <a
            href={`/series/${seriesSlug}/session/${session.sessionNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-300 hover:text-cyan-200"
          >
            Preview →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="mt-5 space-y-3">
        <h5 className="text-sm font-semibold text-slate-200">Session metadata</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Title</span>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={session.title}
              onChange={(e) => setSession({ ...session, title: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Facilitator blurb</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={session.facilitatorBlurbMd || ''}
              onChange={(e) => setSession({ ...session, facilitatorBlurbMd: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Session date & time</span>
            <p className="mt-0.5 text-xs text-slate-500">
              Shown on the public session page in Pacific Time.
            </p>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={isoToDatetimeLocalInput(session.startsAt)}
              onChange={(e) =>
                setSession({
                  ...session,
                  startsAt: datetimeLocalInputToIso(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Session end (optional)</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={isoToDatetimeLocalInput(session.endsAt)}
              onChange={(e) =>
                setSession({
                  ...session,
                  endsAt: datetimeLocalInputToIso(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Image URL</span>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={session.imageUrl || ''}
              onChange={(e) => setSession({ ...session, imageUrl: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">RSVP / live link</span>
            <p className="mt-0.5 text-xs text-slate-500">
              Registration or join link. Public page shows RSVP until a recording URL is set.
            </p>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={session.liveUrl || ''}
              placeholder="https://…"
              onChange={(e) => setSession({ ...session, liveUrl: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Recording URL</span>
            <p className="mt-0.5 text-xs text-slate-500">
              When set, the public page shows Watch now instead of RSVP.
            </p>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={session.recordingUrl || ''}
              placeholder="https://…"
              onChange={(e) => setSession({ ...session, recordingUrl: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Related DPs (comma-separated)</span>
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={dpInput}
              onChange={(e) => setDpInput(e.target.value)}
              placeholder="DP2, DP8, DP22"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveSessionMeta()}
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Save session metadata
        </button>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold text-slate-200">Pre-read links</h5>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                await apiJson('/api/admin/event-series/pre-reads', 'POST', {
                  sessionId,
                  label: 'New pre-read',
                  url: '/',
                  sortOrder: session.preReads.length,
                });
                onFlash('Pre-read added.');
              })
            }
            className="text-xs text-cyan-300 hover:text-cyan-200"
          >
            + Add pre-read
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {session.preReads.map((pr) => (
            <li
              key={pr.id}
              className="grid gap-2 rounded border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
            >
              <input
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                defaultValue={pr.label}
                onBlur={(e) =>
                  void runAction(async () => {
                    await apiJson('/api/admin/event-series/pre-reads', 'PATCH', {
                      id: pr.id,
                      label: e.target.value,
                    });
                  })
                }
              />
              <input
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                defaultValue={pr.url}
                onBlur={(e) =>
                  void runAction(async () => {
                    await apiJson('/api/admin/event-series/pre-reads', 'PATCH', {
                      id: pr.id,
                      url: e.target.value,
                    });
                  })
                }
              />
              <input
                type="number"
                className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                defaultValue={pr.minutesEstimate ?? ''}
                placeholder="min"
                title="Minutes estimate"
                min={1}
                onBlur={(e) =>
                  void runAction(async () => {
                    const raw = e.target.value.trim();
                    await apiJson('/api/admin/event-series/pre-reads', 'PATCH', {
                      id: pr.id,
                      minutesEstimate: raw ? Number(raw) : null,
                    });
                  })
                }
              />
              <input
                type="number"
                className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                defaultValue={pr.sortOrder}
                title="Sort order"
                onBlur={(e) =>
                  void runAction(async () => {
                    await apiJson('/api/admin/event-series/pre-reads', 'PATCH', {
                      id: pr.id,
                      sortOrder: Number(e.target.value),
                    });
                  })
                }
              />
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input
                  type="checkbox"
                  defaultChecked={pr.optional}
                  onChange={(e) =>
                    void runAction(async () => {
                      await apiJson('/api/admin/event-series/pre-reads', 'PATCH', {
                        id: pr.id,
                        optional: e.target.checked,
                      });
                    })
                  }
                />
                Optional
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    await apiJson('/api/admin/event-series/pre-reads', 'DELETE', { id: pr.id });
                    onFlash('Pre-read deleted.');
                  })
                }
                className="text-xs text-rose-300 hover:text-rose-200"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold text-slate-200">Question sections</h5>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                const n = session.sections.length + 1;
                await apiJson('/api/admin/event-series/sections', 'POST', {
                  sessionId,
                  sectionKey: `section-${n}`,
                  title: `Section ${n}`,
                  pearlStage: 'engage',
                  sortOrder: session.sections.length,
                });
                onFlash('Section added.');
              })
            }
            className="text-xs text-cyan-300 hover:text-cyan-200"
          >
            + Add section
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {session.sections.map((section) => (
            <div key={section.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  defaultValue={section.title}
                  placeholder="Section title"
                  onBlur={(e) =>
                    void runAction(async () => {
                      await apiJson('/api/admin/event-series/sections', 'PATCH', {
                        id: section.id,
                        title: e.target.value,
                      });
                    })
                  }
                />
                <input
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  defaultValue={section.sectionKey}
                  placeholder="section_key"
                  onBlur={(e) =>
                    void runAction(async () => {
                      await apiJson('/api/admin/event-series/sections', 'PATCH', {
                        id: section.id,
                        sectionKey: e.target.value,
                      });
                    })
                  }
                />
                <input
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  defaultValue={section.pearlStage || ''}
                  placeholder="PEARL stage"
                  onBlur={(e) =>
                    void runAction(async () => {
                      await apiJson('/api/admin/event-series/sections', 'PATCH', {
                        id: section.id,
                        pearlStage: e.target.value,
                      });
                    })
                  }
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    defaultValue={section.sortOrder}
                    title="Sort"
                    onBlur={(e) =>
                      void runAction(async () => {
                        await apiJson('/api/admin/event-series/sections', 'PATCH', {
                          id: section.id,
                          sortOrder: Number(e.target.value),
                        });
                      })
                    }
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        await apiJson('/api/admin/event-series/sections', 'DELETE', {
                          id: section.id,
                        });
                        onFlash('Section deleted.');
                      })
                    }
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Delete section
                  </button>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      await apiJson('/api/admin/event-series/questions', 'POST', {
                        sectionId: section.id,
                        fieldKey: `field_${section.questions.length + 1}`,
                        label: 'New question',
                        fieldType: 'textarea',
                        required: false,
                        aiAssist: true,
                        sortOrder: section.questions.length,
                      });
                      onFlash('Question added.');
                    })
                  }
                  className="text-xs text-cyan-300 hover:text-cyan-200"
                >
                  + Add question
                </button>
              </div>

              <ul className="mt-2 space-y-2">
                {section.questions.map((q) => (
                  <li
                    key={q.id}
                    className="rounded border border-slate-800 bg-slate-900/80 p-3 text-sm"
                  >
                    <div className="grid gap-2 lg:grid-cols-2">
                      <input
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                        defaultValue={q.label}
                        placeholder="Label"
                        onBlur={(e) =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'PATCH', {
                              id: q.id,
                              label: e.target.value,
                            });
                          })
                        }
                      />
                      <input
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                        defaultValue={q.fieldKey}
                        placeholder="field_key"
                        onBlur={(e) =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'PATCH', {
                              id: q.id,
                              fieldKey: e.target.value,
                            });
                          })
                        }
                      />
                      <select
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                        defaultValue={q.fieldType}
                        onChange={(e) =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'PATCH', {
                              id: q.id,
                              fieldType: e.target.value,
                            });
                          })
                        }
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                        defaultValue={q.sortOrder}
                        title="Sort"
                        onBlur={(e) =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'PATCH', {
                              id: q.id,
                              sortOrder: Number(e.target.value),
                            });
                          })
                        }
                      />
                      <textarea
                        rows={2}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 lg:col-span-2"
                        defaultValue={q.helpText || ''}
                        placeholder="Help text (optional)"
                        onBlur={(e) =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'PATCH', {
                              id: q.id,
                              helpText: e.target.value,
                            });
                          })
                        }
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          defaultChecked={q.required}
                          onChange={(e) =>
                            void runAction(async () => {
                              await apiJson('/api/admin/event-series/questions', 'PATCH', {
                                id: q.id,
                                required: e.target.checked,
                              });
                            })
                          }
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          defaultChecked={q.aiAssist}
                          onChange={(e) =>
                            void runAction(async () => {
                              await apiJson('/api/admin/event-series/questions', 'PATCH', {
                                id: q.id,
                                aiAssist: e.target.checked,
                              });
                            })
                          }
                        />
                        AI assist
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(async () => {
                            await apiJson('/api/admin/event-series/questions', 'DELETE', {
                              id: q.id,
                            });
                            onFlash('Question deleted.');
                          })
                        }
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Delete question
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
