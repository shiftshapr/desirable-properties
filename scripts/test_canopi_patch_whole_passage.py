"""Tests for the filer's patch encoding across markdown markup (whole-passage fallback).

  python3 -m unittest scripts/test_canopi_patch_whole_passage.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import canopi_patch_file_to_govhub as f  # noqa: E402

DP14_L14 = ("DP14 defines the conditions under which participants can form **reliable beliefs about system behavior**. "
            "It ensures that what users see, are told, and infer is **truthful, sufficiently complete, "
            "non-manipulative, and verifiably grounded**.")


class WholePassagePatch(unittest.TestCase):
    def test_guido_1_full_rewrite_of_a_bold_sentence_is_filed_as_whole_span(self):
        exact = "It ensures that what users see, are told, and infer is truthful, sufficiently complete, non-manipulative, and verifiably grounded."
        text = ("It requires that the information participants receive is accurate, appropriately complete, comprehensible, "
                "timely, non-manipulative, and verifiably grounded, and that operators test whether intended users can "
                "interpret it reliably.")
        span = f.locate_anchor(DP14_L14, exact)
        self.assertIn("**truthful", span)
        self.assertIsNone(f.narrow_patch(span, exact, text))
        original, proposed = f.whole_passage_patch(span, text)
        self.assertEqual(original, span)
        self.assertIn(original, DP14_L14)  # Gov Hub must find it verbatim to splice
        self.assertEqual(proposed, text)

    def test_guido_2(self):
        md = "Trust emerges from **reliable belief formation**, not persuasion."
        exact = "Trust emerges from reliable belief formation, not persuasion."
        text = "Trust is a possible outcome of trustworthy governance, not a response participants owe."
        span = f.locate_anchor(md, exact)
        self.assertIsNone(f.narrow_patch(span, exact, text))
        self.assertEqual(f.whole_passage_patch(span, text), (span, text))

    def test_refuses_when_an_emphasized_phrase_survives(self):
        # The reviewer kept the bold phrase: replacing the span would drop its formatting.
        span = "Trust emerges from **reliable belief formation**, not persuasion."
        self.assertIsNone(f.whole_passage_patch(span, "Trust comes from reliable belief formation and audits."))

    def test_refuses_spans_with_links_or_structure(self):
        self.assertIsNone(f.whole_passage_patch("See **DP15** and [the guide](https://x.example).", "Rewritten."))

    def test_narrowing_still_preferred_when_it_works(self):
        md = "Signals must be **truthful**, checkable, and resistant to manipulation."
        exact = "Signals must be truthful, checkable, and resistant to manipulation."
        text = "Signals must be truthful, checkable, contestable, and resistant to manipulation."
        span = f.locate_anchor(md, exact)
        narrowed = f.narrow_patch(span, exact, text)
        self.assertIsNotNone(narrowed)
        self.assertNotIn("**", narrowed[0])


if __name__ == "__main__":
    unittest.main()
