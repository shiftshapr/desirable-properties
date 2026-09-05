# Astra reconciled DP book

A separate, unpublished synthesis of the complete DP1-DP23 Live snapshot retrieved September 5, 2026. Earlier CFI reviews remain unchanged.

The chapters contain **117 reproducible changes** drawing on **257 CFI proposals and 29 non-CFI community proposals**. Overlapping proposals have been reconciled into shared passages with all contributing IDs preserved. There is one additional Astra-authored correction, aligning DP4’s opening promise with its stated privacy limits. DP23 was reviewed and left unchanged because its existing provisions already support the integrated material in DP22.

This is synthesis, not a stack of all proposed inserts. Repeated protocols, civic overlays, municipal pilots, and privacy infrastructure proposals have primary homes, with shorter chapter-specific consequences where useful. DP4’s RIA explainers are integrated into the existing descriptions instead of repeated as six-part callouts. Original section numbering and headings are preserved; new subsections are appended within their appropriate parents.

## Start here

Open [the chapter index and highlighted previews](index.html). Each changed block has an expandable explanation with its sources and earlier wording. The underlying JSON supplies exact text ranges for finer highlighting. The preview text and explanations work locally; original book illustrations need a connection to the book site.

Each chapter below has a complete Markdown file and a self-contained change JSON. The JSON embeds the original baseline, not merely a link to a page that may change.

| Chapter | Changes | Markdown | Reproducible JSON |
|---|---:|---|---|
| DP1 | 7 | [Chapter](chapters/dp01.md) | [Changes](chapters/dp01.json) |
| DP2 | 5 | [Chapter](chapters/dp02.md) | [Changes](chapters/dp02.json) |
| DP3 | 7 | [Chapter](chapters/dp03.md) | [Changes](chapters/dp03.json) |
| DP4 | 31 | [Chapter](chapters/dp04.md) | [Changes](chapters/dp04.json) |
| DP5 | 1 | [Chapter](chapters/dp05.md) | [Changes](chapters/dp05.json) |
| DP6 | 7 | [Chapter](chapters/dp06.md) | [Changes](chapters/dp06.json) |
| DP7 | 5 | [Chapter](chapters/dp07.md) | [Changes](chapters/dp07.json) |
| DP8 | 6 | [Chapter](chapters/dp08.md) | [Changes](chapters/dp08.json) |
| DP9 | 1 | [Chapter](chapters/dp09.md) | [Changes](chapters/dp09.json) |
| DP10 | 6 | [Chapter](chapters/dp10.md) | [Changes](chapters/dp10.json) |
| DP11 | 7 | [Chapter](chapters/dp11.md) | [Changes](chapters/dp11.json) |
| DP12 | 3 | [Chapter](chapters/dp12.md) | [Changes](chapters/dp12.json) |
| DP13 | 2 | [Chapter](chapters/dp13.md) | [Changes](chapters/dp13.json) |
| DP14 | 4 | [Chapter](chapters/dp14.md) | [Changes](chapters/dp14.json) |
| DP15 | 9 | [Chapter](chapters/dp15.md) | [Changes](chapters/dp15.json) |
| DP16 | 3 | [Chapter](chapters/dp16.md) | [Changes](chapters/dp16.json) |
| DP17 | 1 | [Chapter](chapters/dp17.md) | [Changes](chapters/dp17.json) |
| DP18 | 3 | [Chapter](chapters/dp18.md) | [Changes](chapters/dp18.json) |
| DP19 | 4 | [Chapter](chapters/dp19.md) | [Changes](chapters/dp19.json) |
| DP20 | 3 | [Chapter](chapters/dp20.md) | [Changes](chapters/dp20.json) |
| DP21 | 1 | [Chapter](chapters/dp21.md) | [Changes](chapters/dp21.json) |
| DP22 | 1 | [Chapter](chapters/dp22.md) | [Changes](chapters/dp22.json) |
| DP23 | 0 | [Chapter](chapters/dp23.md) | [Changes](chapters/dp23.json) |

## Attribution and exclusions

- Every integrated CFI item retains its full patch ID and original contributor attribution, including BridgeDAO’s collective attribution for anonymous submissions.
- Community inputs retain Gov Hub or Canopi IDs and source workflow states. Discussion publication is not treated as previous chapter adoption.
- Astra is identified as the editor of reconciled proposal-based copy. Changes beyond the supplied proposals are explicitly classified as additional Astra authorship.
- The complete [proposal disposition ledger](proposal-dispositions.json) accounts for all **307 source items**, including nine previously identified CFI draft duplicates, nine CFI non-adoptions, and three community non-adoptions.
- The three community items not adopted are the DP1 additions of “true” and substitution of “hurt” for “harm”, and the DP4 deletion of its lifecycle-scope sentence. Their reasons are recorded against their IDs.
- Source claims are limited to the supplied packs. Integration does not establish that an experimental architecture works, that an institution has committed to a pilot, or that every contributor’s external claim has been independently verified.

## Rendering and verification

Read [the change-format contract](change-format.md) for replay order, Unicode offsets, source-aware highlights, deletion markers, and on-demand rationale display. A [JSON Schema](chapter-changes.schema.json) documents the structural contract.

[Verification results](verification.json) confirm forward and reverse replay, hashes, exact ranges, source links, existing heading preservation, and absence of new numbering collisions. [Preview verification](preview-verification.json) confirms all 117 changes map to rendered blocks in the 23 chapter previews.

Run `python3 verify_changes.py` to reproduce the integrity checks using only the Python standard library. Rebase and review against any later book version before applying these changes to it. Nothing in the published viewer or Gov Hub was changed.
