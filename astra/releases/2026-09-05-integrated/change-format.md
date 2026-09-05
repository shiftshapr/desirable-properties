# Chapter change JSON and rendering contract

Each `chapters/dpNN.json` is self-contained for reproduction: it contains the exact baseline Markdown, source identity and hash, the ordered changes, final hash, rationales, source metadata, and proposal dispositions. The corresponding `dpNN.md` is the final text. Schema version is `1.0.0`.

## Reproduction

1. Decode the baseline text as UTF-8 without normalizing Unicode, line endings, or whitespace. Verify its SHA-256.
2. Read `changes` in their stored `sequence` order. Every `base_range` points into the immutable baseline, not a partially modified document.
3. For each change, verify that the baseline slice equals `before`. Copy the unchanged gap since the preceding edit, then emit `after`. Advance the baseline cursor to the change's end.
4. Append the remaining baseline. Verify the resulting hash against `result.sha256` and the delivered Markdown.

Several inserts may share an original position. Emit them in sequence order. Do not apply sequential string replacements to a mutable buffer using the unadjusted baseline offsets. The reference verifier also reverses the process using the final ranges and confirms restoration of the original.

`operation` is `insert`, `replace`, or `delete`. The operation describes the actual minimal edit, not the source proposal's type. A community replacement proposal that adds one word can therefore produce an insert operation. Reconciliation of proposals from different original chapters is recorded through their source references and destination, rather than pretending their never-adopted text was moved within the baseline.

## Offsets

All ranges are zero-based and half-open: `[start, end)`. The end is immediately after the selected text. Each location is supplied in three conventions:

- `codepoints`: Unicode scalar positions in the decoded Markdown, suitable for Python slicing.
- `utf16`: UTF-16 code-unit positions, suitable for JavaScript string slicing and source maps.
- `utf8_bytes`: positions in the UTF-8 bytes of the Markdown file.

`start_location` and `end_location` additionally give one-based line numbers and one-based codepoint columns. An end at column 1 of the following line is valid. Do not confuse Markdown source offsets with rendered DOM text offsets.

## Highlights and explanations

`render_target.range` selects the changed final text, excluding only surrounding whitespace from the replay payload. `render_target.text_quote` supplies exact Markdown plus surrounding context. `tooltip_key` identifies the change whose rationale and attribution should be displayed.

A renderer should preserve source positions while parsing Markdown, then associate nodes or inline spans intersecting the final range with `change_id`. For an insertion or replacement, expose the rationale on selection, click, or an accessible details control. Multiple changes may affect one rendered block. Show their distinct rationales and sources rather than silently dropping one.

For a deletion, the final range is empty. Use `mode: deletion_marker` and `attachment_offset_utf16` to place an adjacent marker; retain `before` for the on-demand explanation. Empty ranges are not missing data.

The included `preview/*.html` files demonstrate block-level highlighting with expandable explanations. The JSON supports finer source-aware inline highlighting. The previews are not a new published edition. They preserve the chapter text; book illustrations are loaded from the original site's public URLs when available.

`final_text_quote` covers the complete replay payload. `render_target.text_quote` is the tighter visible selection. These selectors refer to Markdown, including any formatting delimiters. To highlight rendered text, translate through the parser's source map rather than searching rendered HTML for Markdown syntax.

## Attribution and rationale

- `source_refs` contains stable keys into the embedded `source_catalog`.
- CFI records preserve the full original `patch_id`, the review label such as P020, contributor attribution, the generated proposed text, and the supplied source claim.
- Non-CFI records preserve their Gov Hub or Canopi IDs, authors, workflow status, proposed wording, and original anchors. Their source status is not an editorial adoption decision.
- `attribution` separates `substantive_source`, `editorial_synthesis_and_qualification`, and `additional_editorial_author` roles.
- A change not derived from a supplied proposal has `editorial_role: additional_astra_change`, references `astra:editorial`, and credits Astra. Proposal-derived reconciliation credits its contributors and identifies Astra's editing role.
- `rationale` explains the editorial choice and any material qualification. It is intended for on-demand display.

One reconciled change may cite several proposals; one proposal may support different chapter-specific consequences. The source ledger records all such links. A listed source contributes substance but need not have been adopted verbatim.

## Proposal dispositions

Each chapter includes decisions for proposals originally submitted to it and proposals integrated into it from elsewhere. The global `proposal-dispositions.json` accounts for all 275 CFI and 32 non-CFI inputs:

- `integrated_reconciled`: CFI substance included in linked changes.
- `integrated_revised`: non-CFI substance included after editorial reconciliation.
- `already_covered`: no new change because the published draft already supplied the contribution.
- `not_integrated`: the available proposal was not adopted; a reason is recorded.

A source's appearance in `source_catalog` is not proof of adoption. Use the disposition and linked `changes` to establish its actual contribution.

## Versioning and safety against stale anchors

The baseline is the complete saved Live snapshot used in the earlier reviews, retrieved September 5, 2026. The package does not claim to contain subsequent website updates. If the target chapter's hash differs, rebase the changes and review their meaning before applying them; do not blindly fuzzy-match and publish.

The final Markdown retains existing publication/version comments as part of the original text. The JSON and package manifest identify these files as an unpublished editorial synthesis, not a new official Gov Hub revision. Publication versioning can be assigned in the publishing workflow.

## Verification

Run `python3 verify_changes.py` from any directory. It uses only the Python standard library and validates forward and reverse replay, original and final hashes, every offset representation and highlight selector, source links, existing heading preservation, and new heading-number uniqueness. It writes `verification.json`.
