'use client';

import {
  NOMINATE_CO_EDITOR_EVENT,
  NOMINATE_CO_EDITOR_PARAM,
} from '@/components/workgroup/WorkgroupCoEditorsPanel';

type Props = {
  workgroupSlug: string;
  className?: string;
};

/**
 * "Nominate a co-editor". On the workgroup page it opens the Co-editors card's
 * nominate form; elsewhere it goes to the workgroup page with the form open.
 * Coordinators are not nominated from the site for now (owner, 2026-10-22).
 */
export default function WorkgroupNominatePanel({ workgroupSlug, className = '' }: Props) {
  function nominate() {
    if (document.getElementById('co-editors')) {
      window.dispatchEvent(new Event(NOMINATE_CO_EDITOR_EVENT));
      return;
    }
    window.location.assign(
      `/workgroups/${encodeURIComponent(workgroupSlug)}?${NOMINATE_CO_EDITOR_PARAM}=co-editor#co-editors`,
    );
  }

  return (
    <button
      type="button"
      onClick={nominate}
      className={`rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 ${className}`}
    >
      Nominate a co-editor
    </button>
  );
}
