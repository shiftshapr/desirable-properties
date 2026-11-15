#!/usr/bin/env python3
"""Check the caching headers of the edition PDF routes on a live site (docs/EDITIONS.md, "Serving and caching").

    python3 scripts/check_pdf_headers.py https://staging.desirableproperties.org

- /downloads/<edition>/book.pdf (the latest edition from the site's API): 200 application/pdf,
  Cache-Control "public, max-age=31536000, immutable", a strong ETag equal to the file's sha256 in Gov Hub's
  record, and 304 for If-None-Match;
- /downloads/latest/book.pdf and /downloads/latest/<rail>.pdf: 302 to that edition's file, max-age=60.
Exits 1 with the list of failures.
"""
import http.client
import json
import sys
import urllib.parse
import urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (check_pdf_headers)'}


def request(site, path, method='GET', headers=None):
    u = urllib.parse.urlparse(site)
    conn = http.client.HTTPSConnection(u.netloc, timeout=60) if u.scheme == 'https' else http.client.HTTPConnection(u.netloc, timeout=60)
    conn.request(method, path, headers={**UA, **(headers or {})})
    res = conn.getresponse()
    res.read()
    conn.close()
    return res.status, {k.lower(): v for k, v in res.getheaders()}


def main() -> int:
    site = (sys.argv[1] if len(sys.argv) > 1 else 'https://staging.desirableproperties.org').rstrip('/')
    api = json.load(urllib.request.urlopen(urllib.request.Request(site + '/api/book/edition-pdfs', headers=UA), timeout=60))
    latest = api.get('latest')
    if not latest:
        print('FAIL: the site offers no published edition PDFs')
        return 1
    fails = []
    book = latest['book']
    rail, chap = sorted(latest['chapters'].items())[0]
    for item in (book, chap):
        st, h = request(site, item['url'], 'HEAD')
        if st != 200 or 'pdf' not in h.get('content-type', ''):
            fails.append(f'{item["url"]}: {st} {h.get("content-type")}')
        if h.get('cache-control') != 'public, max-age=31536000, immutable':
            fails.append(f'{item["url"]}: Cache-Control is {h.get("cache-control")!r}')
        if h.get('etag') != f'"{item["sha256"]}"':
            fails.append(f'{item["url"]}: ETag {h.get("etag")!r} is not the sha256 in Gov Hub\'s record')
        st304, _ = request(site, item['url'], 'GET', {'If-None-Match': h.get('etag') or ''})
        if st304 != 304:
            fails.append(f'{item["url"]}: If-None-Match answered {st304}, not 304')
    for path, want in (('/downloads/latest/book.pdf', book['url']), (f'/downloads/latest/{rail}.pdf', chap['url'])):
        st, h = request(site, path, 'GET')
        loc = urllib.parse.urlparse(h.get('location', '')).path
        if st != 302 or loc != want:
            fails.append(f'{path}: {st} -> {h.get("location")!r}, want 302 -> {want}')
        if 'max-age=60' not in (h.get('cache-control') or ''):
            fails.append(f'{path}: Cache-Control is {h.get("cache-control")!r}, want a 60-second cache')
    print(f'{latest["label"]}: {book["url"]}, {chap["url"]}')
    for f in fails:
        print(f'FAIL: {f}')
    print('headers OK' if not fails else f'{len(fails)} failure(s)')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
