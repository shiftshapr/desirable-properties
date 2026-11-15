#!/usr/bin/env python3
"""
Edition record, book-repo side (docs/EDITIONS.md).

Gov Hub is the source of the edition record (``GET /api/doc/editions/?work=desirableproperties-book``,
contract in ~/handoff/specs/edition-record-contract.md). This module:

* validates a Gov Hub editions response and refuses anything malformed (``EditionsError``);
* generates ``desirableproperties-book/json/editions.json`` from it, adding what only the book repo
  knows per rail: the sha256 of the file in ``content/local``, the archive copy
  (``archiveKey``/``archiveRev``) and the inscription of that exact text (``inscriptionId``);
* stamps the travelling records: archive entries in ``chapter-archives.json`` (``edition``, plus the
  derived ``current_label``) and inscription records in ``sources-sat.json`` (``inscriptionEdition``,
  ``inscriptionOnEditionList``);
* checks that all of them agree (``check_agreement``), including the edition stamps in PDFs.

Stamp = the edition a revision was made for (origin, never changes).
List  = the exact revisions an edition is made of (membership; an unchanged chapter is carried forward).

Generation is a step of scripts/govhub_sync_rails_from_hub.py; the agreement check is
scripts/check_editions_agree.py. Standard library only.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
import urllib.error
import urllib.request
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

WORK_ID = 'desirableproperties-book'
SCHEMA = 'dp-book-editions/v1'
EDITIONS_PATH = '/api/doc/editions/'
MANIFEST_NAME = 'editions.json'
SNAPSHOT_NAME = 'editions.source.json'
ARCHIVES_NAME = 'chapter-archives.json'
SOURCES_SAT_NAME = 'sources-sat.json'
MANIFEST_URL_PATH = '/json/editions.json'
GENERATOR = 'scripts/govhub_sync_rails_from_hub.py'

STATUSES = ('released', 'in_progress')
SHA256_RE = re.compile(r'^[0-9a-f]{64}$')
SYNC_SUBMISSION_RE = re.compile(r'<!--\s*govhub-sync:[^>]*\bsubmission=([0-9A-Za-z-]+)')
SYNC_REVISION_RE = re.compile(r'<!--\s*govhub-sync:[^>]*\brevision=([0-9A-Za-z]+)')

# Where chapter and book PDFs live (repo-relative). Bridges are never stamped.
PDF_GLOBS = (
    'desirableproperties-book/downloads/dp/*.pdf',
    'docs/*.pdf',
    'docs/dp-pdfs/*.pdf',
    'challenge-site/public/downloads/*.pdf',
    'challenge-site/public/downloads/dp/*.pdf',
    'challenge-site/public/downloads/dp-v1.0/*.pdf',
)
# Reference material outside editions (Astra's 2026-09-05 editorial synthesis is not Gov Hub revision
# text, so no edition lists it): reported as such, never a gap, never stamped.
NOT_EDITION_PDF_GLOBS = ('challenge-site/public/downloads/astra/*.pdf',)


class EditionsError(RuntimeError):
    """The Gov Hub editions answer is missing or malformed: nothing may be generated from it."""


# --------------------------------------------------------------------------- small helpers

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def canonical_sha256(obj: Any) -> str:
    return sha256_bytes(canonical_json(obj))


def dump_json(obj: Any) -> str:
    """The repo's JSON style: two-space indent, UTF-8 kept, trailing newline."""
    return json.dumps(obj, indent=2, ensure_ascii=False) + '\n'


def parse_time(value: Any) -> datetime | None:
    """ISO date/time or unix seconds → aware datetime (UTC). None when absent or unparseable."""
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    text = str(value).strip()
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', text):
        text += 'T00:00:00+00:00'
    text = text.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def in_progress_label(label: str) -> str:
    return f'{label}, in progress'


def sync_marker_submission(text: str) -> str | None:
    m = SYNC_SUBMISSION_RE.search(text or '')
    return m.group(1) if m else None


def sync_marker_revision(text: str) -> str | None:
    m = SYNC_REVISION_RE.search(text or '')
    return m.group(1) if m else None


def _insert_after(d: dict, after_keys: Iterable[str], items: dict) -> dict:
    """Copy of ``d`` with ``items`` set right after the first key of ``after_keys`` that ``d`` has
    (in that order of preference); at the end when it has none."""
    out = {k: v for k, v in d.items() if k not in items}
    anchor = next((k for k in after_keys if k in out), None)
    if anchor is None:
        out.update(items)
        return out
    result: dict = {}
    for k, v in out.items():
        result[k] = v
        if k == anchor:
            result.update(items)
    return result


# --------------------------------------------------------------------------- fetching

