#!/usr/bin/env python3
"""Build Astra integrated-book PDFs for challenge-site download links.

Reads chapter.md from astra/releases/{release_id}/dp01..dp23 and writes:
  challenge-site/public/downloads/astra/astra-community-review-draft-{release_id}.pdf
  challenge-site/public/downloads/astra/dp01.pdf .. dp23.pdf
"""
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

from markdown import markdown as md_to_html
from weasyprint import HTML

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RELEASE = "2026-09-05-integrated"
BOOK = ROOT / "desirableproperties-book"
BOOK_SITE = "https://book.desirableproperties.org"
CHALLENGE_OUT = ROOT / "challenge-site" / "public" / "downloads" / "astra"

CSS = """
@page { size: Letter; margin: 0.85in 0.9in; }
body {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #1a1a1a;
}
h1 { font-size: 20pt; margin: 0 0 0.6em; color: #1a1a1a; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
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
.chapter-break { page-break-before: always; }
"""


def strip_sync_comments(md_text: str) -> str:
    return re.sub(r"<!--.*?-->\s*", "", md_text, flags=re.DOTALL)


def resolve_asset_url(src: str) -> str | None:
    src = (src or "").strip()
    if not src or src.startswith(("http://", "https://", "data:")):
        return src or None
    rel = src.lstrip("/")
    for candidate in (BOOK / rel, ROOT / "challenge-site" / "public" / rel):
        if candidate.is_file():
            return candidate.resolve().as_uri()
    if rel.startswith("content/"):
        return f"{BOOK_SITE}/{rel}"
    return None


def rewrite_image_src_in_html(html_body: str) -> str:
    def repl(match: re.Match[str]) -> str:
        src = match.group(1)
        resolved = resolve_asset_url(src)
        if resolved:
            return f'src="{html.escape(resolved, quote=True)}"'
        return match.group(0)

    return re.sub(r'src="([^"]+)"', repl, html_body)


def render_pdf(md_text: str, title: str, meta_line: str, out_path: Path) -> None:
    md_text = strip_sync_comments(md_text)
    body = md_to_html(md_text, extensions=["extra", "sane_lists", "nl2br"])
    body = rewrite_image_src_in_html(body)
    doc = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>{CSS}</style></head>
<body>
<div class="meta">{html.escape(meta_line)}</div>
{body}
</body></html>"""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=doc, base_url=str(ROOT)).write_pdf(str(out_path))


def chapter_keys(release_dir: Path) -> list[str]:
    keys = []
    for path in sorted(release_dir.glob("dp*/chapter.md")):
        keys.append(path.parent.name)
    return keys


def read_chapter(release_dir: Path, dp_key: str) -> str:
    md_path = release_dir / dp_key / "chapter.md"
    if not md_path.is_file():
        raise FileNotFoundError(md_path)
    return md_path.read_text(encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--release", default=DEFAULT_RELEASE, help="Astra release id")
    ap.add_argument("--only", help="Only one dp key, e.g. dp01")
    args = ap.parse_args()

    release_dir = ROOT / "astra" / "releases" / args.release
    if not release_dir.is_dir():
        raise SystemExit(f"Release not found: {release_dir}")

    keys = chapter_keys(release_dir)
    if args.only:
        keys = [args.only.lower()]
        if args.only.lower() not in {k.lower() for k in keys}:
            raise SystemExit(f"Chapter not found: {args.only}")

    wrote = 0
    combined_parts: list[str] = []

    for dp_key in keys:
        md_text = read_chapter(release_dir, dp_key)
        dp_label = dp_key.upper()
        meta = (
            f"Astra editorial synthesis · {dp_label} · release {args.release} "
            f"· desirableproperties.org"
        )
        chapter_pdf = CHALLENGE_OUT / f"{dp_key}.pdf"
        render_pdf(md_text, f"{dp_label} · Astra synthesis", meta, chapter_pdf)
        print(f"OK {dp_key} -> {chapter_pdf.name} ({chapter_pdf.stat().st_size} bytes)")
        wrote += 1
        combined_parts.append(f"# {dp_label}\n\n{md_text.strip()}\n")

    if not args.only:
        full_meta = (
            f"Astra Community Review Draft · release {args.release} · "
            f"117 traceable changes across 22 chapters · desirableproperties.org"
        )
        full_md = "\n\n---\n\n".join(combined_parts)
        full_name = f"astra-community-review-draft-{args.release}.pdf"
        full_pdf = CHALLENGE_OUT / full_name
        render_pdf(full_md, "Desirable Properties · Astra synthesis", full_meta, full_pdf)
        print(f"OK full book -> {full_name} ({full_pdf.stat().st_size} bytes)")
        wrote += 1

    print(f"Generated {wrote} PDF(s) in {CHALLENGE_OUT}")
    return 0 if wrote else 1


if __name__ == "__main__":
    raise SystemExit(main())
