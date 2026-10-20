#!/usr/bin/env python3
"""Credit pending DP proposals to the people (or collectives) who made them (production, box #1).

1. Astra-reconciled changes posted through the shared Metaweb Academy account are
   credited to the Gov Hub account that owns that email (--shared, default "Bridgit").
   Only those are re-credited, never a proposal already credited to a person. Each carries
   an "Attribution: <names>, Astra." line: credit it to the first named person, else to
   the first named collective (BridgeDAO's collective attribution for anonymous CFI
   submissions), else to Astra when Astra is the only one named. A Gov Hub account is found by display
   name or username, or created (no email, no sign-in) when none exists.
2. --move FROM_USER_ID TO_USER_ID: move every proposal authored by one account to another
   (the same person with two accounts).

Runs inside Gov Hub:

    cd ~/gov-hub-prod && FLASK_ENV=production PYTHONPATH=. .venv/bin/python /tmp/recredit_proposals.py \\
        --move d841bb60-e60c-450a-870c-b4e01d9ccb1c b83c86b5-8a10-490e-92cf-d3f0a19af5e3      # dry run
    ... same with --apply
"""
from __future__ import annotations

import re
import sys
from datetime import datetime
from uuid import uuid4

ATTRIBUTION = re.compile(r"Attribution:\s*([^\n]+?)\.(?:\s|$)")
ASTRA_MARK = "Astra reconciled change"


def main() -> int:
    args = sys.argv[1:]
    apply = "--apply" in args
    shared = args[args.index("--shared") + 1] if "--shared" in args else "Bridgit"
    move = None
    if "--move" in args:
        i = args.index("--move")
        move = (args[i + 1], args[i + 2])

    from app import app

    with app.app_context():
        from extensions import db
        from models import DpProposal, User

        def find_or_make(name: str) -> tuple[User | None, bool]:
            key = re.sub(r"[^a-z0-9]", "", name.lower())
            for u in User.query.filter(db.or_(User.displayName.ilike(name), User.username.ilike(key), User.handle.ilike(key))).all():
                return u, False
            if not apply:
                return None, True
            taken = {(h or "").lower() for (h,) in db.session.query(User.handle).all()} | {(h or "").lower() for (h,) in db.session.query(User.username).all()}
            handle, n = key or "contributor", 1
            while handle in taken:
                handle, n = f"{key}{n}", n + 1
            u = User(id=str(uuid4()), public_id=str(uuid4()), displayName=name[:50], displayNameSetAt=datetime.utcnow(),
                     oauthName=name[:100], username=handle, handle=handle, role="user", theme="dark")
            db.session.add(u)
            db.session.flush()
            return u, True

        changed = 0
        made: dict[str, User | None] = {}
        for p in DpProposal.query.filter(DpProposal.status == "pending", DpProposal.rationale.like(f"%{ASTRA_MARK}%")).all():
            author = p.author.displayName or p.author.username if p.author else None
            m = ATTRIBUTION.search(p.rationale or "")
            if not m:
                continue
            if (author or "") != shared:
                continue  # already credited to a person (or another account): leave it
            names = [n.strip() for n in m.group(1).split(",") if n.strip()]
            collectives = {"bridgedao"}
            people = [n for n in names if n.lower() != "astra" and n.lower() not in collectives]
            groups = [n for n in names if n.lower() in collectives]
            target = (people or groups or ["Astra"])[0]
            if target not in made:
                made[target], new = find_or_make(target)
                print(f"account  {target}: " + ("create" if new else f"existing @{made[target].username}"))
            print(f"credit   {p.id[:8]} {author!r} -> {target!r}" + (f"  (also named: {', '.join(names[1:])})" if len(names) > 1 else ""))
            if apply and made[target]:
                p.author_user_id = made[target].id
            changed += 1

        if move:
            src, dst = (User.query.get(move[0]), User.query.get(move[1]))
            if not src or not dst:
                print("PROBLEM --move: account not found")
                db.session.rollback()
                return 1
            for p in DpProposal.query.filter_by(author_user_id=src.id).all():
                print(f"move     {p.id[:8]} ({p.status}) {src.username} -> {dst.displayName or dst.username}")
                if apply:
                    p.author_user_id = dst.id
                changed += 1

        if apply:
            db.session.commit()
            print(f"applied {changed} changes")
        else:
            print(f"dry run: {changed} changes; re-run with --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