def fetch_editions(hub_url: str, *, work: str = WORK_ID, timeout: float = 30.0) -> tuple[dict, str]:
    """GET the edition record from Gov Hub. Raises EditionsError when it is missing or not JSON."""
    url = f'{hub_url.rstrip("/")}{EDITIONS_PATH}?work={work}'
    req = urllib.request.Request(url, headers={
        'Accept': 'application/json',
        # Gov Hub answers some non-browser user agents with 403 (see scripts/v1-book-pdf/build.mjs).
        'User-Agent': 'Mozilla/5.0 (dp-book-editions rail sync)',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as exc:
        raise EditionsError(f'Gov Hub editions endpoint answered HTTP {exc.code}: {url}') from exc
    except urllib.error.URLError as exc:
        raise EditionsError(f'Gov Hub editions endpoint unreachable ({exc.reason}): {url}') from exc
    try:
        data = json.loads(raw.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise EditionsError(f'Gov Hub editions endpoint did not return JSON: {url}') from exc
    return data, url


def load_fixture(path: Path) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        raise EditionsError(f'cannot read editions fixture {path}: {exc}') from exc


# --------------------------------------------------------------------------- validation

MANIFEST_SHA_KEYS = ('railKey', 'mlNumber', 'revision', 'submissionId', 'sha256')


def govhub_manifest_sha256(rails: list[dict]) -> str:
    """The contract's manifestSha256: canonical JSON of the rails (book order), each reduced to
    railKey, mlNumber, revision, submissionId, sha256."""
    return canonical_sha256([{k: r.get(k) for k in MANIFEST_SHA_KEYS} for r in rails])


def is_book_repo_entry(rail: dict) -> bool:
    """A list entry Gov Hub cannot fill (no document in this database): the book repo fills it."""
    return not (rail.get('submissionId') or rail.get('mlNumber') or rail.get('sha256'))

def edition_chain(editions: list[dict]) -> list[dict]:
    """Editions ordered from the first (no predecessor) to the latest. Assumes a validated list."""
    by_pred = {e.get('predecessorEditionId'): e for e in editions}
    chain: list[dict] = []
    cur = by_pred.get(None)
    while cur is not None and len(chain) <= len(editions):
        chain.append(cur)
        cur = by_pred.get(cur['editionId'])
    return chain


def validate_response(data: Any, sources_sat: dict, *, work: str = WORK_ID) -> list[str]:
    """Every reason the Gov Hub answer cannot be used. Empty list = usable."""
    errs: list[str] = []
    if not isinstance(data, dict):
        return ['response is not a JSON object']
    if data.get('work') != work:
        errs.append(f'work is {data.get("work")!r}, expected {work!r}')
    editions = data.get('editions')
    if not isinstance(editions, list) or not editions:
        return errs + ['editions is missing or empty']

    sources = {s.get('railKey'): s for s in sources_sat.get('sources', []) if s.get('railKey')}
    article_rails = list(sources_sat.get('articleRails') or [])
    ids: list[str] = []
    for i, ed in enumerate(editions):
        where = f'editions[{i}]'
        if not isinstance(ed, dict):
            errs.append(f'{where} is not an object')
            continue
        eid = ed.get('editionId')
        if not isinstance(eid, str) or not eid.strip():
            errs.append(f'{where}.editionId missing')
            continue
        where = f'edition {eid}'
        ids.append(eid)
        if not isinstance(ed.get('label'), str) or not ed['label'].strip():
            errs.append(f'{where}: label missing')
        status = ed.get('status')
        if status not in STATUSES:
            errs.append(f'{where}: status {status!r} is not one of {STATUSES}')
        if ed.get('releasedAt') not in (None, '') and parse_time(ed.get('releasedAt')) is None:
            errs.append(f'{where}: releasedAt is not a date')
        if status == 'in_progress' and ed.get('releasedAt') not in (None, ''):
            errs.append(f'{where}: in progress but has releasedAt')
        if not isinstance(ed.get('rails'), list):
            errs.append(f'{where}: rails missing')
    if len(set(ids)) != len(ids):
        errs.append(f'duplicate editionId in {ids}')
    if errs:
        return errs

    in_progress = [e for e in editions if e['status'] == 'in_progress']
    if len(in_progress) != 1:
        errs.append(f'exactly one edition must be in progress; found {len(in_progress)}')
    elif data.get('currentEdition') != in_progress[0]['editionId']:
        errs.append(f'currentEdition {data.get("currentEdition")!r} is not the edition in progress '
                    f'({in_progress[0]["editionId"]!r})')
    preds = [e.get('predecessorEditionId') for e in editions]
    if preds.count(None) != 1:
        errs.append('exactly one edition must have no predecessor')
    for e in editions:
        p = e.get('predecessorEditionId')
        if p is not None and p not in ids:
            errs.append(f'edition {e["editionId"]}: predecessor {p!r} is not in the response')
    if len([p for p in preds if p is not None]) != len({p for p in preds if p is not None}):
        errs.append('two editions share a predecessor (the record must be one line of editions)')
    if errs:
        return errs
    chain = edition_chain(editions)
    if len(chain) != len(editions):
        return errs + ['predecessorEditionId does not link every edition into one line']
    if chain[-1]['status'] != 'in_progress':
        errs.append(f'the latest edition ({chain[-1]["editionId"]}) must be the one in progress')
    order = {e['editionId']: i for i, e in enumerate(chain)}

    for ed in editions:
        eid = ed['editionId']
        seen: set[str] = set()
        for j, rail in enumerate(ed['rails']):
            where = f'edition {eid} rails[{j}]'
            if not isinstance(rail, dict):
                errs.append(f'{where} is not an object')
                continue
            key = rail.get('railKey')
            if not isinstance(key, str) or not key:
                errs.append(f'{where}: railKey missing')
                continue
            where = f'edition {eid} rail {key}'
            if key in seen:
                errs.append(f'{where}: listed twice')
            seen.add(key)
            src = sources.get(key)
            if src is None:
                errs.append(f'{where}: not a rail of the book (sources-sat.json)')
                continue
            sha = rail.get('sha256') or ''
            if sha and not SHA256_RE.match(str(sha)):
                errs.append(f'{where}: sha256 is not 64 lowercase hex characters')
            stamp = rail.get('revisionEdition')
            if stamp and stamp not in order:
                errs.append(f'{where}: revisionEdition {stamp!r} is not an edition')
            elif stamp and order[stamp] > order[eid]:
                errs.append(f'{where}: revision stamped {stamp} cannot be on the {eid} list')
            if is_book_repo_entry(rail):
                # No Gov Hub document for this page here (the Edition page; the Foreword on dev): the book
                # repo fills it from content/local.
                continue
            # A different mlNumber is not an error: Gov Hub resolves rails per database (on dev, book_cover
            # is ML-Draft-054 and dp24 ML-Draft-057). The rail sync's served-revision cross-check and the
            # agreement check (sync marker = listed submission) catch a wrong document.
            if rail.get('submissionId'):
                for fld in ('mlNumber', 'revision', 'sha256', 'revisionEdition'):
                    if not rail.get(fld):
                        errs.append(f'{where}: {fld} missing')
            elif ed.get('status') != 'released':
                errs.append(f'{where}: no submissionId; only a released edition may list text that is no '
                            f'Gov Hub revision (the inscribed 0.77 drafts)')
            elif not sha:
                errs.append(f'{where}: no submissionId and no sha256 (the text it lists must be hashed)')
        if ed['status'] == 'released' and ed.get('manifestSha256'):
            if govhub_manifest_sha256(ed['rails']) != ed['manifestSha256']:
                errs.append(f'edition {eid}: manifestSha256 does not match its rails (contract method)')
        missing = [k for k in article_rails if k not in seen]
        if missing and ed['status'] == 'in_progress':
            # A released edition may predate a rail added later (the Rights chapter in 1.1).
            errs.append(f'edition {eid}: rails missing from the list: {", ".join(missing)}')
    return errs


# --------------------------------------------------------------------------- derivations

@dataclass
class Book:
    """The book-repo state the generator and the check read."""
    book_root: Path
    sources_sat: dict
    archives: dict | None
    read_local: Callable[[str], bytes | None]

    @classmethod
    def load(cls, book_root: Path, overlay: dict[str, bytes] | None = None,
             sources_sat_path: Path | None = None) -> 'Book':
        book_root = Path(book_root)
        sat_path = sources_sat_path or (book_root / 'json' / SOURCES_SAT_NAME)
        sources_sat = json.loads(sat_path.read_text(encoding='utf-8'))
        arch_path = sat_path.parent / ARCHIVES_NAME
        archives = json.loads(arch_path.read_text(encoding='utf-8')) if arch_path.is_file() else None
        overlay = dict(overlay or {})

        def read_local(rel: str) -> bytes | None:
            rel = '/' + rel.lstrip('/')
            if rel in overlay:
                return overlay[rel]
            path = book_root / rel.lstrip('/')
            return path.read_bytes() if path.is_file() else None

        return cls(book_root=book_root, sources_sat=sources_sat, archives=archives, read_local=read_local)

    def source(self, rail_key: str) -> dict:
        for s in self.sources_sat.get('sources', []):
            if s.get('railKey') == rail_key:
                return s
        return {}

    def archive_entries(self) -> list[dict]:
        return list((self.archives or {}).get('archives') or [])


def edition_for_time(chain: list[dict], when: datetime | None) -> str | None:
    """The edition that was in progress at ``when``: the first in line not yet released by then."""
    if when is None:
        return None
    for ed in chain:
        released = parse_time(ed.get('releasedAt'))
        if released is None or when < released:
            return ed['editionId']
    return chain[-1]['editionId'] if chain else None


def _revision_number(value: Any) -> int | None:
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def revision_stamp(chain: list[dict], rail_key: str, submission_id: str | None = None,
                   revision: Any = None, made_at: datetime | None = None, sha256: str | None = None) -> str | None:
    """A revision's stamp (the edition it was made for), for revisions the Gov Hub record may not list.

    1. A list holds the revision (by submission id, else by the text's sha256): its ``revisionEdition``.
    2. Otherwise walk the editions in order: a revision numbered at or below the one a released edition
       lists for the rail belongs to that edition ("up to and including the 0.77 one are 0.77"); where
       the edition does not list the rail by number, a revision made before its release belongs to it.
    3. Anything later belongs to the edition in progress.
    """
    for ed in chain:
        for r in ed.get('rails', []):
            if r.get('railKey') != rail_key:
                continue
            if (submission_id and r.get('submissionId') == submission_id) or \
               (sha256 and sha256 in (r.get('sha256'), r.get('localSha256'))):
                return r.get('revisionEdition') or ed['editionId']
    n = _revision_number(revision)
    for ed in chain:
        if ed.get('status') != 'released':
            continue
        row = next((r for r in ed.get('rails', []) if r.get('railKey') == rail_key), None)
        listed = _revision_number(row.get('revision')) if row else None
        if n is not None and listed is not None:
            if n <= listed:
                return ed['editionId']
            continue
        released = parse_time(ed.get('releasedAt'))
        if made_at is not None and released is not None and made_at < released:
            return ed['editionId']
    current = next((e for e in chain if e.get('status') == 'in_progress'), None)
    return current['editionId'] if current else None


def display_edition(manifest: dict, rail_key: str, submission_id: str | None = None,
                    sha256: str | None = None) -> dict | None:
    """How a revision is labelled to readers: the latest *released* edition whose list holds it,
    else the edition in progress when its list holds it. None when no list holds it."""
    chain = edition_chain(manifest.get('editions') or [])

    def holds(ed: dict) -> bool:
        for r in ed.get('rails', []):
            if r.get('railKey') != rail_key:
                continue
            if submission_id and r.get('submissionId') == submission_id:
                return True
            if not submission_id and sha256 and sha256 in (r.get('sha256'), r.get('localSha256')):
                return True
        return False

    for ed in reversed(chain):
        if ed['status'] == 'released' and holds(ed):
            return {'editionId': ed['editionId'], 'label': ed['label'], 'status': 'released'}
    for ed in chain:
        if ed['status'] == 'in_progress' and holds(ed):
            return {'editionId': ed['editionId'], 'label': in_progress_label(ed['label']),
                    'status': 'in_progress'}
    return None


def live_rail(manifest: dict, rail_key: str) -> dict | None:
    for ed in manifest.get('editions') or []:
        if ed.get('status') == 'in_progress':
            for r in ed.get('rails', []):
                if r.get('railKey') == rail_key:
                    return r
    return None


def live_book_label(manifest: dict) -> dict | None:
    """The label of the live book as a whole: the latest released edition when every live rail is on
    its list, else the edition in progress."""
    eds = manifest.get('editions') or []
    chain = edition_chain(eds)
    current = next((e for e in chain if e.get('status') == 'in_progress'), None)
    if current is None:
        return None
    released = [e for e in chain if e.get('status') == 'released']
    if released:
        last = released[-1]
        last_by_key = {r['railKey']: r for r in last.get('rails', [])}

        def same(a: dict, b: dict | None) -> bool:
            if b is None:
                return False
            if a.get('submissionId') or b.get('submissionId'):
                return a.get('submissionId') == b.get('submissionId')
            return bool(a.get('sha256')) and a.get('sha256') == b.get('sha256')

        if all(same(r, last_by_key.get(r['railKey'])) for r in current.get('rails', [])):
            return {'editionId': last['editionId'], 'label': last['label'], 'status': 'released'}
    return {'editionId': current['editionId'], 'label': in_progress_label(current['label']),
            'status': 'in_progress'}


# --------------------------------------------------------------------------- generation

@dataclass
class Generated:
    manifest: dict
    snapshot: dict
    archives: dict | None
    sources_sat: dict
    notes: list[str] = field(default_factory=list)


def _previous_edition(previous: dict | None, edition_id: str) -> dict | None:
    return next((e for e in (previous or {}).get('editions') or [] if e.get('editionId') == edition_id), None)


def _previous_rail(previous: dict | None, edition_id: str, rail_key: str) -> dict | None:
    for ed in (previous or {}).get('editions') or []:
        if ed.get('editionId') == edition_id:
            for r in ed.get('rails', []):
                if r.get('railKey') == rail_key:
                    return r
    return None


def generate(response: dict, book: Book, *, source: dict, previous: dict | None = None) -> Generated:
    """Build the manifest and the stamped records from a validated Gov Hub answer and the repo."""
    errs = validate_response(response, book.sources_sat)
    if errs:
        raise EditionsError('Gov Hub editions answer is malformed:\n  - ' + '\n  - '.join(errs))

    response = copy.deepcopy(response)
    notes: list[str] = []
    gh_editions = response['editions']
    chain = edition_chain(gh_editions)
    order = {e['editionId']: i for i, e in enumerate(chain)}
    archives = book.archive_entries()
    archive_by_sub = {}
    for a in archives:
        sub = (a.get('govhub') or {}).get('submission_id')
        if sub:
            archive_by_sub.setdefault((a.get('key'), sub), a)

    # The live file per rail: its sha and the Gov Hub revision its sync marker names.
    live: dict[str, dict] = {}
    for key in book.sources_sat.get('articleRails') or []:
        src = book.source(key)
        local = (src.get('localOverride') or '').strip()
        data = book.read_local(local) if local else None
        text = data.decode('utf-8', errors='replace') if data is not None else ''
        live[key] = {
            'localPath': local or None,
            'sha': sha256_bytes(data) if data is not None else None,
            'submission': sync_marker_submission(text),
        }

    inscriptions = {s['railKey']: s for s in book.sources_sat.get('sources', [])
                    if s.get('railKey') and s.get('inscriptionId')}

    out_editions: list[dict] = []
    for ed in chain:
        eid = ed['editionId']
        rails_out: list[dict] = []
        gh_rails = {r['railKey']: r for r in ed['rails']}
        for key in book.sources_sat.get('articleRails') or []:
            if key not in gh_rails:
                continue  # a rail added after this edition was released
            gh = gh_rails[key]
            info = live[key]
            prev = _previous_rail(previous, eid, key)
            sub = gh.get('submissionId') or None
            book_repo = is_book_repo_entry(gh)
            if gh.get('mlNumber') and book.source(key).get('mlNumber') and gh['mlNumber'] != book.source(key)['mlNumber']:
                note = (f'{key}: Gov Hub lists {gh["mlNumber"]} here; sources-sat.json says '
                        f'{book.source(key)["mlNumber"]}')
                if note not in notes:
                    notes.append(note)
            row = {
                'railKey': key,
                'mlNumber': gh.get('mlNumber') or None,
                'revision': gh.get('revision') or None,
                'submissionId': sub,
                'sha256': gh.get('sha256') or None,
                'revisionEdition': gh.get('revisionEdition') or None,
                'source': 'book-repo' if book_repo else 'govhub',
                'localPath': info['localPath'],
                'localSha256': None,
                'archiveKey': None,
                'archiveRev': None,
                'inscriptionId': None,
                'note': gh.get('note') or None,
            }
            is_live = bool(sub) and sub == info['submission']
            if book_repo:
                # The Edition page: no Gov Hub document, so the book repo fills it.
                if ed['status'] == 'in_progress' or prev is None:
                    row['sha256'] = row['localSha256'] = info['sha']
                    is_live = True
                else:
                    row['sha256'] = prev.get('sha256')
                    row['localSha256'] = prev.get('localSha256')
                    is_live = row['localSha256'] == info['sha']
            elif is_live:
                row['localSha256'] = info['sha']
            elif sub and prev and prev.get('submissionId') == sub and prev.get('localSha256'):
                row['localSha256'] = prev['localSha256']
            elif not sub and row['sha256'] and row['sha256'] == info['sha']:
                row['localSha256'] = info['sha']
            arch = archive_by_sub.get((key, sub)) if sub else None
            if arch is not None:
                row['archiveKey'] = arch.get('key')
                row['archiveRev'] = str(arch.get('rev'))
                if not row['localSha256']:
                    row['localSha256'] = arch.get('sha256')
            ins = inscriptions.get(key)
            if ins and ins.get('inscriptionSha256') and ins['inscriptionSha256'] in (row['sha256'], row['localSha256']):
                row['inscriptionId'] = ins['inscriptionId']
            if not row['localSha256'] and not row['inscriptionId']:
                notes.append(f'{eid} {key}: the text of {row["mlNumber"]} revision {row["revision"]} is not in '
                             f'the repo or on chain (not live, no archive copy, no inscription)')
            rails_out.append(row)
        out_editions.append({
            'editionId': eid,
            'label': ed['label'],
            'status': ed['status'],
            'releasedAt': ed.get('releasedAt'),
            'predecessorEditionId': ed.get('predecessorEditionId'),
            'decisionRef': ed.get('decisionRef'),
            'manifestSha256': ed.get('manifestSha256'),
            'coverImageInscriptionId': (_previous_edition(previous, eid) or {}).get('coverImageInscriptionId'),
            'rails': rails_out,
        })

    # Edition page stamps: its revision is "made" when its text first appears on a list.
    for ed in out_editions:
        for r in ed['rails']:
            if r['source'] != 'book-repo':
                continue
            stamp = None
            prev = _previous_rail(previous, ed['editionId'], r['railKey'])
            if prev and prev.get('sha256') == r['sha256'] and prev.get('revisionEdition'):
                stamp = prev['revisionEdition']
            if stamp is None:
                for other in out_editions:
                    if order[other['editionId']] >= order[ed['editionId']]:
                        break
                    o = next((x for x in other['rails'] if x['railKey'] == r['railKey']), None)
                    if o and o.get('sha256') == r['sha256']:
                        stamp = o.get('revisionEdition') or other['editionId']
                        break
            r['revisionEdition'] = stamp or ed['editionId']

    manifest = {
        'schema': SCHEMA,
        'work': response['work'],
        'description': ('Edition record of The Layered Web, generated from Gov Hub by the rail sync. '
                        'Do not edit: see docs/EDITIONS.md.'),
        'generatedBy': GENERATOR,
        'generatedAt': source.get('fetchedAt'),
        'source': source,
        'currentEdition': response['currentEdition'],
        'liveEdition': None,
        'editions': out_editions,
    }
    manifest['liveEdition'] = live_book_label(manifest)
    # The cover image belongs to the edition whose cover it is: the one the live book carries when the
    # image is first recorded (the 2026 Layered Web art, inscribed 14 Nov 2026, is Version 1.0's).
    cover_id = book.sources_sat.get('bookCoverInscriptionId')
    if cover_id and not any(e.get('coverImageInscriptionId') == cover_id for e in out_editions):
        target = (manifest['liveEdition'] or {}).get('editionId')
        for e in out_editions:
            if e['editionId'] == target:
                e['coverImageInscriptionId'] = cover_id

    # ---- stamps on archive entries
    new_archives = None
    if book.archives is not None:
        new_archives = copy.deepcopy(book.archives)
        stamped = []
        for a in new_archives.get('archives') or []:
            sub = (a.get('govhub') or {}).get('submission_id')
            stamp = revision_stamp(out_editions, a.get('key'), sub, (a.get('govhub') or {}).get('revision'),
                                   parse_time(a.get('live_from')), a.get('sha256'))
            stamped.append(_insert_after(a, ['label'], {'edition': stamp}))
        new_archives['archives'] = stamped
        lab = manifest['liveEdition'] or {}
        new_archives = _insert_after(new_archives, ['description', 'schema'], {
            'current_label': lab.get('label'),
            'current_edition': lab.get('editionId'),
            'current_edition_status': lab.get('status'),
            'editions_manifest': MANIFEST_URL_PATH,
        })

    # ---- stamps on inscription records and the pointer in sources-sat.json
    new_sat = copy.deepcopy(book.sources_sat)
    new_sat = _insert_after(new_sat, ['bookCoverInscriptionId', 'summary', 'title'], {
        'currentEdition': response['currentEdition'],
        'editionsManifest': MANIFEST_URL_PATH,
    })
    srcs = []
    for s in new_sat.get('sources', []):
        if s.get('inscriptionId'):
            stamp, on_list = inscription_stamp(s, manifest)
            s = {k: v for k, v in s.items() if k != 'inscriptionEditionNote'}
            items = {'inscriptionEdition': stamp, 'inscriptionOnEditionList': on_list}
            if stamp is None:
                when = parse_time(s.get('timestamp'))
                items['inscriptionEditionNote'] = (
                    f'{UNDECIDED_NOTE} Inscribed in block {s.get("block")}'
                    + (f' on {when.strftime("%d %B %Y")}.' if when else '.'))
            s = _insert_after(s, ['inscribedRevision', 'inscriptionSha256', 'timestamp', 'block', 'inscriptionId'], items)
        srcs.append(s)
    new_sat['sources'] = srcs

    return Generated(manifest=manifest, snapshot=response, archives=new_archives, sources_sat=new_sat, notes=notes)


UNDECIDED_NOTE = ('No edition: the inscribed bytes match no text on any edition list and no Gov Hub '
                  'revision. Add the text to an edition on Gov Hub, or record inscribedRevision.')


def inscription_stamp(src: dict, manifest: dict) -> tuple[str | None, bool | None]:
    """(edition of the inscribed text, whether the inscribed bytes are the text on that edition's list).

    The earliest edition whose list holds the inscribed sha256 → (it, True). Otherwise, when the bytes
    are a known Gov Hub revision, that revision's stamp → (stamp, False): a real mismatch, recorded.
    Otherwise (None, None): no edition can be named (the check lists it)."""
    sha = src.get('inscriptionSha256')
    chain = edition_chain(manifest.get('editions') or [])
    key = src.get('railKey')
    if sha:
        for ed in chain:
            row = next((r for r in ed.get('rails', []) if r.get('railKey') == key), None)
            if row and sha in (row.get('sha256'), row.get('localSha256')):
                return ed['editionId'], True
    inscribed = src.get('inscribedRevision') or {}
    if inscribed.get('submissionId') or inscribed.get('revision'):
        return revision_stamp(chain, key, inscribed.get('submissionId'), inscribed.get('revision'),
                              parse_time(src.get('timestamp'))), False
    return None, None


def write_generated(gen: Generated, json_dir: Path) -> list[Path]:
    """Write the generated files that differ from disk. Returns the paths written."""
    json_dir = Path(json_dir)
    targets = [
        (json_dir / MANIFEST_NAME, gen.manifest),
        (json_dir / SNAPSHOT_NAME, gen.snapshot),
        (json_dir / SOURCES_SAT_NAME, gen.sources_sat),
    ]
    if gen.archives is not None:
        targets.append((json_dir / ARCHIVES_NAME, gen.archives))
    written = []
    for path, obj in targets:
        text = dump_json(obj)
        if not path.is_file() or path.read_text(encoding='utf-8') != text:
            path.write_text(text, encoding='utf-8')
            written.append(path)
    return written


def check_live_matches_record(manifest: dict, synced: dict[str, str]) -> list[str]:
    """Gov Hub's in-progress list must name the revision each rail now holds (read-meta / sync marker)."""
    errs = []
    for key, sub in synced.items():
        row = live_rail(manifest, key)
        if row is None or not row.get('submissionId'):
            continue
        if sub and row['submissionId'] != sub:
            errs.append(f'{key}: the rail holds submission {sub} but the edition in progress lists '
                        f'{row["submissionId"]}')
    return errs


# --------------------------------------------------------------------------- PDF stamps

def _pdf_strings(data: bytes) -> Iterable[bytes]:
    yield data
    for m in re.finditer(rb'stream\r?\n(.*?)\r?\nendstream', data, re.S):
        try:
            yield zlib.decompress(m.group(1))
        except zlib.error:
            continue


def _decode_pdf_string(raw: bytes, hexstr: bool) -> str:
    if hexstr:
        h = re.sub(rb'\s', b'', raw).decode('ascii')
        b = bytes.fromhex(h + ('0' if len(h) % 2 else ''))
    else:
        out = bytearray()
        i = 0
        esc = {ord('n'): 10, ord('r'): 13, ord('t'): 9, ord('b'): 8, ord('f'): 12}
        while i < len(raw):
            c = raw[i]
            if c == 0x5C and i + 1 < len(raw):  # backslash
                n = raw[i + 1]
                m = re.match(rb'[0-7]{1,3}', raw[i + 1:i + 4])
                if m:
                    out.append(int(m.group(0), 8) & 0xFF)
                    i += 1 + len(m.group(0))
                    continue
                out.append(esc.get(n, n))
                i += 2
                continue
            out.append(c)
            i += 1
        b = bytes(out)
    if b.startswith(b'\xfe\xff'):
        return b[2:].decode('utf-16-be', errors='replace')
    return b.decode('latin-1')


def _info_dict_text(data: bytes) -> bytes:
    """The bytes of the document info dictionary the last trailer (or xref stream) points at."""
    refs = re.findall(rb'/Info\s+(\d+)\s+(\d+)\s+R', data)
    if refs:
        num, gen = refs[-1]
        objs = list(re.finditer(rb'(?<![0-9])' + num + rb'\s+' + gen + rb'\s+obj\s*<<(.*?)>>\s*endobj', data, re.S))
        if objs:
            return objs[-1].group(1)
    # In a compressed object stream (WeasyPrint): the dictionary that carries /Producer.
    for chunk in list(_pdf_strings(data))[1:]:
        i = chunk.find(b'/Producer')
        if i >= 0:
            a = chunk.rfind(b'<<', 0, i)
            if a >= 0:
                return chunk[a + 2:a + 8192]  # the tokens are matched from the start of this dictionary
    return b''


def pdf_info(path: Path) -> dict[str, str]:
    """/Title and /Keywords of a PDF's document info (the dictionary the last trailer names, so an
    incremental update's new info wins; outline /Title entries are not confused with it)."""
    text = _info_dict_text(Path(path).read_bytes())
    found: dict[str, str] = {}
    for key in ('Keywords', 'Title'):
        m = re.search(rb'/' + key.encode() + rb'\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>)', text)
        if m:
            tok = m.group(1)
            found[key] = _decode_pdf_string(tok[1:-1], tok.startswith(b'<'))
    return found


def parse_pdf_stamp(keywords: str) -> dict[str, str]:
    """``dp-edition=1.0; dp-rail=dp01; ...`` → {'dp-edition': '1.0', 'dp-rail': 'dp01', ...}."""
    out = {}
    for part in (keywords or '').split(';'):
        if '=' in part:
            k, v = part.split('=', 1)
            if k.strip().startswith('dp-'):
                out[k.strip()] = v.strip()
    return out


def chapter_pdf_keywords(manifest: dict, rail_key: str, submission_id: str | None,
                         local_sha: str | None) -> str | None:
    """Keywords stamp for a chapter PDF built from the live rail, or None if the record lacks it."""
    row = live_rail(manifest, rail_key)
    if row is None:
        return None
    parts = [f'dp-edition={row.get("revisionEdition")}', f'dp-rail={rail_key}']
    if submission_id:
        parts.append(f'dp-submission={submission_id}')
    if local_sha:
        parts.append(f'dp-local-sha256={local_sha}')
    return '; '.join(parts)


# --------------------------------------------------------------------------- agreement check

@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def check_agreement(repo_root: Path, *, book_root: Path | None = None) -> Report:
    """Every way the manifest, the rails, the archive stamps, the inscription records and the PDF
    stamps disagree (errors), plus records that carry no stamp yet (gaps)."""
    repo_root = Path(repo_root)
    book_root = Path(book_root or repo_root / 'desirableproperties-book')
    json_dir = book_root / 'json'
    rep = Report()
    mpath = json_dir / MANIFEST_NAME
    if not mpath.is_file():
        rep.errors.append(f'{mpath.relative_to(repo_root)} is missing (run the rail sync)')
        return rep
    try:
        manifest = json.loads(mpath.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        rep.errors.append(f'editions.json is not JSON: {exc}')
        return rep
    book = Book.load(book_root)
    sat = book.sources_sat
    eds = manifest.get('editions') or []

    # 1. Shape of the record.
    if manifest.get('schema') != SCHEMA:
        rep.errors.append(f'editions.json schema is {manifest.get("schema")!r}, expected {SCHEMA!r}')
    in_prog = [e for e in eds if e.get('status') == 'in_progress']
    if len(in_prog) != 1:
        rep.errors.append(f'exactly one edition must be in progress; editions.json has {len(in_prog)}'
                          + (f' ({", ".join(e.get("editionId", "?") for e in in_prog)})' if in_prog else ''))
    elif manifest.get('currentEdition') != in_prog[0].get('editionId'):
        rep.errors.append(f'currentEdition {manifest.get("currentEdition")!r} is not the edition in progress')
    if sat.get('currentEdition') != manifest.get('currentEdition'):
        rep.errors.append(f'sources-sat.json currentEdition {sat.get("currentEdition")!r} != editions.json '
                          f'{manifest.get("currentEdition")!r}')
    if sat.get('editionsManifest') != MANIFEST_URL_PATH:
        rep.errors.append(f'sources-sat.json editionsManifest should be {MANIFEST_URL_PATH!r}')
    src = manifest.get('source') or {}
    if src.get('kind') == 'fixture':
        rep.gaps.append(f'editions.json was generated from a recorded fixture ({src.get("path")}), not the live '
                        f'Gov Hub endpoint; regenerate with the rail sync once the endpoint is live')
    for ed in eds:
        if ed.get('manifestSha256') and ed.get('status') == 'released':
            snap = json_dir / SNAPSHOT_NAME
            if snap.is_file():
                gh = next((e for e in json.loads(snap.read_text(encoding='utf-8')).get('editions', [])
                           if e.get('editionId') == ed['editionId']), None)
                if gh is not None and govhub_manifest_sha256(gh.get('rails') or []) != ed['manifestSha256']:
                    rep.errors.append(f'edition {ed["editionId"]}: manifestSha256 does not match Gov Hub\'s '
                                      f'rails by the contract method')

    # 2. Rails against content/local.
    article = list(sat.get('articleRails') or [])
    for ed in eds:
        eid = ed.get('editionId')
        keys = [r.get('railKey') for r in ed.get('rails', [])]
        missing = [k for k in article if k not in keys]
        if missing and ed.get('status') == 'in_progress':
            rep.errors.append(f'edition {eid}: rails missing from the list: {", ".join(missing)}')
        for r in ed.get('rails', []):
            key = r.get('railKey')
            local = r.get('localPath')
            data = book.read_local(local) if local else None
            file_sha = sha256_bytes(data) if data is not None else None
            text = data.decode('utf-8', errors='replace') if data is not None else ''
            if ed.get('status') == 'in_progress':
                if file_sha is None:
                    rep.errors.append(f'{eid} {key}: {local} is missing')
                    continue
                if r.get('localSha256') != file_sha:
                    rep.errors.append(f'{eid} {key}: manifest localSha256 {str(r.get("localSha256"))[:12]}… != '
                                      f'content/local file {file_sha[:12]}… ({local})')
                marker = sync_marker_submission(text)
                if r.get('submissionId') and marker != r['submissionId']:
                    rep.errors.append(f'{eid} {key}: the edition lists submission {r["submissionId"]} but '
                                      f'{local} holds {marker or "no govhub-sync marker"}')
                rev = sync_marker_revision(text)
                if r.get('submissionId') and rev and r.get('revision') and rev != r['revision']:
                    rep.errors.append(f'{eid} {key}: the edition lists revision {r["revision"]} but {local} '
                                      f'says revision {rev}')
            else:
                live_now = (r.get('submissionId') and sync_marker_submission(text) == r['submissionId']) or \
                           (not r.get('submissionId') and file_sha and r.get('localSha256') == file_sha)
                if live_now:
                    if r.get('localSha256') != file_sha:
                        rep.errors.append(f'{eid} {key}: manifest localSha256 != content/local file ({local})')
                elif r.get('archiveRev'):
                    arch = next((a for a in book.archive_entries() if a.get('key') == r.get('archiveKey')
                                 and str(a.get('rev')) == str(r.get('archiveRev'))), None)
                    adata = book.read_local(arch['file']) if arch else None
                    if adata is None:
                        rep.errors.append(f'{eid} {key}: archive {r.get("archiveKey")}/{r.get("archiveRev")} is missing')
                    elif sha256_bytes(adata) != r.get('localSha256'):
                        rep.errors.append(f'{eid} {key}: archive {r["archiveKey"]}/{r["archiveRev"]} file sha != '
                                          f'manifest localSha256')
                elif not r.get('inscriptionId'):
                    rep.gaps.append(f'{eid} {key}: {r.get("mlNumber")} revision {r.get("revision")} is no longer '
                                    f'live and has no archive copy in the repo or inscription on chain')

    # 3. Archive stamps.
    chain = edition_chain(eds)
    if book.archives is not None:
        lab = live_book_label(manifest) or {}
        for fld, want in (('current_label', lab.get('label')), ('current_edition', lab.get('editionId')),
                          ('current_edition_status', lab.get('status'))):
            if book.archives.get(fld) != want:
                rep.errors.append(f'chapter-archives.json {fld} is {book.archives.get(fld)!r}; the manifest says {want!r}')
        for a in book.archive_entries():
            name = f'archive {a.get("key")}/{a.get("rev")}'
            sub = (a.get('govhub') or {}).get('submission_id')
            want = revision_stamp(chain, a.get('key'), sub, (a.get('govhub') or {}).get('revision'),
                                  parse_time(a.get('live_from')), a.get('sha256'))
            if 'edition' not in a:
                rep.errors.append(f'{name}: no edition stamp (run the rail sync)')
            elif a['edition'] != want:
                rep.errors.append(f'{name}: stamped {a["edition"]!r}, but its revision belongs to {want!r}')
            data = book.read_local(a.get('file') or '')
            if data is not None and a.get('sha256') and sha256_bytes(data) != a['sha256']:
                rep.errors.append(f'{name}: file sha256 != chapter-archives.json sha256')
        for ed in eds:
            for r in ed.get('rails', []):
                if r.get('archiveRev'):
                    arch = next((a for a in book.archive_entries() if a.get('key') == r.get('archiveKey')
                                 and str(a.get('rev')) == str(r.get('archiveRev'))), None)
                    if arch is None or (arch.get('govhub') or {}).get('submission_id') != r.get('submissionId'):
                        rep.errors.append(f'{ed["editionId"]} {r["railKey"]}: archive {r["archiveKey"]}/'
                                          f'{r["archiveRev"]} is not a copy of submission {r.get("submissionId")}')

    # 4. Inscription records.
    earlier: dict[str, list[str]] = {}
    for s in sat.get('sources', []):
        if not s.get('inscriptionId'):
            continue
        key = s.get('railKey')
        if not s.get('inscriptionSha256'):
            rep.errors.append(f'inscription {key}: no inscriptionSha256 (record the sha256 of the inscribed bytes)')
            continue
        want_ed, want_flag = inscription_stamp(s, manifest)
        if 'inscriptionEdition' not in s or 'inscriptionOnEditionList' not in s:
            rep.errors.append(f'inscription {key}: no edition stamp (run the rail sync)')
            continue
        if want_ed is None and s['inscriptionEdition'] is None:
            when = parse_time(s.get('timestamp'))
            rep.gaps.append(f'inscription {key}: no edition (block {s.get("block")}, '
                            f'{when.strftime("%d %b %Y") if when else "date unknown"}); its bytes match no list '
                            f'and no Gov Hub revision')
        if s['inscriptionEdition'] != want_ed:
            rep.errors.append(f'inscription {key}: stamped {s["inscriptionEdition"]!r}, but the inscribed text '
                              f'belongs to {want_ed!r}')
        if s['inscriptionOnEditionList'] != want_flag:
            rep.errors.append(f'inscription {key}: inscriptionOnEditionList is {s["inscriptionOnEditionList"]} '
                              f'but the inscribed sha256 {"matches" if want_flag else "matches no revision on"} '
                              f'the {want_ed} list')
        for ed in eds:
            row = next((r for r in ed.get('rails', []) if r.get('railKey') == key), None)
            if row is None:
                continue
            matches = s['inscriptionSha256'] in (row.get('sha256'), row.get('localSha256'))
            if matches and row.get('inscriptionId') != s['inscriptionId']:
                rep.errors.append(f'{ed["editionId"]} {key}: the inscription holds this exact text but the '
                                  f'manifest has inscriptionId {row.get("inscriptionId")!r}')
            if not matches and row.get('inscriptionId'):
                rep.errors.append(f'{ed["editionId"]} {key}: manifest names inscription {row["inscriptionId"]} '
                                  f'but its sha256 is not this revision')
        if s.get('inscriptionOnEditionList') is not None:
            earlier.setdefault((s.get('inscriptionEdition'), s['inscriptionOnEditionList']), []).append(key)
    for (ed_id, on_list), keys in earlier.items():
        what = 'agree with the' if on_list else 'were made for, but are not the text on, the'
        rep.info.append(f'{len(keys)} inscription(s) {what} {ed_id} list: {", ".join(keys)}')
    cover = sat.get('bookCoverInscriptionId')
    if cover:
        holders = [e.get('editionId') for e in eds if e.get('coverImageInscriptionId') == cover]
        if len(holders) != 1:
            rep.errors.append(f'cover image inscription {cover[:12]}… is recorded on {len(holders)} editions '
                              f'(expected exactly one)')
        else:
            rep.info.append(f'cover image inscription {cover[:12]}… is the cover of edition {holders[0]}')

    # 5. PDF stamps.
    unstamped: dict[str, list[str]] = {}
    for pattern in PDF_GLOBS:
        for pdf in sorted(repo_root.glob(pattern)):
            rel = pdf.relative_to(repo_root)
            try:
                info = pdf_info(pdf)
            except OSError as exc:
                rep.errors.append(f'{rel}: unreadable ({exc})')
                continue
            stamp = parse_pdf_stamp(info.get('Keywords', ''))
            if not stamp.get('dp-edition'):
                title = info.get('Title') or ''
                m = re.search(r'\((Version [^)]+)\)', title)
                if m:
                    rep.gaps.append(f'{rel}: no edition stamp in its metadata (its title says {m.group(1)!r})')
                else:
                    unstamped.setdefault(str(rel.parent), []).append(rel.name)
                continue
            ed = next((e for e in eds if e.get('editionId') == stamp['dp-edition']), None)
            if ed is None:
                rep.errors.append(f'{rel}: stamped edition {stamp["dp-edition"]!r} is not in editions.json')
                continue
            if stamp.get('dp-rail'):
                sub = stamp.get('dp-submission')
                rows = [r for e in eds for r in e.get('rails', [])
                        if r.get('railKey') == stamp['dp-rail'] and (not sub or r.get('submissionId') == sub)]
                if not rows:
                    rep.errors.append(f'{rel}: submission {sub} of {stamp["dp-rail"]} is on no edition list')
                elif rows[0].get('revisionEdition') != stamp['dp-edition']:
                    rep.errors.append(f'{rel}: stamped {stamp["dp-edition"]} but its revision is stamped '
                                      f'{rows[0].get("revisionEdition")}')
            elif stamp.get('dp-rails'):
                # A compilation of several chapters of one edition (e.g. the 0.77 inscriptions).
                for key in [k.strip() for k in stamp['dp-rails'].split(',') if k.strip()]:
                    row = next((r for r in ed.get('rails', []) if r.get('railKey') == key), None)
                    if row is None:
                        rep.errors.append(f'{rel}: {key} is not on the {ed["editionId"]} list')
                    elif (row.get('revisionEdition') or ed['editionId']) != stamp['dp-edition']:
                        rep.errors.append(f'{rel}: {key} on the {ed["editionId"]} list is stamped '
                                          f'{row.get("revisionEdition")}, not {stamp["dp-edition"]}')
            elif stamp.get('dp-edition-rails-sha256'):
                if stamp.get('dp-manifest-sha256') and stamp['dp-manifest-sha256'] != ed.get('manifestSha256'):
                    rep.errors.append(f'{rel}: dp-manifest-sha256 is not edition {ed["editionId"]}\'s manifestSha256')
                if stamp['dp-edition-rails-sha256'] != edition_rails_sha256(ed):
                    rep.errors.append(f'{rel}: built from a rail list that is not edition {ed["editionId"]}\'s')
    others = [p for g in NOT_EDITION_PDF_GLOBS for p in sorted(repo_root.glob(g))]
    if others:
        rep.info.append(f'{len(others)} PDF(s) are reference material outside editions '
                        f'({", ".join(sorted({str(p.parent.relative_to(repo_root)) for p in others}))}): '
                        f'Astra\'s 2026-09-05 editorial synthesis is not Gov Hub revision text, so no edition lists it')
    for folder, names in unstamped.items():
        rep.gaps.append(f'{folder}/: {len(names)} PDF(s) with no edition stamp in their metadata '
                        f'({", ".join(sorted(names)[:4])}{", …" if len(names) > 4 else ""})')
    return rep


def edition_rails_sha256(edition: dict) -> str:
    """Stamp for a whole-book PDF: the exact list (rail, submission, revision sha) it was built from."""
    return canonical_sha256([[r.get('railKey'), r.get('submissionId'), r.get('sha256')]
                             for r in edition.get('rails', [])])


def regenerate_from_snapshot(book_root: Path) -> tuple[Generated | None, list[str]]:
    """Re-run the generator from the stored Gov Hub answer and report every generated file that differs
    from the repo (a hand edit, or rails changed without a sync)."""
    json_dir = Path(book_root) / 'json'
    mpath, spath = json_dir / MANIFEST_NAME, json_dir / SNAPSHOT_NAME
    if not (mpath.is_file() and spath.is_file()):
        return None, [f'{MANIFEST_NAME} or {SNAPSHOT_NAME} missing']
    manifest = json.loads(mpath.read_text(encoding='utf-8'))
    snapshot = json.loads(spath.read_text(encoding='utf-8'))
    book = Book.load(book_root)
    try:
        gen = generate(snapshot, book, source=manifest.get('source') or {}, previous=manifest)
    except EditionsError as exc:
        return None, [str(exc)]
    diffs = []
    for name, obj in ((MANIFEST_NAME, gen.manifest), (SOURCES_SAT_NAME, gen.sources_sat),
                      (ARCHIVES_NAME, gen.archives)):
        if obj is None:
            continue
        path = json_dir / name
        if path.read_text(encoding='utf-8') != dump_json(obj):
            diffs.append(f'{name} is not what the generator makes from {SNAPSHOT_NAME} and the repo '
                         f'(hand edit, or rails changed without a [rail-sync] run)')
    if canonical_sha256(snapshot) != (manifest.get('source') or {}).get('responseSha256'):
        diffs.append(f'{SNAPSHOT_NAME} does not match source.responseSha256 in {MANIFEST_NAME}')
    return gen, diffs
