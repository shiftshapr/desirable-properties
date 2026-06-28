#!/usr/bin/env python3
"""Build AI-ready PCI email corpus and DP context for PCI → DP mapping."""

from __future__ import annotations

import csv
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data'
METAWEB_ARTICLES = Path('/home/ubuntu/metaweb-book/articles')
INSCRIPTION_CSV = Path('/home/ubuntu/metaweb-book/articles/article inscriptions.csv')

# Inscription IDs present in pci_emails but absent from article inscriptions.csv
MANUAL_SOURCE_FILES: dict[str, str] = {
    '506480ff2a0ea8fb537d3e8a4bb298892c5e79ff3a1dedb49aa85d260151d52ai0': '0909_1556_daveed_.htm',
    '40ed20f0f7fb29118db4573c859a034dac5262eed595a91d0fbb2eb97a61e31ei0': '0909_1707_cindy0.text',
    'bd1b3b51d59b293cb9812f8774fd6eaf982d0612005b3cad5f6866f21cad4fa9i0': '1004_1410_daveed_.txt',
    '5044b4840e261ffc5be10a78d8696530af82d4c5abf5f4d14cff37cc78d2e4eei0': '1015_1023_dave__.txt',
    '0d89c52f64ae2f27c9964ecce23a6489870775f54cefe578a26daf8cfef23773i0': '1028_1618_daveed---.txt',
}


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self._chunks.append(text)

    def text(self) -> str:
        return '\n'.join(self._chunks)


def strip_html(raw: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(raw)
    return parser.text()


def normalize_body(raw: str) -> str:
    text = raw.replace('\r\n', '\n').replace('\r', '\n').strip()
    if '<' in text and '>' in text:
        text = strip_html(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def load_inscription_filenames() -> dict[str, str]:
    mapping: dict[str, str] = {}
    with INSCRIPTION_CSV.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames:
            reader.fieldnames = [name.strip().strip('"') for name in reader.fieldnames]
        for row in reader:
            norm = {k.strip().strip('"'): (v or '').strip().strip('"') for k, v in row.items()}
            inscription_id = norm.get('inscriptionId', '')
            filename = norm.get('filename', '')
            if inscription_id and filename:
                mapping[inscription_id] = filename
    mapping.update(MANUAL_SOURCE_FILES)
    return mapping


def read_local_body(filename: str) -> str | None:
    path = METAWEB_ARTICLES / filename
    if not path.exists():
        return None
    return normalize_body(path.read_text(encoding='utf-8', errors='replace'))


def fetch_ordinals_body(inscription_id: str) -> str | None:
    url = f'https://ordinals.com/content/{inscription_id}'
    request = urllib.request.Request(url, headers={'User-Agent': 'desirableproperties-corpus-builder/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode('utf-8', errors='replace')
            return normalize_body(raw)
    except Exception:
        return None


def build_pci_corpus() -> dict:
    articles_data = json.loads((DATA / 'call-for-input-articles.json').read_text(encoding='utf-8'))
    filename_by_id = load_inscription_filenames()
    emails_out = []
    bodies_local = 0
    bodies_ordinals = 0
    bodies_missing = 0

    for email in articles_data.get('pci_emails', []):
        inscription_id = email['id']
        source_file = filename_by_id.get(inscription_id)
        body: str | None = None
        body_source = 'missing'

        if source_file:
            body = read_local_body(source_file)
            if body:
                body_source = 'local'

        if not body:
            body = fetch_ordinals_body(inscription_id)
            if body:
                body_source = 'ordinals'

        if body:
            if body_source == 'local':
                bodies_local += 1
            else:
                bodies_ordinals += 1
        else:
            bodies_missing += 1

        reply_to = email.get('reply-to') or email.get('replyTo')

        emails_out.append(
            {
                'id': inscription_id,
                'title': email.get('title', ''),
                'author': email.get('author', ''),
                'date': email.get('date', ''),
                'subject': email.get('subject', ''),
                'tags': email.get('tags', []),
                'reply_to': reply_to,
                'source_file': source_file,
                'body': body or '',
                'body_source': body_source,
                'ordinals_url': f'https://ordinals.com/inscription/{inscription_id}',
            }
        )

    return {
        'meta': {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'purpose': 'AI corpus for mapping early PCI conversations to Desirable Properties',
            'email_count': len(emails_out),
            'bodies_local': bodies_local,
            'bodies_ordinals': bodies_ordinals,
            'bodies_missing': bodies_missing,
            'usage': 'Pair with dp-context-for-pci-mapping.json. Ask the model to link each email to relevant DP IDs with relationship, summary, and confidence. Human review required before publishing.',
        },
        'emails': emails_out,
    }


def build_dp_context() -> dict:
    catalog = json.loads((DATA / 'desirable-properties.json').read_text(encoding='utf-8'))
    properties_out = []

    for dp in catalog.get('desirable_properties', []):
        dp_id = dp['id']
        num = dp_id.replace('DP', '')
        provenance_path = DATA / f'dp{num}.json'
        second_call = None
        if provenance_path.exists():
            provenance = json.loads(provenance_path.read_text(encoding='utf-8'))
            meta = provenance.get('meta', {})
            second_call = {
                'alignments': meta.get('total_alignments', 0),
                'clarifications': meta.get('total_clarifications', 0),
                'extensions': meta.get('total_extensions', 0),
            }

        element_names = [el.get('name', '') for el in dp.get('elements', []) if el.get('name')]

        properties_out.append(
            {
                'id': dp_id,
                'name': dp.get('name', ''),
                'category': dp.get('category', ''),
                'description': dp.get('description', ''),
                'landing_subtitle': dp.get('landing_subtitle', ''),
                'landing_text': dp.get('landing_text', ''),
                'key_elements': element_names,
                'second_call_provenance': second_call,
            }
        )

    return {
        'meta': {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'purpose': 'DP reference context for PCI → DP AI mapping',
            'dp_count': len(properties_out),
            'categories': catalog.get('meta', {}).get('categories', []),
        },
        'desirable_properties': properties_out,
    }


def main() -> None:
    pci_corpus = build_pci_corpus()
    dp_context = build_dp_context()

    pci_path = DATA / 'pci-emails-corpus.json'
    dp_path = DATA / 'dp-context-for-pci-mapping.json'
    pci_path.write_text(json.dumps(pci_corpus, indent=2) + '\n', encoding='utf-8')
    dp_path.write_text(json.dumps(dp_context, indent=2) + '\n', encoding='utf-8')

    meta = pci_corpus['meta']
    print(f'Wrote {pci_path.name}: {meta["email_count"]} emails')
    print(
        f'  bodies: {meta["bodies_local"]} local, '
        f'{meta["bodies_ordinals"]} ordinals, {meta["bodies_missing"]} missing'
    )
    print(f'Wrote {dp_path.name}: {dp_context["meta"]["dp_count"]} DPs')


if __name__ == '__main__':
    main()
