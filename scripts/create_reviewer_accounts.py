#!/usr/bin/env python3
"""Create Gov Hub accounts for book authors whose posts the filer blocked ("author has no Gov Hub account").

Contributors must get credit for their proposals, and Gov Hub credits a proposal to a
Gov Hub account. Reviewers whose feedback reached the book through Canopi (emailed
reviews posted for them, or posts made in Canopi only) may never have signed in to Gov
Hub. This creates their account from their Canopi name and email, with no sign-in method
attached: the first time they sign in with that email, Gov Hub links the sign-in to this
account (routes/auth.py, email owner without a verifier), so they never get a duplicate.

Runs inside Gov Hub, after a filer dry run has written data/loop/canopi-filing-prod.json:

    cd ~/desirable-properties && python3 scripts/canopi_patch_file_to_govhub.py --env prod --dry-run > /dev/null
    cd ~/gov-hub-prod && FLASK_ENV=production PYTHONPATH=. .venv/bin/python \\
        ~/desirable-properties/scripts/create_reviewer_accounts.py            # dry run: lists who
    ... same with --apply

Then re-run the filer; those posts file under their authors.
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

DP_ROOT = Path("/home/ubuntu/desirable-properties")
REPORT = DP_ROOT / "data/loop/canopi-filing-prod.json"
NO_ACCOUNT = "author has no Gov Hub account"


def load_filer():
    spec = importlib.util.spec_from_file_location("filer", DP_ROOT / "scripts/canopi_patch_file_to_govhub.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def unique_handle(base: str, taken: set[str]) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "", base)[:40]
    if len(base) < 3:
        base = "user"
    handle, n = base, 1
    while handle.lower() in taken:
        handle, n = f"{base}{n}", n + 1
    return handle


def main() -> int:
    apply = "--apply" in sys.argv
    blocked = {r["id"] for r in json.loads(REPORT.read_text()).get("posts", []) if r.get("reason") == NO_ACCOUNT}
    if not blocked:
        print(f"no posts blocked for '{NO_ACCOUNT}' in {REPORT}")
        return 0
    filer = load_filer()
    cfg = dict(filer.ENVS["prod"])
    authors: dict[str, dict] = {}
    for p in filer.fetch_posts(cfg):
        if p["id"] not in blocked:
            continue
        a = p.get("author") or {}
        aid = str(a.get("id") or "")
        if aid:
            entry = authors.setdefault(aid, {"name": (a.get("displayName") or a.get("name") or "").strip(), "posts": []})
            entry["posts"].append(f"DP{p['_page_dp']} {p['id'][:8]}")
    emails = filer.canopi_emails(cfg, set(authors))

    from app import app

    with app.app_context():
        from extensions import db
        from models import User

        taken = {(u or "").lower() for (u,) in db.session.query(User.username).all()}
        taken |= {(h or "").lower() for (h,) in db.session.query(User.handle).all()}
        created, problems = [], []
        for aid, info in sorted(authors.items(), key=lambda kv: kv[1]["name"].lower()):
            email = (emails.get(aid) or "").strip().lower()
            if not email:
                problems.append(f"{info['name'] or aid}: no email on the Canopi account ({', '.join(info['posts'])})")
                continue
            if User.query.filter(db.func.lower(User.email) == email).first():
                print(f"exists   {info['name']} <{email}>")
                continue
            handle = unique_handle(email.split("@")[0], taken)
            taken.add(handle.lower())
            name = (info["name"] or handle)[:50]
            print(f"create   {name} <{email}> as @{handle}  ({len(info['posts'])} posts: {', '.join(info['posts'])})")
            if apply:
                user = User(
                    id=str(uuid4()), public_id=str(uuid4()), web3authVerifierId=None, typeOfLogin=None,
                    displayName=name, displayNameSetAt=datetime.utcnow(), oauthName=name, email=email,
                    username=handle, handle=handle, role="user", theme="dark",
                )
                db.session.add(user)
                db.session.flush()
                try:
                    from services.document_follow_notifications import ensure_notification_unsubscribe_token
                    ensure_notification_unsubscribe_token(user)
                except Exception as exc:  # optional provisioning; the account works without it
                    print(f"    note: unsubscribe token not set ({exc})")
            created.append(email)
        for line in problems:
            print("PROBLEM", line)
        if apply:
            db.session.commit()
            print(f"created {len(created)} accounts")
        else:
            print(f"would create {len(created)} accounts; re-run with --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
