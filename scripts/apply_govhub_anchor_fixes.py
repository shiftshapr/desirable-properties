#!/usr/bin/env python3
"""Re-anchor pending Gov Hub DP proposals from the 2026-10-19 anchor audit (production, box #1).

Runs inside Gov Hub (its models and services):

    cd ~/gov-hub-prod && FLASK_ENV=production PYTHONPATH=. .venv/bin/python \\
        ~/desirable-properties/scripts/apply_govhub_anchor_fixes.py \\
        ~/desirable-properties/scripts/anchor-audit-2026-10-19/govhub_updates.json            # dry run
    ... same with --apply

Input: {"updates": [{id, original_text, proposed_text, note}], "withdraw": [{id, note}]}
- update: a pending proposal gets the corrected anchor (original_text) and text
  (proposed_text, filed as replace exactly like the Canopi filer encodes it), its context
  anchor and anchor hash are recomputed, and a line is added to its rationale. Recorded
  approvals are cleared (an edit clears approvals) and listed in the output.
- withdraw: a pending proposal filed against the wrong chapter is closed as "orphaned"
  with the note as its review note (no decline notice to the author) and unlinked from its
  Canopi post (external_id cleared), so the filer files that post on the right chapter.

Every update is checked first: the new original_text must be in the current chapter
(plain text or Markdown) exactly once in the Markdown it is spliced into.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    apply = "--apply" in sys.argv
    data = json.load(open(sys.argv[1]))
    from app import app

    with app.app_context():
        from extensions import db
        from models import DpProposal
        from services.dp_proposals import (
            align_context_anchor_to_original,
            compute_anchor_hash,
            passage_exists_in_current_document,
            serialize_context_anchor,
        )
        from services.editorial_style_pass import chapter_markdown

        stamp = datetime.utcnow().strftime("%Y-%m-%d")
        problems = []
        for u in data.get("updates", []):
            p = DpProposal.query.get(u["id"])
            if not p or p.status != "pending":
                problems.append(f"{u['id'][:8]}: not a pending proposal ({p.status if p else 'missing'})")
                continue
            sub = p.submission
            body = chapter_markdown(sub)
            if body.count(u["original_text"]) != 1 or not passage_exists_in_current_document(sub, u["original_text"]):
                problems.append(f"{u['id'][:8]}: new anchor not found exactly once in the chapter")
                continue
            approvers = [a.user.displayName if a.user else a.user_id for a in (p.approvals or [])]
            print(f"update {u['id'][:8]}: {p.original_text[:60]!r} -> {u['original_text'][:60]!r}"
                  + (f"  (clears approvals: {', '.join(approvers)})" if approvers else ""))
            if apply:
                for a in list(p.approvals or []):
                    db.session.delete(a)
                p.original_text = u["original_text"]
                p.proposed_text = u["proposed_text"]
                p.patch_mode = "replace"
                p.context_anchor = serialize_context_anchor(
                    align_context_anchor_to_original(p.context_anchor, u["original_text"]))
                p.anchor_hash = compute_anchor_hash(sub.id, sub.content_hash, u["original_text"])
                p.rationale = ((p.rationale or "").rstrip() + f"\n\nRe-anchored {stamp} (anchor audit): {u['note']}")[:4000]
        for w in data.get("withdraw", []):
            p = DpProposal.query.get(w["id"])
            if not p or p.status != "pending":
                problems.append(f"{w['id'][:8]}: not a pending proposal ({p.status if p else 'missing'})")
                continue
            print(f"withdraw {w['id'][:8]}: {w['note'][:100]}")
            if apply:
                # Unlink the Canopi post so the filer files it on the right chapter (it skips
                # posts whose id is already an external_id); the old id stays in the note.
                old_ext = p.external_id
                p.status = "orphaned"
                p.review_note = w["note"] + (f" (Was linked to Canopi post {old_ext}.)" if old_ext else "")
                p.external_id = None
                p.reviewed_at = datetime.utcnow()
        for line in problems:
            print("PROBLEM", line)
        if problems:
            db.session.rollback()
            print("nothing written: fix the problems first")
            return 1
        if apply:
            db.session.commit()
            print("applied")
        else:
            print("dry run; re-run with --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
