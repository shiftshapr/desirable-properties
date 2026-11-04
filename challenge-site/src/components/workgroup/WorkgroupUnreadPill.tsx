'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchChatUnread } from '@/lib/workgroup-collab-api';
import { formatUnreadCount, unreadForWorkgroup } from '@/lib/workgroup-chat-unread';

/** Unread chat count on a member's workgroup card, linking to its Chat tab. Renders nothing at 0. */
export default function WorkgroupUnreadPill({ workgroupId, href }: { workgroupId: string; href: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let live = true;
    // Cards on the same page share one request (fetchChatUnread dedupes concurrent calls).
    void fetchChatUnread().then((data) => {
      if (live && data) setUnread(unreadForWorkgroup(data, workgroupId));
    });
    return () => {
      live = false;
    };
  }, [workgroupId]);

  if (!unread) return null;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-sm font-medium text-rose-200 hover:border-rose-600"
      aria-label={`${unread} unread chat message${unread === 1 ? '' : 's'}`}
    >
      <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {formatUnreadCount(unread)}
      </span>
      unread in chat
    </Link>
  );
}
