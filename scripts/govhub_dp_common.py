"""Shared helpers for Gov Hub ↔ Desirable Properties book rail scripts."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

GOVHUB_SYNC_MARKER = 'govhub-sync:'

FRONT_MATTER_RAIL_KEYS = frozenset({'about', 'acknowledgements'})
FRONT_MATTER_ORDER = ('about', 'acknowledgements')

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


def utc_date_from_timestamp(value: datetime | str | None) -> date | None:
    """Extract the UTC calendar date from a Gov Hub timestamp."""
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.endswith('Z'):
            text = text[:-1] + '+00:00'
        value = datetime.fromisoformat(text)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date()


def find_same_day_approved_revision(
    revisions: list[dict[str, Any]],
    *,
    reference_date: date | None = None,
) -> dict[str, Any] | None:
    """
    Return a revision dict if the family already has an approved revision
    on reference_date (UTC). Each revision dict needs status and approved_at.
    """
    ref = reference_date or datetime.now(timezone.utc).date()
    for row in revisions:
        if (row.get('status') or '') not in ('approved', 'published'):
            continue
        approved_on = utc_date_from_timestamp(row.get('approved_at'))
        if approved_on == ref:
            return row
    return None


def same_day_publish_block_message(
    *,
    ml_number: str,
    display_key: str,
    revision_number: str,
    approved_date: date,
) -> str:
    """Human-readable reason a same-day publish was blocked."""
    label = display_key or ml_number or 'chapter'
    ml_part = f' ({ml_number})' if ml_number else ''
    return (
        f'{label}{ml_part} already has approved revision {revision_number} '
        f'from today ({approved_date.isoformat()} UTC). '
        'Publish at most one revision batch per chapter per UTC day, '
        'or pass --force to override.'
    )

_SYNC_LINE_RE = re.compile(
    r'<!--\s*govhub-sync:\s*([^>]*?)\s*-->',
    re.IGNORECASE,
)


def _parse_rail_entry(src: dict[str, Any]) -> dict[str, Any]:
    """Normalize a sources-sat.json entry into a rail dict."""
    rail = src.get('railKey') or ''
    entry: dict[str, Any] = {
        'railKey': rail,
        'label': src.get('label') or '',
        'ml_number': src.get('mlNumber') or '',
        'local_override': src.get('localOverride') or '',
        'status': src.get('status') or '',
    }
    if re.fullmatch(r'dp\d{2}', rail):
        dp = src.get('dp') or f"DP{int(rail[2:])}"
        entry.update({
            'kind': 'dp',
            'dp': dp,
            'dp_number': int(rail[2:]),
            'display_key': dp,
        })
    elif rail in FRONT_MATTER_RAIL_KEYS:
        entry.update({
            'kind': 'front_matter',
            'display_key': rail,
        })
    else:
        entry['kind'] = 'other'
    return entry


def load_dp_manifest(sources_sat: Path) -> list[dict[str, Any]]:
    """DP rails from sources-sat.json, in chapter order."""
    data = json.loads(sources_sat.read_text(encoding='utf-8'))
    rails: list[dict[str, Any]] = []
    for src in data.get('sources', []):
        rail = src.get('railKey') or ''
        if not re.fullmatch(r'dp\d{2}', rail):
            continue
        rails.append(_parse_rail_entry(src))
    rails.sort(key=lambda r: r['dp_number'])
    return rails


def load_front_matter_manifest(sources_sat: Path) -> list[dict[str, Any]]:
    """Front matter rails (about, acknowledgements) from sources-sat.json."""
    data = json.loads(sources_sat.read_text(encoding='utf-8'))
    order = {key: idx for idx, key in enumerate(FRONT_MATTER_ORDER)}
    rails: list[dict[str, Any]] = []
    for src in data.get('sources', []):
        rail = src.get('railKey') or ''
        if rail not in FRONT_MATTER_RAIL_KEYS:
            continue
        rails.append(_parse_rail_entry(src))
    rails.sort(key=lambda r: order.get(r['railKey'], 99))
    return rails


def load_sync_rails_manifest(sources_sat: Path) -> list[dict[str, Any]]:
    """All synced rails: front matter first, then DP chapters."""
    return load_front_matter_manifest(sources_sat) + load_dp_manifest(sources_sat)


def filter_rails_by_only(rails: list[dict[str, Any]], only: str) -> list[dict[str, Any]]:
    """Filter rails by --only tokens (about, acknowledgements, DP1, …)."""
    wanted = {token.strip().casefold() for token in only.split(',') if token.strip()}
    if not wanted:
        return rails
    filtered: list[dict[str, Any]] = []
    for rail in rails:
        keys = {
            (rail.get('display_key') or '').casefold(),
            (rail.get('railKey') or '').casefold(),
            (rail.get('dp') or '').casefold(),
        }
        if wanted & keys:
            filtered.append(rail)
    return filtered


def local_rail_filename(rail: dict[str, Any]) -> str:
    """Basename for the on-disk rail file (about.md, dp1.md, …)."""
    override = (rail.get('local_override') or '').strip()
    if override:
        name = Path(override.lstrip('/')).name
        if name:
            return name
    if rail.get('kind') == 'front_matter':
        return f"{rail['railKey']}.md"
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


GOVHUB_HTTP_USER_AGENT = 'desirable-properties-rail-sync/1.0'


def _http_headers(*, accept: str) -> dict[str, str]:
    return {'Accept': accept, 'User-Agent': GOVHUB_HTTP_USER_AGENT}


def _http_json(url: str, *, timeout: float = 30.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=_http_headers(accept='application/json'))
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _http_text(url: str, *, timeout: float = 30.0) -> str:
    req = urllib.request.Request(url, headers=_http_headers(accept='text/plain'))
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode('utf-8')


_READER_REV_RE = re.compile(
    r'class="draft-reader-revision"[^>]*>\s*Revision\s+(\d+)\s*</a>',
    re.IGNORECASE,
)


def _fetch_revision_from_reader(hub_url: str, ml_number: str, *, timeout: float = 30.0) -> str:
    """Best-effort revision label from the public reader page."""
    read_url = f'{hub_url.rstrip("/")}/doc/draft/{ml_number}/read/'
    req = urllib.request.Request(read_url, headers=_http_headers(accept='text/html'))
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
