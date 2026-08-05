# DP Section Number & Cross-Reference Audit

**Generated:** 2026-08-05 14:23 UTC
**Scope:** dp1.md – dp23.md in `desirableproperties-book/content/local/`

## Executive Summary

| Metric | Count |
|--------|-------|
| **Overall status** | **PASS** |
| Files audited | 23 |
| Files PASS | 23 |
| Files FAIL | 0 |
| Heading numbering issues | 0 |
| Cross-references scanned | 73 |
| Invalid cross-references | 0 |
| Stale on-chain cross-references | 0 |
| Renumber script non-idempotent files | 0 |

## Per-File Findings

| File | ## sections | Heading issues | Cross-refs | Broken refs | Stale on-chain | Status |
|------|-------------|------------------|------------|-------------|----------------|--------|
| dp1.md | 22 | 0 | 0 | 0 | 0 | PASS |
| dp2.md | 22 | 0 | 0 | 0 | 0 | PASS |
| dp3.md | 16 | 0 | 0 | 0 | 0 | PASS |
| dp4.md | 16 | 0 | 0 | 0 | 0 | PASS |
| dp5.md | 24 | 0 | 0 | 0 | 0 | PASS |
| dp6.md | 16 | 0 | 0 | 0 | 0 | PASS |
| dp7.md | 18 | 0 | 0 | 0 | 0 | PASS |
| dp8.md | 19 | 0 | 10 | 0 | 0 | PASS |
| dp9.md | 18 | 0 | 0 | 0 | 0 | PASS |
| dp10.md | 17 | 0 | 6 | 0 | 0 | PASS |
| dp11.md | 17 | 0 | 16 | 0 | 0 | PASS |
| dp12.md | 17 | 0 | 6 | 0 | 0 | PASS |
| dp13.md | 17 | 0 | 4 | 0 | 0 | PASS |
| dp14.md | 16 | 0 | 4 | 0 | 0 | PASS |
| dp15.md | 17 | 0 | 2 | 0 | 0 | PASS |
| dp16.md | 19 | 0 | 7 | 0 | 0 | PASS |
| dp17.md | 17 | 0 | 18 | 0 | 0 | PASS |
| dp18.md | 18 | 0 | 0 | 0 | 0 | PASS |
| dp19.md | 20 | 0 | 0 | 0 | 0 | PASS |
| dp20.md | 16 | 0 | 0 | 0 | 0 | PASS |
| dp21.md | 16 | 0 | 0 | 0 | 0 | PASS |
| dp22.md | 33 | 0 | 0 | 0 | 0 | PASS |
| dp23.md | 31 | 0 | 0 | 0 | 0 | PASS |

## Idempotency Checks

### `renumber_dp_section_headings.py --only dp1-dp23`

```
dp1.md: ok
dp2.md: ok
dp3.md: ok
dp4.md: ok
dp5.md: ok
dp6.md: ok
dp7.md: ok
dp8.md: ok
dp9.md: ok
dp10.md: ok
dp11.md: ok
dp12.md: ok
dp13.md: ok
dp14.md: ok
dp15.md: ok
dp16.md: ok
dp17.md: ok
dp18.md: ok
dp19.md: ok
dp20.md: ok
dp21.md: ok
dp22.md: ok
dp23.md: ok
```

### `fix_dp_section_crossrefs.py --dry-run`

See script output captured during audit run (below in Recommendations).

## Heading Numbering Issues

_None — all headings sequentially numbered._

## Invalid / Broken Cross-References

_None — all cross-references resolve to existing sections._

## On-Chain vs Local Numbering (Informational)

DPs with section number remapping (on-chain → local):

- DP1: 57 section(s) renumbered
- DP2: 44 section(s) renumbered
- DP3: 21 section(s) renumbered
- DP4: 18 section(s) renumbered
- DP5: 70 section(s) renumbered
- DP6: 23 section(s) renumbered
- DP7: 8 section(s) renumbered
- DP8: 75 section(s) renumbered
- DP9: 19 section(s) renumbered
- DP10: 37 section(s) renumbered
- DP11: 6 section(s) renumbered
- DP12: 17 section(s) renumbered
- DP13: 21 section(s) renumbered
- DP14: 19 section(s) renumbered
- DP15: 18 section(s) renumbered
- DP16: 9 section(s) renumbered
- DP17: 9 section(s) renumbered
- DP18: 37 section(s) renumbered
- DP19: 38 section(s) renumbered
- DP20: 18 section(s) renumbered
- DP21: 37 section(s) renumbered
- DP22: 33 section(s) renumbered
- DP23: 1 section(s) renumbered

_No stale on-chain references detected in cross-ref scan._

## Recommendations

- **No action required.** Numbering and cross-references are consistent.

## Fixes Applied During This Audit

_Documented after fix pass._
