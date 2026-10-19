# Anchor audit, 2026-10-19

Every open book proposal was checked: 263 Canopi book Discuss patches/inserts (DP community and
Public Square) and 26 pending Gov Hub proposals. Each was checked mechanically (anchor found, unique,
page text vs markdown, numbering, lists, duplicates, Gov Hub vs book anchor) and reviewed for placement
against the chapter outline. Then every proposal was applied to a copy of its chapter the way Gov Hub
applies it: all 261 to be filed or kept apply, with section numbers in order and no broken lines.

- `audit.json`: one record per item: issues found, verdict (ok / fix / duplicate / owner_decision), reason, the anchor it should have.
- `canopi_manifest.json`: 95 Canopi posts to re-anchor (`scripts/apply_canopi_anchor_fixes.py`).
- `govhub_updates.json`: 12 pending Gov Hub proposals to re-anchor, 3 misfiled DP22 proposals to withdraw (`scripts/apply_govhub_anchor_fixes.py`).

What was wrong, in short:
- anchors quoted from the chapter Markdown or a joined heading+paragraph, not found as written;
- new subsections placed mid-section (between a paragraph and its failure mode / example), or numbered
  over an existing heading (DP4 5.3, DP7 10.1, DP15 3.11 twice, DP1 13.4 with no 13.1–13.3);
- inserts that split lists or separated a lead-in from its list; list items posted without a marker;
- patches that lost line breaks, list markers, heading markers or bold labels;
- three PDPP sections (for DP1, DP4, DP7) filed against DP22; two duplicate posts;
- filer bugs: insert above a heading spliced inside the heading; short anchors ("Failure mode:") spliced at
  the first occurrence; formatted edges refused; several inserts below one anchor applied in reverse order.

Content questions left to co-editors (anchored correctly, not changed): DP6 31ca9cb1 (single shared coin
vs no-single-currency), DP14 79e5e060 (normative preamble under a "(Non-Normative)" heading), DP21 152a7a33
(text already in 5.1), DP4 7f2bf0fc (largely repeats b9b17e7a). Inserts that share one insertion point
(e.g. DP7 10.11, 10.12, 10.13; DP3 6.10, 6.11) land in approval order: approve them in section order.

## Order on box #1 (after the Gov Hub and site releases are deployed)
1. Canopi: `python3 scripts/apply_canopi_anchor_fixes.py scripts/anchor-audit-2026-10-19/canopi_manifest.json` then `--apply` (writes a backup; `--rollback <backup> --apply` restores).
2. Gov Hub: `cd ~/gov-hub-prod && FLASK_ENV=production PYTHONPATH=. .venv/bin/python ~/desirable-properties/scripts/apply_govhub_anchor_fixes.py ~/desirable-properties/scripts/anchor-audit-2026-10-19/govhub_updates.json` then `--apply`.
3. Filer: `python3 scripts/canopi_patch_file_to_govhub.py --env prod --dry-run`, then `--apply`.
