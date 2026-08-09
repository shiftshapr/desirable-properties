#!/usr/bin/env python3
"""Generate composite DP chapter PDFs (ordinal + local overrides) as DP{N}-0.77X.pdf.

Reads sources-sat.json + content/local/*.md from the book project, falls back to
fetching on-chain content via book.desirableproperties.org /content/ proxy when
no local override exists. Writes:
  - desirableproperties-book/downloads/dp/
  - challenge-site/public/downloads/dp/  (versioned + dp{n}.pdf alias)
  - docs/dp-pdfs/                       (versioned copies)
"""
from __future__ import annotations

import argparse
import html
import json
import re
import urllib.request
from pathlib import Path

from markdown import markdown as md_to_html
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "desirableproperties-book"
BRC333 = Path("/home/ubuntu/BRC333/projects/desirableproperties-book-ordinal")
COMPOSITE_VERSION = "0.77X"
CONTENT_BASE = "https://book.desirableproperties.org/content/"

CSS = """
@page { size: Letter; margin: 0.85in 0.9in; }
body {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #1a1a1a;
}
h1 { font-size: 20pt; margin: 0 0 0.6em; color: #1a1a1a; }
h2 { font-size: 14pt; margin: 1.4em 0 0.45em; }
h3 { font-size: 12pt; margin: 1.1em 0 0.35em; }
p, li { margin: 0.35em 0; }
ul, ol { margin: 0.4em 0 0.6em 1.2em; }
blockquote {
  margin: 0.8em 0;
  padding-left: 0.9em;
  border-left: 3px solid #c9a227;
  color: #333;
}
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.92em; }
hr { border: none; border-top: 1px solid #ccc; margin: 1.2em 0; }
img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 1em 0 1.2em;
}
.meta {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 9pt;
  color: #555;
  margin-bottom: 1.2em;
  padding-bottom: 0.6em;
  border-bottom: 1px solid #ddd;
}
"""


def normalize_escaped_markdown(text: str) -> str:
    out = []
    for line in text.splitlines():
        ln = line
        ln = re.sub(r"^\\+(#{1,6})\s*", r"\1 ", ln)
        ln = re.sub(r"^\\+-\s+", r"- ", ln)
        ln = re.sub(r"^\\+\*\s+", r"* ", ln)
        ln = re.sub(r"^(\d+)\\\.\s+", r"\1. ", ln)
        ln = ln.replace("\\*\\*", "**")
        ln = re.sub(r"\\\*([^*\\]+?)\\\*", r"*\1*", ln)
        ln = ln.replace("\\_", "_")
        ln = ln.replace("\\[", "[").replace("\\]", "]")
        ln = ln.replace("\\`", "`")
        ln = re.sub(r"\\-", "-", ln)
        ln = re.sub(r"\\#", "#", ln)
        out.append(ln)
    return "\n".join(out)


def load_sources() -> list[dict]:
    for candidate in (
        BOOK / "json" / "sources-sat.json",
        BRC333 / "sources-sat.json",
    ):
        if candidate.is_file():
            data = json.loads(candidate.read_text(encoding="utf-8"))
            return list(data.get("sources") or [])
    raise FileNotFoundError("sources-sat.json not found")


def local_override_path(rel: str | None) -> Path | None:
    if not rel:
        return None
    rel = rel.lstrip("/")
    for root in (BOOK, BRC333):
        p = root / rel
        if p.is_file():
            return p
    # Also try content/local/dpNN.md by convention
    return None


