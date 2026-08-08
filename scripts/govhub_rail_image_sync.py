"""Sync markdown image references from Gov Hub revisions into the book tree."""
from __future__ import annotations

import hashlib
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

_IMAGE_MD_RE = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')
_IMAGE_HTML_RE = re.compile(
    r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_SAFE_NAME_RE = re.compile(r'[^a-zA-Z0-9._-]+')
_MAX_IMAGE_BYTES = 20 * 1024 * 1024
_BOOK_ASSETS_PREFIX = '/content/local/assets/dp/'


@dataclass
class ImageSyncResult:
    source: str
    dest_path: str = ''
    canonical_url: str = ''
    status: str = 'pending'
    detail: str = ''
    changed: bool = False


@dataclass
class RailImageSyncSummary:
    results: list[ImageSyncResult] = field(default_factory=list)
    body: str = ''
    body_changed: bool = False
    assets_changed: bool = False

    @property
    def copied(self) -> int:
        return sum(1 for row in self.results if row.status == 'copied')

    @property
    def skipped(self) -> int:
        return sum(1 for row in self.results if row.status in {'unchanged', 'skipped'})


def extract_image_urls(markdown: str) -> list[str]:
    """Return unique image URLs from markdown, in document order."""
    seen: set[str] = set()
    urls: list[str] = []
    for pattern in (_IMAGE_MD_RE, _IMAGE_HTML_RE):
        for match in pattern.finditer(markdown or ''):
            raw = (match.group(1) or '').strip()
            if not raw or raw.startswith('#') or raw.lower().startswith('data:'):
                continue
            if raw not in seen:
                seen.add(raw)
                urls.append(raw)
    return urls


def _sanitize_basename(name: str) -> str:
    base = Path(name).name.strip()
    if not base:
        return 'image.bin'
    stem = Path(base).stem
    suffix = Path(base).suffix.lower()
    stem = _SAFE_NAME_RE.sub('-', stem).strip('-._') or 'image'
    if suffix and not re.fullmatch(r'\.[a-z0-9]{1,8}', suffix):
        suffix = ''
    return f'{stem}{suffix}' if suffix else stem


def canonical_book_image_url(filename: str) -> str:
    return f'{_BOOK_ASSETS_PREFIX}{filename}'


def local_book_image_path(book_root: Path, filename: str) -> Path:
    rel = _BOOK_ASSETS_PREFIX.lstrip('/') + filename
    return book_root / rel


def _book_relative_path(href: str, book_root: Path) -> Path | None:
    path = (href or '').strip()
    if not path.startswith('/'):
        return None
    if path.startswith(_BOOK_ASSETS_PREFIX):
        rel = path.lstrip('/')
        return book_root / rel
    if path.startswith('/content/local/assets/'):
        return book_root / path.lstrip('/')
    return None


def _fetch_bytes(url: str, *, timeout: float = 30.0) -> bytes:
    req = urllib.request.Request(url, headers={'Accept': '*/*', 'User-Agent': 'dp-rail-sync/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise RuntimeError(f'image exceeds {_MAX_IMAGE_BYTES} bytes')
    return data


def _resolve_fetch_url(href: str, *, hub_url: str, book_root: Path) -> tuple[str, bytes]:
    """Return (label, bytes) for an image reference."""
    href = (href or '').strip()
    if not href:
        raise RuntimeError('empty image href')

    local_path = _book_relative_path(href, book_root)
    if local_path is not None and local_path.is_file():
        return str(local_path), local_path.read_bytes()

    if re.match(r'^https?://', href, re.IGNORECASE):
        return href, _fetch_bytes(href)

    if href.startswith('/'):
        base = (hub_url or '').rstrip('/')
        if not base:
            raise RuntimeError(f'cannot resolve relative image {href!r} without hub_url')
        return f'{base}{href}', _fetch_bytes(f'{base}{href}')

    raise RuntimeError(f'unsupported image reference {href!r}')


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sync_images_from_markdown(
    markdown: str,
    *,
    book_root: Path,
    hub_url: str = '',
    dry_run: bool = False,
    timeout: float = 30.0,
) -> RailImageSyncSummary:
    """
    For each image in markdown, copy into content/local/assets/dp/ when new or changed.

    Rewrites markdown image targets to canonical /content/local/assets/dp/<file> URLs.
    """
    summary = RailImageSyncSummary(body=markdown or '')
    urls = extract_image_urls(markdown or '')
    if not urls:
        return summary

    assets_dir = book_root / 'content' / 'local' / 'assets' / 'dp'
    if not dry_run:
        assets_dir.mkdir(parents=True, exist_ok=True)

    rewritten = markdown or ''
    for href in urls:
        row = ImageSyncResult(source=href)
        summary.results.append(row)
        try:
            fetch_label, data = _resolve_fetch_url(
                href,
                hub_url=hub_url,
                book_root=book_root,
            )
            row.detail = fetch_label
            filename = _sanitize_basename(urllib.parse.urlparse(href).path or href)
            dest = local_book_image_path(book_root, filename)
            canonical = canonical_book_image_url(filename)
            row.dest_path = str(dest)
            row.canonical_url = canonical

            if href == canonical and dest.is_file() and _sha256(dest.read_bytes()) == _sha256(data):
                row.status = 'unchanged'
                continue

            if dest.is_file() and _sha256(dest.read_bytes()) == _sha256(data):
                row.status = 'unchanged'
                if href != canonical:
                    rewritten = rewritten.replace(href, canonical)
                    summary.body_changed = True
                continue

            row.changed = True
            summary.assets_changed = True
            if dry_run:
                row.status = 'dry-run'
                if href != canonical:
                    rewritten = rewritten.replace(href, canonical)
                    summary.body_changed = True
                continue

            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            row.status = 'copied'
            if href != canonical:
                rewritten = rewritten.replace(href, canonical)
                summary.body_changed = True
        except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError, OSError) as exc:
            row.status = 'error'
            row.detail = str(exc)

    summary.body = rewritten
    return summary
