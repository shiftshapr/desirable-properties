# Edition PDFs builder

`build.mjs` builds an edition's book PDF and one PDF per chapter from exactly its edition list. It is run by
the backend job `scripts/edition_pdfs.py`, which gates, stores and publishes the result; see docs/EDITIONS.md,
"Releasing an edition's PDFs". By hand: `node build.mjs --edition <id> [--out-dir DIR] [--build-date YYYY-MM-DD]`
(`node build.mjs --help` lists every option). Tests: `node --test build.test.mjs`.
