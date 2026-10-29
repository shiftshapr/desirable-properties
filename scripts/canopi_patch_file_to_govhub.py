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
  payload  patch → replace anchor with text. insert → Gov Hub insert_after (below, the Canopi
           default) or insert (above), with the author's whole anchor as original_text and
           only the new text as proposed_text, so reviewers see the passage the author
           anchored to. Until 2026-10-29 inserts were filed as a replace of one edge sentence;
           Gov Hub's scripts/convert_canopi_encoded_inserts.py converts those.

  python3 scripts/canopi_patch_file_to_govhub.py --env staging --dry-run
  python3 scripts/canopi_patch_file_to_govhub.py --env prod --apply

CFI / Astra reconciled posts (payload.aiAssist.cfiPatchId) are filed like any other post, so
co-editors approve them on Review (owner decision 2026-10-19); the CFI patch id goes in the rationale.
Skipped: Canopi posts an Astra release already decided (proposal-dispositions).
Deleted posts never appear: the Canopi messages API excludes message_deletions.

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
# Book Discuss posts live in two communities: abe5ec85 (DP Discuss: human posts and the
# Astra reconciled posts) and c0f30bc5 (older Hermes filings).
COMMUNITY_IDS = (
    "abe5ec85-4ba6-456f-adaf-03d7d51cecf4",
    "c0f30bc5-de17-4328-80d9-ff8f364907da",
)
BOOK_ORIGIN = "book.desirableproperties.org"
ML_MAP = DP_ROOT / "challenge-site/src/data/dp-ml-draft-map.json"
ASTRA_RELEASES = DP_ROOT / "astra/releases"
OVERRIDES = DP_ROOT / "scripts/canopi_filing_overrides.json"

