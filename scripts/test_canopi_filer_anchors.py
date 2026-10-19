"""Filer anchor encoding found in the 2026-10-19 anchor audit.

  python3 -m unittest scripts/test_canopi_filer_anchors.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import canopi_patch_file_to_govhub as f  # noqa: E402

MD = """### 3.10 Collusion

Coordinated actors rotate identities.

**Example:** A ring of accounts launders reputation.

Failure mode: **collusion blindness**

---

## 4. Core Principle

Verification must be legible.

### 4.1 Signals

Failure mode: **signal fog**

### 5.10 Old title

Body.
"""


def apply(md, orig, new):
    """Gov Hub's apply_patch_to_body: first occurrence."""
    i = md.find(orig)
    assert i >= 0, orig
    return md[:i] + new + md[i + len(orig):]


class FilerAnchors(unittest.TestCase):
    def test_formatted_edge_line_is_used_as_written(self):
        span = "Failure mode: **collusion blindness**"
        self.assertEqual(f.splice_anchor(span, "below"), span)

    def test_insert_above_a_heading_goes_above_its_rule_not_inside_the_heading(self):
        span = f.locate_anchor(MD, "4. Core Principle")
        edge = f.splice_anchor(span, "above")
        edge = f.whole_heading_line(MD, span, edge, "above")
        self.assertEqual(edge, "---\n\n## 4. Core Principle")
        out = apply(MD, edge, "### 3.11 New\n\nText.\n\n" + edge)
        self.assertIn("Failure mode: **collusion blindness**\n\n### 3.11 New\n\nText.\n\n---\n\n## 4. Core Principle", out)

    def test_inserts_above_one_heading_keep_application_order(self):
        edge = "---\n\n## 4. Core Principle"
        out = apply(MD, edge, "### 3.11 A\n\n" + edge)
        out = apply(out, edge, "### 3.12 B\n\n" + edge)
        self.assertLess(out.find("3.11 A"), out.find("3.12 B"))

    def test_ambiguous_anchor_is_widened_to_a_unique_line(self):
        span = "Failure mode: **signal fog**"
        orig, new = f.unique_splice(MD, span, "Failure mode:", "Failure mode:\n\nX")
        self.assertEqual(orig, "Failure mode: **signal fog**")
        self.assertEqual(MD.count(orig), 1)

    def test_heading_patch_replaces_the_marker_too(self):
        span = f.locate_anchor(MD, "5.10 Old title")
        orig = f.with_heading_marker(MD, span, span, "### 5.10 New title")
        self.assertEqual(orig, "### 5.10 Old title")
        self.assertNotIn("### ###", apply(MD, orig, "### 5.10 New title"))

    def test_whole_passage_allowed_when_new_text_keeps_the_emphasis(self):
        span = "**Why this matters:** Old reason."
        self.assertEqual(f.whole_passage_patch(span, "**Why this matters:** New reason."),
                         (span, "**Why this matters:** New reason."))
        self.assertIsNone(f.whole_passage_patch(span, "Why this matters: New reason."))


if __name__ == "__main__":
    unittest.main()
