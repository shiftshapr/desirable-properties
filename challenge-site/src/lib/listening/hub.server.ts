/**
 * Fan-out for the update stream. Writers (this process, or the import/replay tool in another process)
 * call pg_notify('dp_listen', meeting_id) inside their transaction. One LISTEN connection per process
 * reads the new events for that meeting once and hands them to every open stream on it.
 * A 5 s check of last_seq covers a lost notification or a dropped LISTEN connection.
 */
import pg from 'pg';
import { dpDatabaseUrl } from '@/lib/dp-db';
import { listeningPool, readEventsAfter } from '@/lib/listening/store.server';
import type { WorkspaceEvent } from '@/lib/listening/types';

type Listener = (events: WorkspaceEvent[]) => void;

type MeetingTopic = { lastSeq: number; listeners: Set<Listener>; reading: Promise<void> | null; again: boolean };

class ListeningHub {
  private topics = new Map<string, MeetingTopic>();
  private client: pg.Client | null = null;
  private connecting: Promise<void> | null = null;
  private poll: NodeJS.Timeout | null = null;

  async subscribe(meetingId: string, fromSeq: number, listener: Listener): Promise<() => void> {
    await this.ensureListening();
    let topic = this.topics.get(meetingId);
    if (!topic) {
      topic = { lastSeq: fromSeq, listeners: new Set(), reading: null, again: false };
      this.topics.set(meetingId, topic);
    }
    topic.lastSeq = Math.max(topic.lastSeq, fromSeq);
    topic.listeners.add(listener);
    return () => {
      const t = this.topics.get(meetingId);
      if (!t) return;
      t.listeners.delete(listener);
      if (t.listeners.size === 0) this.topics.delete(meetingId);
    };
  }

  /** Read and deliver events after the topic's last seq. Serialized per meeting. */
  poke(meetingId: string) {
    const topic = this.topics.get(meetingId);
    if (!topic) return;
    if (topic.reading) {
      topic.again = true;
      return;
    }
    topic.reading = (async () => {
      try {
        do {
          topic.again = false;
          const events = await readEventsAfter(meetingId, topic.lastSeq, 500);
          if (events.length) {
            topic.lastSeq = events[events.length - 1].seq;
            for (const l of topic.listeners) {
              try {
                l(events);
              } catch {
                /* one broken stream must not stop the others */
              }
            }
            if (events.length === 500) topic.again = true;
          }
        } while (topic.again);
      } catch (err) {
        console.error('[listening] hub read failed:', err instanceof Error ? err.message : err);
      } finally {
        topic.reading = null;
      }
    })();
  }

  private async ensureListening() {
    if (this.client) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      await listeningPool();
      const url = dpDatabaseUrl();
      if (!url) throw new Error('DP database is not configured');
      const client = new pg.Client({ connectionString: url });
      client.on('notification', (msg) => {
        if (msg.channel === 'dp_listen' && msg.payload) this.poke(msg.payload);
      });
      client.on('error', (err) => {
        console.error('[listening] LISTEN connection error:', err.message);
        this.client = null;
        client.end().catch(() => {});
      });
      client.on('end', () => {
        if (this.client === client) this.client = null;
      });
      await client.connect();
      await client.query('LISTEN dp_listen');
      this.client = client;
      if (!this.poll) {
        this.poll = setInterval(() => this.checkAll(), 5000);
        this.poll.unref?.();
      }
    })();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async checkAll() {
    if (this.topics.size === 0) return;
    if (!this.client) this.ensureListening().catch(() => {});
    try {
      const pool = await listeningPool();
      const ids = [...this.topics.keys()];
      const { rows } = await pool.query('SELECT id, last_seq FROM dp_listen_meeting WHERE id = ANY($1)', [ids]);
      for (const r of rows) {
        const t = this.topics.get(String(r.id));
        if (t && Number(r.last_seq) > t.lastSeq) this.poke(String(r.id));
      }
    } catch {
      /* next tick */
    }
  }
}

const g = globalThis as unknown as { __dpListeningHub?: ListeningHub };
export const listeningHub: ListeningHub = g.__dpListeningHub ?? (g.__dpListeningHub = new ListeningHub());
