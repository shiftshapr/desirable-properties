#!/usr/bin/env python3
"""Tests for renumber_dp_section_headings.py."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from renumber_dp_section_headings import (  # noqa: E402
    expand_only,
    renumber_markdown,
    strip_heading_decorators,
)


class RenumberHeadingTests(unittest.TestCase):
    def test_strip_existing_numbers_and_bold(self):
        self.assertEqual(
            strip_heading_decorators('**3.1 Metric capture**'),
            'Metric capture',
        )
        self.assertEqual(
            strip_heading_decorators('1. Problem Statement'),
            'Problem Statement',
        )

    def test_renumber_basic(self):
        src = """# DP1 – Title

## Purpose of This Draft

Body.

## Problem Statement

### The Limits of Login-Centric Trust

More body.
"""
        out = renumber_markdown(src)
        self.assertIn('## 1. Purpose of This Draft', out)
        self.assertIn('## 2. Problem Statement', out)
        self.assertIn('### 2.1 The Limits of Login-Centric Trust', out)

    def test_idempotent(self):
        once = renumber_markdown("## Foo\n\n## Bar\n\n### Baz\n")
        twice = renumber_markdown(once)
        self.assertEqual(once, twice)

    def test_expand_only_range(self):
        self.assertEqual(expand_only('dp1-dp3'), ['dp1', 'dp2', 'dp3'])


if __name__ == '__main__':
    unittest.main()