def fetch_onchain(inscription_id: str) -> str:
    url = CONTENT_BASE + inscription_id
    req = urllib.request.Request(url, headers={"User-Agent": "dp-composite-pdf/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "replace")


def chapter_markdown(source: dict) -> str:
    local = local_override_path(source.get("localOverride"))
    if local and local.is_file():
        return local.read_text(encoding="utf-8")
    # Convention fallback
    rk = source.get("railKey") or ""
    m = re.match(r"dp0?(\d+)$", rk, re.I)
    if m:
        for root in (BOOK, BRC333):
            p = root / "content" / "local" / f"dp{m.group(1)}.md"
            if not p.is_file():
                p = root / "content" / "local" / f"dp{int(m.group(1)):02d}.md"
            if p.is_file():
                return p.read_text(encoding="utf-8")
    iid = source.get("inscriptionId")
    if not iid:
        raise ValueError(f"No content for {rk}")
    return normalize_escaped_markdown(fetch_onchain(iid))


def strip_sync_comments(md_text: str) -> str:
    return re.sub(r"<!--.*?-->\s*", "", md_text, flags=re.DOTALL)


def resolve_book_asset_url(src: str) -> str | None:
    """Map book site-root paths to local file URIs for WeasyPrint."""
    src = (src or "").strip()
    if not src or src.startswith(("http://", "https://", "data:")):
        return None
    rel = src.lstrip("/")
    for candidate in (BOOK / rel, BOOK / rel.removeprefix("content/local/")):
        if candidate.is_file():
            return candidate.resolve().as_uri()
    return None


def rewrite_image_src_in_html(html_body: str) -> str:
    def repl(match: re.Match[str]) -> str:
        src = match.group(1)
        resolved = resolve_book_asset_url(src)
        if resolved:
            return f'src="{resolved}"'
        return match.group(0)

    return re.sub(r'src="([^"]+)"', repl, html_body)


def render_pdf(md_text: str, title: str, meta_line: str, out_path: Path) -> None:
    md_text = strip_sync_comments(md_text)
    body = md_to_html(
        md_text,
        extensions=["extra", "sane_lists", "nl2br"],
    )
    body = rewrite_image_src_in_html(body)
    doc = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{CSS}</style></head>
<body>
<div class="meta">{html.escape(meta_line)}</div>
{body}
</body></html>"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=doc, base_url=str(BOOK)).write_pdf(str(out_path))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="Only generate one railKey, e.g. dp13")
    ap.add_argument("--skip-fetch", action="store_true", help="Skip rails without local override")
    args = ap.parse_args()

    sources = [s for s in load_sources() if (s.get("railKey") or "").startswith("dp")]
    if args.only:
        sources = [s for s in sources if s.get("railKey") == args.only]
        if not sources:
            raise SystemExit(f"No source for {args.only}")

    book_out = BOOK / "downloads" / "dp"
    challenge_out = ROOT / "challenge-site" / "public" / "downloads" / "dp"
    docs_out = ROOT / "docs" / "dp-pdfs"
    book_out.mkdir(parents=True, exist_ok=True)
    challenge_out.mkdir(parents=True, exist_ok=True)
    docs_out.mkdir(parents=True, exist_ok=True)

    wrote = 0
    for source in sources:
        dp = (source.get("dp") or "").upper()
        if not re.fullmatch(r"DP\d+", dp):
            continue
        rk = source.get("railKey")
        try:
            if args.skip_fetch and not source.get("localOverride"):
                # Still allow convention path
                if not local_override_path(source.get("localOverride")):
                    print(f"skip {rk}: no local override")
                    continue
            md_text = chapter_markdown(source)
        except Exception as exc:
            print(f"FAIL {rk}: {exc}")
            continue

        fname = f"{dp}-{COMPOSITE_VERSION}.pdf"
        label = source.get("label") or dp
        meta = (
            f"{label} · composite draft {COMPOSITE_VERSION} "
            f"(ordinal + local updates) · desirableproperties.org"
        )
        dests = [
            book_out / fname,
            challenge_out / fname,
            docs_out / fname,
            challenge_out / f"{dp.lower()}.pdf",  # DP page alias
        ]
        primary = dests[0]
        render_pdf(md_text, label, meta, primary)
        data = primary.read_bytes()
        for d in dests[1:]:
            d.write_bytes(data)
        print(f"OK {rk} -> {fname} ({len(data)} bytes)")
        wrote += 1

    print(f"Generated {wrote} composite PDF(s) at version {COMPOSITE_VERSION}")
    return 0 if wrote else 1


if __name__ == "__main__":
    raise SystemExit(main())
