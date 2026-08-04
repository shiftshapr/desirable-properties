"""Shared helpers for Gov Hub ↔ Desirable Properties book rail scripts."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

GOVHUB_SYNC_MARKER = 'govhub-sync:'

HUB_URLS: dict[str, str] = {
    'dev': 'https://dev.hub.themetalayer.org',
    'main': 'https://hub.themetalayer.org',
}

# Canonical env keys shared by rail sync / publish scripts.
ENV_ALIASES: dict[str, str] = {
    'dev': 'dev',
    'development': 'dev',
    'main': 'main',
    'production': 'main',
}

DEFAULT_GOVHUB_ROOTS: dict[str, Path] = {
    'dev': Path('/home/ubuntu/gov-hub-dev'),
    'main': Path('/home/ubuntu/gov-hub-prod'),
}


def canonical_env(env: str) -> str:
    """Normalize --env to dev or main."""
    key = (env or 'dev').strip().lower()
    if key not in ENV_ALIASES:
        allowed = ', '.join(sorted(ENV_ALIASES))
        raise ValueError(f'unknown env {env!r}; use one of: {allowed}')
    return ENV_ALIASES[key]


def flask_env_for_env(env: str) -> str:
    """Map --env to Gov Hub FLASK_ENV (development or production)."""
    return 'development' if canonical_env(env) == 'dev' else 'production'


def default_govhub_root(env: str) -> Path:
    """Default Gov Hub checkout for --env."""
    return DEFAULT_GOVHUB_ROOTS[canonical_env(env)]


def hub_url_for_env(env: str) -> str:
    """Public hub base URL for --env."""
    return HUB_URLS[canonical_env(env)]

_SYNC_LINE_RE = re.compile(
    r'<!--\s*govhub-sync:\s*([^>]*?)\s*-->',
    re.IGNORECASE,
)


def load_dp_manifest(sources_sat: Path) -> list[dict[str, Any]]:
    """DP rails from sources-sat.json, in chapter order."""
    data = json.loads(sources_sat.read_text(encoding='utf-8'))
    rails: list[dict[str, Any]] = []
    for src in data.get('sources', []):
        rail = src.get('railKey') or ''
        if not re.fullmatch(r'dp\d{2}', rail):
            continue
        rails.append({
            'railKey': rail,
            'dp': src.get('dp') or f"DP{int(rail[2:])}",
            'dp_number': int(rail[2:]),
            'label': src.get('label') or '',
            'ml_number': src.get('mlNumber') or '',
            'local_override': src.get('localOverride') or '',
            'status': src.get('status') or '',
        })
    rails.sort(key=lambda r: r['dp_number'])
    return rails


def local_rail_filename(rail: dict[str, Any]) -> str:
    """Basename for the on-disk rail file (dp1.md … dp23.md)."""
    override = (rail.get('local_override') or '').strip()
    if override:
        name = Path(override.lstrip('/')).name
        if name:
            return name
    return f"dp{rail['dp_number']}.md"


def local_rail_path(content_dir: Path, rail: dict[str, Any]) -> Path:
    return content_dir / local_rail_filename(rail)


def parse_sync_marker(text: str) -> dict[str, str] | None:
    """Parse the govhub-sync HTML comment, if present."""
    match = _SYNC_LINE_RE.search(text or '')
    if not match:
        return None
    fields: dict[str, str] = {}
    for part in match.group(1).split():
        if '=' in part:
            key, value = part.split('=', 1)
            fields[key.strip()] = value.strip()
    return fields or None


def format_sync_marker(
    *,
    ml_number: str,
    revision_number: str,
    submission_id: str,
    content_hash: str,
    synced_at: str | None = None,
) -> str:
    when = synced_at or datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    digest = (content_hash or '')[:16]
    return (
        f'<!-- {GOVHUB_SYNC_MARKER} ml={ml_number} revision={revision_number} '
        f'submission={submission_id} hash={digest} synced={when} -->'
    )


def strip_sync_marker(text: str) -> str:
    """Return text with any govhub-sync comment line removed."""
    lines = []
    for line in (text or '').splitlines():
        if GOVHUB_SYNC_MARKER in line and line.strip().startswith('<!--'):
            continue
        lines.append(line)
    return '\n'.join(lines).rstrip('\n')


def upsert_sync_marker(text: str, marker_line: str) -> str:
    """Replace an existing govhub-sync comment or insert after the first block."""
    stripped = strip_sync_marker(text)
    if not stripped:
        return marker_line + '\n'
    lines = stripped.splitlines()
    insert_at = 0
    for idx, line in enumerate(lines[:12]):
        if line.strip().startswith('<!--') and GOVHUB_SYNC_MARKER not in line:
            insert_at = idx + 1
            break
        if line.strip() == '---':
            insert_at = idx + 1
            break
    lines.insert(insert_at, marker_line)
    return '\n'.join(lines) + '\n'


def _http_json(url: str, *, timeout: float = 30.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _http_text(url: str, *, timeout: float = 30.0) -> str:
    req = urllib.request.Request(url, headers={'Accept': 'text/plain'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8')


_READER_REV_RE = re.compile(
    r'class="draft-reader-revision"[^>]*>\s*Revision\s+(\d+)\s*</a>',
    re.IGNORECASE,
)


def _fetch_revision_from_reader(hub_url: str, ml_number: str, *, timeout: float = 30.0) -> str:
    """Best-effort revision label from the public reader page."""
    read_url = f'{hub_url.rstrip("/")}/doc/draft/{ml_number}/read/'
    req = urllib.request.Request(read_url, headers={'Accept': 'text/html'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except (urllib.error.HTTPError, urllib.error.URLError):
        return ''
    match = _READER_REV_RE.search(html)
    return match.group(1) if match else ''


def fetch_body_via_api(hub_url: str, ml_number: str, *, timeout: float = 30.0) -> tuple[str, dict[str, Any]]:
    """
    Fetch the latest served revision body for an ML number via Gov Hub HTTP API.

    Uses read-meta to resolve the served submission id, then downloads the
    stored upload as plain text from /doc/draft/<submission_id>.txt .
    """
    base = hub_url.rstrip('/')
    meta_url = f'{base}/api/doc/draft/{ml_number}/read-meta/'
    try:
        meta = _http_json(meta_url, timeout=timeout)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'read-meta HTTP {exc.code} for {ml_number}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'read-meta failed for {ml_number}: {exc.reason}') from exc

    submission_id = (meta.get('submission_id') or '').strip()
    if not submission_id:
        raise RuntimeError(f'read-meta missing submission_id for {ml_number}')

    text_url = f'{base}/doc/draft/{submission_id}.txt'
    try:
        body = _http_text(text_url, timeout=timeout)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'draft text HTTP {exc.code} for {submission_id}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'draft text failed for {submission_id}: {exc.reason}') from exc

    if body.lstrip().startswith('INTERNET-DRAFT'):
        raise RuntimeError(
            f'draft text for {ml_number} looks like a placeholder, not stored upload'
        )

    revision_number = _fetch_revision_from_reader(base, ml_number, timeout=timeout) or '00'

    info = {
        'submission_id': submission_id,
        'content_hash': (meta.get('content_hash') or '').strip(),
        'revision_number': revision_number,
        'source': 'api',
    }
    return body.rstrip('\n') + '\n', info


def fetch_body_via_db(govhub_root: Path, flask_env: str, ml_number: str) -> tuple[str, dict[str, Any]]:
    """Fetch latest served revision body from a local Gov Hub SQLite checkout."""
    import os
    import sys

    if not (govhub_root / 'app.py').is_file():
        raise RuntimeError(f'{govhub_root} does not look like a Gov Hub checkout')

    os.environ['FLASK_ENV'] = flask_env
    sys.path.insert(0, str(govhub_root))

    from app import create_app  # noqa: E402
    from services.submissions import get_readable_submission_by_ref  # noqa: E402

    app = create_app()
    with app.app_context():
        sub = get_readable_submission_by_ref(ml_number)
        if sub is None:
            raise RuntimeError(f'no Gov Hub draft found for {ml_number}')
        if (sub.status or '') not in ('approved', 'published'):
            raise RuntimeError(f'{ml_number} served row status is {sub.status!r}')
        file_path = (sub.file_path or '').strip()
        if not file_path or not Path(file_path).is_file():
            raise RuntimeError(f'{ml_number} has no readable upload at {file_path!r}')

        body = Path(file_path).read_text(encoding='utf-8')
        info = {
            'submission_id': sub.id,
            'content_hash': (sub.content_hash or '').strip(),
            'revision_number': (getattr(sub, 'revision_number', '') or '').strip(),
            'source': 'local-db',
        }
        return body.rstrip('\n') + '\n', info
