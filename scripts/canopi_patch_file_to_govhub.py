#!/usr/bin/env python3
"""File Canopi book Discuss patches/inserts into Gov Hub as proposals, under their authors.

Closes the Review hole: a book patch that exists only in Canopi shows on the DP Review tab
but cannot be promoted. This files each one through Gov Hub's signed Canopi intake
(POST /api/internal/canopi/contributions), idempotent on the Canopi message id, so Review
dedupes it into a promotable Gov Hub proposal (source_channel=canopi, external_id=<msg>).

Per post:
  author   Canopi AppUser.email (read-only) → Gov Hub user with that email. No account → skipped.
  anchor   Canopi quotes rendered text; the exact markdown span is located in the chapter
           rail (whitespace/emphasis tolerant). If absent from the tagged chapter, all
           chapters are searched (the book viewer has tagged some posts to the wrong page).
  payload  patch → replace anchor with text. insert → exact replace anchor→anchor+text
           (below, the Canopi default) or text+anchor (above): the one encoding that
           splices correctly on promote in every Gov Hub build.

  python3 scripts/canopi_patch_file_to_govhub.py --env staging --dry-run
  python3 scripts/canopi_patch_file_to_govhub.py --env prod --apply

Report: data/loop/canopi-filing-<env>.json (read by the loop dashboard).
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import re
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HOME = Path("/home/ubuntu")
DP_ROOT = HOME / "desirable-properties"
COMMUNITY_ID = "c0f30bc5-de17-4328-80d9-ff8f364907da"
BOOK_ORIGIN = "book.desirableproperties.org"
ML_MAP = DP_ROOT / "challenge-site/src/data/dp-ml-draft-map.json"

ENVS = {
    "prod": {
        "canopi_api": "http://127.0.0.1:3002",
        "canopi_env": HOME / "canopi-prod/.env",
        "govhub_api": "http://127.0.0.1:8000",
        "govhub_env": HOME / "gov-hub-prod/.env",
        "govhub_db": HOME / "gov-hub-prod/instance/datatracker.db",
        "rails": DP_ROOT / "desirableproperties-book/content/local",
        "book_url": "https://book.desirableproperties.org",
    },
    "staging": {
        "canopi_api": "http://127.0.0.1:3003",
        "canopi_env": HOME / "canopi-staging/.env",
        "govhub_api": "http://127.0.0.1:8001",
        "govhub_env": HOME / "gov-hub-dev/.env",
        "govhub_db": HOME / "gov-hub-dev/instance_dev/datatracker_dev.db",
        "rails": HOME / "desirableproperties-book-staging/content/local",
        "book_url": "https://staging.book.desirableproperties.org",
    },
}


def read_env(path: Path) -> dict[str, str]:
    out = {}
    for line in path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def page_id(url: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "_", url)[:100].lower()


def as_obj(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def locate_anchor(markdown: str, exact: str) -> str | None:
    tokens = [re.sub(r"^[*_`]+|[*_`]+$", "", t) for t in exact.replace(" ", " ").split()]
    tokens = [t for t in tokens if t]
    if not tokens or not markdown:
        return None
    pattern = r"[*_`]*" + r"[\s*_`]+".join(re.escape(t) for t in tokens) + r"[*_`]*"
    m = re.search(pattern, markdown.replace("\r\n", "\n"))
    return m.group(0).strip() if m else None


MARKUP = re.compile(r"[*_`#>\[\]|]")
SENTENCE_END = re.compile(r"(?<=[.!?:;])\s+")


def splice_anchor(span: str, position: str) -> str | None:
    """Anchor that Gov Hub accepts (in rendered plain text) and can splice (verbatim in markdown).

    Inserts only need the insertion edge: the markup-free sentence(s) at the end of the
    quoted span (insert below) or at its start (insert above).
    """
    paras = [p.strip() for p in re.split(r"\n\s*\n", span) if p.strip()]
    if not paras:
        return None
    para = paras[0] if position == "above" else paras[-1]
    lines = [ln for ln in para.splitlines() if ln.strip()]
    if len(lines) > 1:  # list or wrapped block: use the edge line, without its list marker
        para = lines[0] if position == "above" else lines[-1]
    para = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", para).strip()
    heading = re.match(r"^#{1,6}\s+(.+)$", para)
    if heading and not MARKUP.search(heading.group(1)):
        return heading.group(1).strip()
    sentences = [x for x in SENTENCE_END.split(para) if x.strip()]
    ordered = sentences if position == "above" else list(reversed(sentences))
    picked: list[str] = []
    for sent in ordered:
        if MARKUP.search(sent):
            break
        picked.append(sent.strip())
        if sum(len(x) for x in picked) >= 60:
            break
    if not picked:
        return None
    anchor = " ".join(picked if position == "above" else list(reversed(picked)))
    return anchor if anchor in span else None


RATIONALE_RE = re.compile(r"^\s*(Why it fits|Why it is|Pre-flight|Rationale)\b", re.I)


def post_text(content: str) -> str:
    """Body text of a patch/insert: drop legacy PATCH:/INSERT: prefix and appended Hermes rationale."""
    body = re.sub(r"^\s*(patch|insert)\s*:\s*", "", content or "", count=1, flags=re.I)
    idx = body.find("\n\n")
    if idx > 0 and RATIONALE_RE.match(body[idx + 2:]):
        body = body[:idx]
    return body.strip()


def fetch_posts(cfg) -> list[dict]:
    posts, seen = [], set()
    for n in range(1, 24):
        for pid in (page_id(f"{BOOK_ORIGIN}/viewer/dp{n:02d}"), f"dp{n:02d}"):
            url = f"{cfg['canopi_api']}/api/messages?communityId={COMMUNITY_ID}&pageId={pid}&limit=100"
            try:
                with urllib.request.urlopen(url, timeout=15) as r:
                    items = json.load(r).get("items", [])
            except Exception as e:
                print(f"canopi fetch failed for {pid}: {e}", file=sys.stderr)
                continue
            for m in items:
                tag = str(m.get("tagType") or "").lower()
                if tag not in ("patch", "insert") and not re.match(r"\s*(patch|insert)\s*:", m.get("content") or "", re.I):
                    continue
                if m["id"] in seen or m.get("parentId"):
                    continue
                seen.add(m["id"])
                m["_page_dp"] = n
                m["_kind"] = tag or ("insert" if re.match(r"\s*insert", m.get("content") or "", re.I) else "patch")
                posts.append(m)
    return posts


def canopi_emails(cfg, author_ids: set[str]) -> dict[str, str]:
    if not author_ids:
        return {}
    url = read_env(cfg["canopi_env"])["DATABASE_URL"]
    u = urllib.parse.urlparse(url)
    keep = [(k, v) for k, v in urllib.parse.parse_qsl(u.query) if k == "sslmode"]
    url = urllib.parse.urlunparse(u._replace(query=urllib.parse.urlencode(keep)))
    ids = ",".join("'" + i.replace("'", "") + "'" for i in author_ids)
    res = subprocess.run(
        ["psql", url, "-X", "-Atc", f"set default_transaction_read_only=on; select id, lower(email) from \"AppUser\" where id in ({ids})"],
        capture_output=True, text=True, timeout=60,
    )
    if res.returncode != 0:
        raise RuntimeError(f"canopi user lookup failed: {res.stderr.strip()[:200]}")
    return dict(line.split("|", 1) for line in res.stdout.splitlines() if "|" in line)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--env", choices=sorted(ENVS), required=True)
    ap.add_argument("--canopi-from", choices=sorted(ENVS), help="read posts from another env's Canopi (rehearse prod posts on staging)")
    ap.add_argument("--apply", action="store_true", help="file into Gov Hub (default: dry run)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cfg = dict(ENVS[args.env])
    if args.canopi_from:
        cfg.update({k: ENVS[args.canopi_from][k] for k in ("canopi_api", "canopi_env")})
    apply = args.apply and not args.dry_run

    ml_map = {int(k[2:]): v["mlNumber"] for k, v in json.loads(ML_MAP.read_text())["map"].items()}
    rails = {n: (cfg["rails"] / f"dp{n}.md").read_text(errors="replace") for n in ml_map if (cfg["rails"] / f"dp{n}.md").exists()}
    gh = sqlite3.connect(f"file:{cfg['govhub_db']}?mode=ro", uri=True)
    filed_ext = {r[0] for r in gh.execute("select external_id from dp_proposal where source_channel='canopi' and external_id is not null")}
    gh_users = {e.lower(): i for e, i in gh.execute("select email, id from user where email is not null")}
    genv = read_env(cfg["govhub_env"])
    api_key, signing = genv.get("GOV_HUB_API_KEY", ""), genv.get("CANOPI_SIGNING_SECRET", "")

    posts = fetch_posts(cfg)
    emails = canopi_emails(cfg, {str((p.get("author") or {}).get("id") or "") for p in posts} - {""})
    results = []
    for p in posts:
        mid = p["id"]
        row = {"id": mid, "kind": p["_kind"], "page_dp": f"DP{p['_page_dp']}", "created_at": p.get("createdAt")}
        results.append(row)
        if mid in filed_ext:
            row.update(status="already_filed")
            continue
        anchor = as_obj(p.get("contextAnchor")) or {}
        exact = (as_obj(anchor.get("textQuote")) or {}).get("exact") or ""
        payload_obj = as_obj(p.get("payload")) or {}
        ai = as_obj(p.get("aiAssist")) or as_obj(payload_obj.get("aiAssist")) or {}
        position = str(payload_obj.get("insertPosition") or anchor.get("insertPosition") or "").lower()
        home, span = p["_page_dp"], locate_anchor(rails.get(p["_page_dp"], ""), exact) if exact else None
        if not span and exact:
            for n, md in rails.items():
                span = locate_anchor(md, exact)
                if span:
                    home = n
                    break
        row["home_dp"] = f"DP{home}"
        if not span:
            row.update(status="blocked", reason="anchor passage not found in any current chapter")
            continue
        author_id = str((p.get("author") or {}).get("id") or "")
        email = emails.get(author_id)
        uid = gh_users.get(email or "")
        if not uid:
            row.update(status="blocked", reason="author has no Gov Hub account" if email else "Canopi author email unknown")
            continue
        text = post_text(p.get("content") or "")
        if p["_kind"] == "insert":
            edge = splice_anchor(span, position)
            if not edge:
                row.update(status="blocked", reason="no markup-free sentence at the insertion edge of the anchor")
                continue
            span = edge
            proposed = f"{text}\n\n{span}" if position == "above" else f"{span}\n\n{text}"
        else:
            if MARKUP.search(span):
                row.update(status="blocked", reason="patch anchor spans markdown markup; file it on Gov Hub by hand")
                continue
            proposed = text
        credit = (f"Filed from Canopi book {p['_kind']} {mid}"
                  + (f" (insert {'above' if position == 'above' else 'below'} the anchor, encoded as replace)" if p["_kind"] == "insert" else "")
                  + (f"; posted on the DP{p['_page_dp']} page but anchored in DP{home}" if home != p["_page_dp"] else "") + ".")
        rationale = "\n\n".join(x for x in (str(ai.get("patchRationale") or "").strip(), credit) if x)[:3900]
        body = {
            "kind": "patch",
            "draft_ref": ml_map[home],
            "external_id": mid,
            "author_user_id": uid,
            "author_email": email,
            "payload": {
                "original_text": span,
                "proposed_text": proposed,
                "patch_mode": "replace",
                "rationale": rationale,
                "reference_url": f"{cfg['book_url']}/viewer/dp{home:02d}",
                "context_anchor": anchor if home == p["_page_dp"] and anchor else None,
            },
        }
        row.update(draft_ref=ml_map[home], author=(email or "").split("@")[0][:3] + "…", anchor=span[:90])
        if not apply:
            row.update(status="would_file")
            continue
        if not api_key or not signing:
            row.update(status="blocked", reason="GOV_HUB_API_KEY / CANOPI_SIGNING_SECRET missing in Gov Hub env")
            continue
        raw = json.dumps(body).encode()
        req = urllib.request.Request(
            f"{cfg['govhub_api']}/api/internal/canopi/contributions", data=raw, method="POST",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}",
                     "X-Canopi-Signature": hmac.new(signing.encode(), raw, hashlib.sha256).hexdigest()},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                resp = json.load(r)
                row.update(status="filed" if r.status == 201 else "already_filed",
                           proposal_id=(resp.get("proposal") or {}).get("id"))
        except urllib.error.HTTPError as e:
            row.update(status="error", http=e.code, reason=e.read().decode(errors="replace")[:300])

    counts: dict[str, int] = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    report = {"env": args.env, "generated_at": dt.datetime.now(dt.timezone.utc).isoformat()[:19] + "Z",
              "applied": apply, "counts": counts, "posts": results}
    out = DP_ROOT / f"data/loop/canopi-filing-{args.env}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1))
    for r in results:
        print(f"{r['page_dp']:>5}→{r.get('home_dp', '?'):<5} {r['id'][:8]} {r['kind']:<6} {r['status']:<13} {r.get('draft_ref', '')} {r.get('reason', '')} {('⚓ ' + r['anchor']) if r.get('anchor') else ''}")
    print(json.dumps(counts))
    return 1 if counts.get("error") else 0


if __name__ == "__main__":
    sys.exit(main())