ENVS = {
    "prod": {
        "canopi_api": "https://api.canopi.live",
        "canopi_env": HOME / "canopi-prod/.env",
        "govhub_api": "http://127.0.0.1:8000",
        "govhub_env": HOME / "gov-hub-prod/.env",
        "govhub_db": HOME / "gov-hub-prod/instance/datatracker.db",
        "rails": DP_ROOT / "desirableproperties-book/content/local",
        "book_url": "https://book.desirableproperties.org",
    },
    "staging": {
        "canopi_api": "https://staging.api.canopi.live",
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
    """Markdown span whose rendered text is `exact`, ignoring emphasis/code markers and whitespace.

    Markers may sit anywhere, including against punctuation ("**frozen falsehood**,").
    """
    md = (markdown or "").replace("\r\n", "\n")
    target = re.sub(r"[*_`]", "", " ".join(exact.replace("\u00a0", " ").split()))
    if not target or not md:
        return None
    plain, index = [], []  # markup-free, whitespace-collapsed text and its source offsets
    for i, ch in enumerate(md):
        if ch in "*_`":
            continue
        if ch.isspace():
            if plain and plain[-1] == " ":
                continue
            ch = " "
        plain.append(ch)
        index.append(i)
    at = "".join(plain).find(target)
    if at < 0:
        return None
    start, end = index[at], index[at + len(target) - 1] + 1
    while start > 0 and md[start - 1] in "*_`":
        start -= 1
    while end < len(md) and md[end] in "*_`":
        end += 1
    return md[start:end].strip()


MARKUP = re.compile(r"[*_`#>\[\]|]")
SENTENCE_END = re.compile(r"(?<=[.!?:;])\s+")


def splice_anchor(span: str, position: str) -> str | None:
    """Anchor that Gov Hub accepts and can splice (verbatim in markdown).

    Inserts only need the insertion edge: the markup-free sentence(s) at the end of the
    quoted span (insert below) or at its start (insert above); when the edge sentence has
    markup, the whole edge line as written in the markdown.
    """
    paras = [p.strip() for p in re.split(r"\n\s*\n", span) if p.strip()]
    if not paras:
        return None
    para = paras[0] if position == "above" else paras[-1]
    lines = [ln for ln in para.splitlines() if ln.strip()]
    if len(lines) > 1:  # list or wrapped block: use the edge line, without its list marker
        para = lines[0] if position == "above" else lines[-1]
    para = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", para).strip()
    if re.match(r"^#{1,6}\s+\S", para):
        # The whole heading line, hashes included: anchoring on its text alone splices the
        # insert inside the heading ("## 4. ### 3.12 New … Core Principle").
        return para if para in span else None
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
        # The edge is a formatted line ("Failure mode: **x**", a bold label): anchor on that
        # line as written. Gov Hub (interface-gov-hub#26) accepts anchors found verbatim in
        # the chapter Markdown, which is what it splices into.
        return para if para and para in span else None
    anchor = " ".join(picked if position == "above" else list(reversed(picked)))
    return anchor if anchor in span else None


EMPHASIS = re.compile(r"(\*\*|__|\*|_|`)(.+?)\1")


def whole_heading_line(md: str, span: str, edge: str, position: str = "below") -> str:
    """If the insertion edge sits inside a heading line, use the whole line (hashes included).

    An anchor quoted from the page has no "## ", so its edge can be "Core Principle" out of
    "## 4. Core Principle"; splicing there would put the insert inside the heading.
    """
    base = md.find(span)
    at = md.find(edge, base if base >= 0 else 0)
    if at < 0:
        return edge
    start = md.rfind("\n", 0, at) + 1
    stop = md.find("\n", at)
    line = md[start:stop if stop >= 0 else len(md)]
    if not re.match(r"^#{1,6}\s", line):
        return edge
    # Above a section heading means above the rule that closes the previous section.
    rule = re.search(r"(?:^|\n)(---+\n\n)$", md[:start])
    return (rule.group(1) + line) if position == "above" and rule else line


def insert_anchor(md: str, span: str, position: str) -> str:
    """The author's whole anchor for an insert, as Gov Hub needs it to splice.

    A quoted heading has no "## ", so a span that starts on a heading line starts at the
    line instead; otherwise an insert above would land between the hashes and the title.
    Above a section heading means above the rule that closes the previous section.
    """
    at = md.find(span)
    if at < 0:
        return span
    start = md.rfind("\n", 0, at) + 1
    if not re.match(r"^#{1,6}\s", md[start:]):
        return span
    out = md[start:at + len(span)]
    rule = re.search(r"(?:^|\n)(---+\n\n)$", md[:start])
    return (rule.group(1) + out) if position == "above" and rule else out


def with_heading_marker(md: str, full_span: str, orig: str, new: str) -> str:
    """A patch whose new text is a heading ("### 5.10 …") replaces the marker too.

    The quoted anchor has no "### ", so without this the result is "### ### 5.10 …".
    """
    if not re.match(r"^#{1,6}\s", new):
        return orig
    base = md.find(full_span)
    at = md.find(orig, base if base >= 0 else 0)
    start = md.rfind("\n", 0, at) + 1 if at >= 0 else -1
    marker = md[start:at] if at >= 0 else ""
    return marker + orig if re.fullmatch(r"#{1,6}\s+", marker) else orig


def unique_splice(md: str, span: str, orig: str, new: str) -> tuple[str, str] | None:
    """Widen (orig -> new) until orig occurs once in the chapter.

    Gov Hub splices at the first occurrence of original_text, so a short anchor such as
    "Failure mode:" would land in the wrong subsection. Widen to the line, then the
    paragraph, then the whole quoted span, rewriting new to match.
    """
    if md.count(orig) == 1:
        return orig, new
    base = md.find(span)
    at = md.find(orig, base) if base >= 0 else -1
    if at < 0:
        return None
    end = at + len(orig)
    line = (md.rfind("\n", 0, at) + 1, (md.find("\n", end) + 1 or len(md) + 1) - 1)
    para_start = md.rfind("\n\n", 0, at)
    para_end = md.find("\n\n", end)
    para = (para_start + 2 if para_start >= 0 else 0, para_end if para_end >= 0 else len(md))
    for lo, hi in (line, para, (base, base + len(span))):
        wide = md[lo:hi].strip("\n")
        if wide and orig in wide and md.count(wide) == 1:
            return wide, wide.replace(orig, new, 1)
    return None


def whole_passage_patch(span: str, text: str) -> tuple[str, str] | None:
    """Fallback when narrow_patch cannot isolate the change: replace the whole anchor span.

    A Canopi patch means "replace the anchor passage with this text", so filing span -> text is
    exactly the post. Refused when an emphasized phrase of the span survives in the new text
    without its emphasis (the markup would be lost); allowed when the new text keeps it.
    """
    text = (text or "").strip()
    if not span or not text:
        return None
    if re.search(r"[#>\[\]|]", span):  # links, headings, quotes, tables: never dropped wholesale
        return None
    flat = " ".join(text.split())
    for marker, phrase in EMPHASIS.findall(span):
        phrase = " ".join(phrase.split())
        # The phrase survives but its emphasis would be lost, unless the new text keeps it.
        if phrase in flat and f"{marker}{phrase}{marker}" not in flat:
            return None
    return span, text


def narrow_patch(span: str, exact: str, text: str) -> tuple[str, str] | None:
    """Re-anchor a patch whose anchor passage carries markdown markup.

    Finds what the post actually changed (common prefix/suffix of the rendered anchor
    and the post text), then grows that region word by word to the largest stretch of
    the rendered anchor that is also verbatim, markup-free markdown in the span. Returns
    (original, proposed) that Gov Hub can both match and splice, or None.
    """
    exact = " ".join(exact.split())
    if not exact or not text:
        return None
    a = 0
    while a < min(len(exact), len(text)) and exact[a] == text[a]:
        a += 1
    b = 0
    while b < min(len(exact), len(text)) - a and exact[-1 - b] == text[-1 - b]:
        b += 1
    lo, hi = a, len(exact) - b

    def ok(i: int, j: int) -> bool:
        seg = exact[i:j].strip()
        return bool(seg) and not MARKUP.search(seg) and seg in span

    while lo > 0 and not exact[lo - 1].isspace():  # whole words around the change
        lo -= 1
    while hi < len(exact) and not exact[hi].isspace():
        hi += 1
    if lo == hi:  # pure insertion point: seed with the neighbouring word
        if lo > 0:
            lo = exact.rfind(" ", 0, lo - 1) + 1
        else:
            nxt = exact.find(" ", 1)
            hi = len(exact) if nxt < 0 else nxt
    if not ok(lo, hi):
        return None
    grew = True
    while grew:
        grew = False
        if lo > 0:
            nlo = exact.rfind(" ", 0, lo - 1) + 1
            if ok(nlo, hi):
                lo, grew = nlo, True
        if hi < len(exact):
            nhi = exact.find(" ", hi + 1)
            nhi = len(exact) if nhi < 0 else nhi
            if ok(lo, nhi):
                hi, grew = nhi, True
    seg = exact[lo:hi]
    lo += len(seg) - len(seg.lstrip())
    hi -= len(seg) - len(seg.rstrip())
    original = exact[lo:hi]
    proposed = text[lo:len(text) - (len(exact) - hi)].strip()
    if not proposed or proposed == original:
        return None
    return original, proposed


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
        for community_id, pid in (
            (c, p) for c in COMMUNITY_IDS
            for p in (page_id(f"{BOOK_ORIGIN}/viewer/dp{n:02d}"), f"dp{n:02d}")
        ):
            url = f"{cfg['canopi_api']}/api/messages?communityId={community_id}&pageId={pid}&limit=100"
            try:
                # Cloudflare in front of the hosted API rejects urllib's default User-Agent.
                req = urllib.request.Request(url, headers={"User-Agent": "dp-loop-canopi-filer/1.0", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=15) as r:
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


def cfi_patch_id(post: dict) -> str:
    """CFI / Astra posts carry payload.aiAssist.cfiPatchId; Gov Hub tracks those in its CFI graph."""
    payload = as_obj(post.get("payload")) or {}
    ai = as_obj(post.get("aiAssist")) or as_obj(payload.get("aiAssist")) or {}
    return str(ai.get("cfiPatchId") or "").strip()


def astra_canopi_dispositions() -> dict[str, dict]:
    """Canopi message id -> {label, release, changes} for posts an Astra release already decided."""
    out: dict[str, dict] = {}
    for f in sorted(ASTRA_RELEASES.glob("*/proposal-dispositions.json")):
        for d in json.loads(f.read_text()):
            ref = str(d.get("source_ref") or "")
            if ref.startswith("canopi:"):
                out[ref[len("canopi:"):]] = {
                    "label": f"{f.parent.name}: {d.get('status')}",
                    "release": f.parent.name,
                    "changes": [c.get("change_id") for c in d.get("changes") or [] if c.get("change_id")],
                }
    return out


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

    astra_done = astra_canopi_dispositions()
    overrides = {k: v for k, v in json.loads(OVERRIDES.read_text()).items() if not k.startswith("_")} if OVERRIDES.exists() else {}
    posts = fetch_posts(cfg)
    posted_cfi = {cfi_patch_id(p) for p in posts} - {""}
    emails = canopi_emails(cfg, {str((p.get("author") or {}).get("id") or "") for p in posts} - {""})
    results = []
    for p in posts:
        mid = p["id"]
        row = {"id": mid, "kind": p["_kind"], "page_dp": f"DP{p['_page_dp']}", "created_at": p.get("createdAt")}
        results.append(row)
        if mid in filed_ext:
            row.update(status="already_filed")
            continue
        cfi_id = cfi_patch_id(p)
        if cfi_id:
            row["cfi_patch_id"] = cfi_id
        astra_note = ""
        if mid in astra_done:
            decided = astra_done[mid]
            unposted = [c for c in decided["changes"] if f"astra:{decided['release']}:{c}" not in posted_cfi]
            if not decided["changes"] or len(unposted) < len(decided["changes"]):
                row.update(status="skipped_astra", reason=f"already decided by Astra ({decided['label']})")
                continue
            # Astra folded this post into changes that never reached the book or Gov Hub:
            # skipping it would leave the contributor's work with nobody. File it as written.
            astra_note = (f"; Astra ({decided['release']}) folded it into {', '.join(unposted)}, "
                          "which were never posted to the book, so it is filed as written")
            row["astra_unposted"] = unposted
        anchor = as_obj(p.get("contextAnchor")) or {}
        exact = (as_obj(anchor.get("textQuote")) or {}).get("exact") or ""
        payload_obj = as_obj(p.get("payload")) or {}
        ai = as_obj(p.get("aiAssist")) or as_obj(payload_obj.get("aiAssist")) or {}
        position = str(payload_obj.get("insertPosition") or anchor.get("insertPosition") or "").lower()
        override = overrides.get(mid)
        if override and override.get("skip"):
            # Not filed on purpose (e.g. a duplicate of another post); the post itself is untouched.
            row.update(status="skipped", reason=override["skip"])
            continue
        if override:
            # Hand placement (scripts/canopi_filing_overrides.json): the post's own anchor
            # cannot be filed as-is. The Canopi post itself is left untouched.
            exact, position = override["anchor"], str(override.get("position") or position).lower()
            p["_kind"] = override.get("kind") or p["_kind"]
            p["_page_dp"] = int(override.get("dp") or p["_page_dp"])
            anchor = {}
            row["override"] = True
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
            span = insert_anchor(rails[home], span, position)
            if rails[home].count(span) != 1:
                row.update(status="blocked", reason="anchor occurs more than once in the chapter")
                continue
            proposed = text
        else:
            full_span = span
            proposed = text
            if MARKUP.search(span):
                narrowed = narrow_patch(span, exact, text) or whole_passage_patch(span, text)
                if not narrowed:
                    row.update(status="blocked", reason="patch anchor spans markdown markup and the change could not be narrowed")
                    continue
                span, proposed = narrowed
        if p["_kind"] != "insert":
            span = with_heading_marker(rails[home], full_span, span, proposed)
            widened = unique_splice(rails[home], full_span, span, proposed)
            if not widened:
                row.update(status="blocked", reason="anchor occurs more than once in the chapter and cannot be made unique")
                continue
            span, proposed = widened
        credit = (f"Filed from Canopi book {p['_kind']} {mid}"
                  + (f" (insert {'above' if position == 'above' else 'below'} the anchor)" if p["_kind"] == "insert" else "")
                  + (f"; posted on the DP{p['_page_dp']} page but anchored in DP{home}" if home != p["_page_dp"] else "")
                  + (f"; Astra reconciled CFI change {cfi_id}" if cfi_id else "") + astra_note + ".")
        note = (override or {}).get("note") or ""
        rationale = "\n\n".join(x for x in (str(ai.get("patchRationale") or "").strip(), credit, note) if x)[:3900]
        body = {
            "kind": "patch",
            "draft_ref": ml_map[home],
            "external_id": mid,
            "author_user_id": uid,
            "author_email": email,
            "payload": {
                "original_text": span,
                "proposed_text": proposed,
                "patch_mode": ("insert" if position == "above" else "insert_after") if p["_kind"] == "insert" else "replace",
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
