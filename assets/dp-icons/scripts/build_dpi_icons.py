#!/usr/bin/env python3
"""Build the DP icon system v2 — recognizable metaphors on DARK backgrounds
(gold outer frame + group-color inner frame, marketing polish).

This is the canonical design specified by the user: dark navy canvas,
recognizable metaphors that read in 1 second at 96x96, gold + group-color
layered framing, polished typography.

Outputs (per repo):
  - source/dp{NN}.svg    : 24x24 source glyph (no background)
  - badges/dp{NN}.svg    : 600x600 dark badge with frame + glyph + labels
  - covers/dp{NN}.svg    : 1200x630 cover (badge left + title strip right)

Mirrored to:
  - /home/ubuntu/desirable-properties/assets/dp-icons/
  - /home/ubuntu/gov-hub-dev/static/images/dp-icons/
  - /home/ubuntu/gov-hub-prod/static/images/dp-icons/
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths                                                                       #
# --------------------------------------------------------------------------- #
REPO_DESIRABLE = Path("/home/ubuntu/desirable-properties")
REPO_DEV = Path("/home/ubuntu/gov-hub-dev")
REPO_PROD = Path("/home/ubuntu/gov-hub-prod")
DESIRABLE_ASSET_ROOT = REPO_DESIRABLE / "assets" / "dp-icons"

DP_JSON = REPO_DESIRABLE / "challenge-site" / "src" / "data" / "desirable-properties.json"

# --------------------------------------------------------------------------- #
# v2 Design tokens                                                            #
# --------------------------------------------------------------------------- #
# Brand
GOLD_BORDER = "#b8860b"        # darkgoldenrod — outer 6px frame on 600
GOLD_HIGHLIGHT = "#facc15"     # saturated gold for DPnn label
GOLD_WARM = "#e8b923"          # warm gold accent

# Canvas
BG_DEEP = "#0a0e1a"            # deep navy / space

# Neutrals
WHITE = "#ffffff"
OFFWHITE = "#f4f1e8"
INK_MUTED = "#a0a0a8"

# v2 Six groups
GROUPS = {
    # (color, short_label, long_label)
    "Au.Ag.Go":       ("#06b6d4", "AUTHENTICATION, AGENCY",  "Authentication, Agency & Accountability"),
    "So.Ns.Co":       ("#10b981", "SOVEREIGNTY & PRIVACY",   "Sovereignty & Privacy"),
    "Si.Cm.In.E.Mm":  ("#d946ef", "INTEROPERABILITY",        "Interoperability & Participant Experience"),
    "Ai.Cg.Ac":       ("#7c3aed", "AI GOVERNANCE",           "AI Governance & Safety"),
    "Tt.Sp.Rm.Fs":    ("#ef4444", "SECURITY, TRUST",         "Security, Transparency & Trust"),
    "Fr.Ap.Ow.Ep":    ("#f59e0b", "COMMUNITY",               "Community Participation & Feedback"),
}

DP_TABLE = [
    (1,  "Federated Authentication & Accountability", "Au.Ag.Go",       "Au", "Federated Auth"),
    (2,  "Participant Agency & Empowerment",          "Au.Ag.Go",       "Ag", "Participant Agency"),
    (3,  "Adaptive Governance",                        "Au.Ag.Go",       "Go", "Adaptive Governance"),
    (4,  "Data Sovereignty & Privacy",                 "So.Ns.Co",       "So", "Data Sovereignty"),
    (5,  "Decentralized Namespace",                    "So.Ns.Co",       "Ns", "Decentralized NS"),
    (6,  "Commerce",                                   "So.Ns.Co",       "Co", "Commerce"),
    (7,  "Simplicity & Interoperability",              "Si.Cm.In.E.Mm",  "Si", "Simplicity"),
    (8,  "Collaborative Environment",                  "Si.Cm.In.E.Mm",  "Cm", "Collaboration"),
    (9,  "Developer & Community Incentives",           "Si.Cm.In.E.Mm",  "In", "Incentives"),
    (10, "Education",                                  "Si.Cm.In.E.Mm",  "Ed", "Education"),
    (11, "Safe & Ethical AI",                          "Ai.Cg.Ac",       "Ai", "Safe AI"),
    (12, "Community-based AI Governance",              "Ai.Cg.Ac",       "Cg", "AI Governance"),
    (13, "AI Containment",                             "Ai.Cg.Ac",       "Ac", "AI Containment"),
    (14, "Trust & Transparency",                       "Tt.Sp.Rm.Fs",    "Tt", "Trust"),
    (15, "Security & Provenance",                      "Tt.Sp.Rm.Fs",    "Sp", "Security"),
    (16, "Roadmap & Milestones",                       "Tt.Sp.Rm.Fs",    "Rm", "Roadmap"),
    (17, "Financial Sustainability",                   "Tt.Sp.Rm.Fs",    "Fs", "Sustainability"),
    (18, "Feedback Loops & Reputation",                "Fr.Ap.Ow.Ep",    "Fr", "Feedback"),
    (19, "Amplifying Presence",                        "Fr.Ap.Ow.Ep",    "Ap", "Amplifying Presence"),
    (20, "Community Ownership",                        "Fr.Ap.Ow.Ep",    "Ow", "Community Ownership"),
    (21, "Multi-modal",                                "Si.Cm.In.E.Mm",  "Mm", "Multi-modal"),
    (22, "Epistemic Continuity",                       "Fr.Ap.Ow.Ep",    "Ep", "Epistemic Continuity"),
]


def group_color(group_key: str) -> str:
    return GROUPS[group_key][0]


def group_label_short(group_key: str) -> str:
    return GROUPS[group_key][1]


def group_label_long(group_key: str) -> str:
    return GROUPS[group_key][2]


FONT_STACK = "'Inter','SF Pro Display','Segoe UI','Liberation Sans','DejaVu Sans',system-ui,sans-serif"


def x(s: str) -> str:
    return s.replace("&", "&amp;")


# --------------------------------------------------------------------------- #
# Glyphs — built to be recognizable metaphors at 24x24                        #
# --------------------------------------------------------------------------- #
def glyph_svg(dp_num: int, accent: str) -> str:
    A = accent
    return _GLYPHS[dp_num](A)


def _g_dp1_fingerprint(A):
    return (
        '<path d="M5 12 Q5 4 12 4 Q19 4 19 12 Q19 17 16 19" stroke="' + A + '" fill="none" stroke-width="2" stroke-linecap="round"/>'
        '<path d="M7.5 12 Q7.5 5.5 12 5.5 Q16.5 5.5 16.5 12 Q16.5 15 15 17" stroke="' + A + '" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.85"/>'
        '<path d="M10 12 Q10 7 12 7 Q14 7 14 12 Q14 14 13 15.5" stroke="' + A + '" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.7"/>'
        '<path d="M5 12 Q5 19 11 21" stroke="' + A + '" fill="none" stroke-width="2" stroke-linecap="round"/>'
        '<path d="M9 20 Q11.5 21.5 14.5 21.5" stroke="' + A + '" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.85"/>'
        '<circle cx="12" cy="13" r="1.6" fill="' + A + '"/>'
    )


def _g_dp2_three_figures(A):
    return (
        '<circle cx="4" cy="9" r="1.6" fill="' + A + '" fill-opacity="0.7"/>'
        '<path d="M1 18 Q1 12.5 4 12.5 Q7 12.5 7 18 Z" stroke="' + A + '" stroke-width="1.5" fill="' + A + '" fill-opacity="0.55"/>'
        '<circle cx="20" cy="9" r="1.6" fill="' + A + '" fill-opacity="0.7"/>'
        '<path d="M17 18 Q17 12.5 20 12.5 Q23 12.5 23 18 Z" stroke="' + A + '" stroke-width="1.5" fill="' + A + '" fill-opacity="0.55"/>'
        '<circle cx="12" cy="6" r="2.8" fill="' + A + '"/>'
        '<path d="M7 18 Q7 11 12 11 Q17 11 17 18" stroke="' + A + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        '<line x1="9" y1="12.5" x2="3" y2="13.5" stroke="' + A + '" stroke-width="2.4" stroke-linecap="round"/>'
        '<line x1="15" y1="12.5" x2="21" y2="13.5" stroke="' + A + '" stroke-width="2.4" stroke-linecap="round"/>'
        '<circle cx="12" cy="6" r="0.9" fill="#ffffff" fill-opacity="0.65"/>'
    )


def _g_dp3_gear_plant(A):
    import math
    teeth = []
    for i in range(8):
        ang = i * (math.pi / 4)
        cx_a = 12 + 8.5 * math.cos(ang)
        cy_a = 12 + 8.5 * math.sin(ang)
        cx_b = 12 + 11 * math.cos(ang)
        cy_b = 12 + 11 * math.sin(ang)
        teeth.append(
            f'<line x1="{cx_a:.2f}" y1="{cy_a:.2f}" x2="{cx_b:.2f}" y2="{cy_b:.2f}" '
            f'stroke="{A}" stroke-width="3.2" stroke-linecap="round"/>'
        )
    body = (
        '<circle cx="12" cy="12" r="7.5" stroke="' + A + '" stroke-width="2.2" fill="none"/>'
        '<circle cx="12" cy="12" r="5" stroke="' + A + '" stroke-width="1.4" fill="none" stroke-opacity="0.75"/>'
        '<circle cx="12" cy="12" r="2.8" fill="' + A + '"/>'
        '<path d="M12 9.5 L12 14.5 M10.5 12.5 L12 14.5 L13.5 12.5" '
        'stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    )
    return "".join(teeth) + body


def _g_dp4_shield_keyhole(A):
    return (
        '<path d="M12 3 L19 6 L19 12 Q19 17 12 21 Q5 17 5 12 L5 6 Z" '
        'stroke="' + A + '" stroke-width="2.2" fill="none" stroke-linejoin="round"/>'
        '<circle cx="12" cy="11" r="1.7" fill="' + A + '"/>'
        '<path d="M12 12.3 L11 16 L13 16 Z" fill="' + A + '"/>'
        '<circle cx="8.5" cy="11" r="0.8" fill="' + A + '" fill-opacity="0.7"/>'
        '<circle cx="15.5" cy="11" r="0.8" fill="' + A + '" fill-opacity="0.7"/>'
        '<circle cx="8.5" cy="14" r="0.8" fill="' + A + '" fill-opacity="0.5"/>'
        '<circle cx="15.5" cy="14" r="0.8" fill="' + A + '" fill-opacity="0.5"/>'
    )


def _g_dp5_dharma_wheel(A):
    import math
    parts = [
        f'<circle cx="12" cy="12" r="9.5" stroke="{A}" stroke-width="2" fill="none"/>'
    ]
    for i in range(8):
        ang = i * (math.pi / 4)
        x2 = 12 + 9.5 * math.cos(ang)
        y2 = 12 + 9.5 * math.sin(ang)
        parts.append(
            f'<line x1="12" y1="12" x2="{x2:.2f}" y2="{y2:.2f}" '
            f'stroke="{A}" stroke-width="2" stroke-linecap="round"/>'
        )
    for i in range(8):
        ang = i * (math.pi / 4)
        cx = 12 + 9.5 * math.cos(ang)
        cy = 12 + 9.5 * math.sin(ang)
        parts.append(f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="1.1" fill="{A}"/>')
    parts.append(f'<circle cx="12" cy="12" r="2.4" fill="{A}"/>')
    parts.append(f'<circle cx="12" cy="12" r="1.1" fill="{BG_DEEP}"/>')
    return "".join(parts)


def _g_dp6_cart_coins(A):
    return (
        '<path d="M3 6 L5.5 6 L7.5 14 L17 14 L18.5 8 L7 8" '
        'stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
        '<circle cx="9" cy="18" r="1.6" stroke="' + A + '" stroke-width="1.8" fill="none"/>'
        '<circle cx="15" cy="18" r="1.6" stroke="' + A + '" stroke-width="1.8" fill="none"/>'
        '<circle cx="13" cy="4.5" r="2.4" fill="' + A + '"/>'
        '<path d="M13 3 L13 6 M11.8 4 L13 2.6 L14.2 4" stroke="' + BG_DEEP + '" stroke-width="1.4" '
        'stroke-linecap="round" fill="none"/>'
    )


def _g_dp7_puzzle(A):
    return (
        '<path d="M5 5 L11 5 L11 7.5 Q11 9 12.5 9 Q14 9 14 7.5 L14 5 L20 5 L20 11 '
        'L17.5 11 Q16 11 16 12.5 Q16 14 17.5 14 L20 14 L20 20 L14 20 L14 17.5 '
        'Q14 16 12.5 16 Q11 16 11 17.5 L11 20 L5 20 Z" '
        'stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round"/>'
        '<circle cx="9" cy="9" r="1.1" fill="' + A + '" fill-opacity="0.6"/>'
    )


def _g_dp8_three_nodes_triangle(A):
    return (
        '<path d="M12 5 L19.5 17 L4.5 17 Z" stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round"/>'
        '<circle cx="12" cy="5" r="2.4" fill="' + A + '"/>'
        '<circle cx="19.5" cy="17" r="2.4" fill="' + A + '"/>'
        '<circle cx="4.5" cy="17" r="2.4" fill="' + A + '"/>'
        '<circle cx="12" cy="13" r="1.4" fill="' + A + '" fill-opacity="0.55"/>'
    )


def _g_dp9_rocket(A):
    return (
        '<path d="M12 3 Q15 6 15 12 L15 16 L9 16 L9 12 Q9 6 12 3 Z" '
        'stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round"/>'
        '<circle cx="12" cy="8.5" r="1.6" stroke="' + A + '" stroke-width="1.5" fill="none"/>'
        '<path d="M9 13 L6.5 16 L9 16 Z" stroke="' + A + '" stroke-width="1.6" fill="' + A + '" fill-opacity="0.6"/>'
        '<path d="M15 13 L17.5 16 L15 16 Z" stroke="' + A + '" stroke-width="1.6" fill="' + A + '" fill-opacity="0.6"/>'
        '<path d="M12 18 L12 21.5 M10.5 20 L12 21.5 L13.5 20" stroke="' + A + '" stroke-width="2" '
        'stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    )


def _g_dp10_book_sun(A):
    return (
        '<circle cx="12" cy="4.5" r="1.7" fill="' + A + '"/>'
        '<line x1="12" y1="1.5" x2="12" y2="0.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="9.3" y1="2.3" x2="8.5" y2="1.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="14.7" y1="2.3" x2="15.5" y2="1.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="9.3" y1="6.7" x2="8.5" y2="7.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="14.7" y1="6.7" x2="15.5" y2="7.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<path d="M4 10 Q8 8 12 10 Q16 8 20 10 L20 19 Q16 17 12 19 Q8 17 4 19 Z" '
        'stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round"/>'
        '<line x1="12" y1="10" x2="12" y2="19" stroke="' + A + '" stroke-width="1.5"/>'
        '<line x1="6" y1="13" x2="10" y2="12.4" stroke="' + A + '" stroke-width="1" stroke-opacity="0.6"/>'
        '<line x1="6" y1="15.5" x2="10" y2="14.9" stroke="' + A + '" stroke-width="1" stroke-opacity="0.6"/>'
        '<line x1="14" y1="12.4" x2="18" y2="13" stroke="' + A + '" stroke-width="1" stroke-opacity="0.6"/>'
        '<line x1="14" y1="14.9" x2="18" y2="15.5" stroke="' + A + '" stroke-width="1" stroke-opacity="0.6"/>'
    )


def _g_dp11_brain(A):
    return (
        '<path d="M12 4.5 Q7 4.5 7 8 Q4.5 9 4.5 12 Q4.5 15 7 16 Q7 19 10.5 19 '
        'Q12 20.5 13.5 19 Q17 19 17 16 Q19.5 15 19.5 12 Q19.5 9 17 8 '
        'Q17 4.5 12 4.5 Z" '
        'stroke="' + A + '" stroke-width="2.2" fill="none" stroke-linejoin="round"/>'
        '<path d="M12 5.5 Q11.2 9 12 12 Q12.8 15 12 18.5" '
        'stroke="' + A + '" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-opacity="0.85"/>'
        '<circle cx="9" cy="10" r="0.95" fill="' + A + '"/>'
        '<circle cx="15" cy="10" r="0.95" fill="' + A + '"/>'
        '<circle cx="9" cy="14" r="0.95" fill="' + A + '"/>'
        '<circle cx="15" cy="14" r="0.95" fill="' + A + '"/>'
        '<line x1="9.95" y1="10" x2="14.05" y2="10" stroke="' + A + '" stroke-width="1.1" stroke-opacity="0.75"/>'
        '<line x1="9.95" y1="14" x2="14.05" y2="14" stroke="' + A + '" stroke-width="1.1" stroke-opacity="0.75"/>'
        '<circle cx="12" cy="12" r="1.3" fill="' + A + '"/>'
    )


def _g_dp12_connections_people_ai(A):
    parts = [
        f'<circle cx="12" cy="12" r="3.2" stroke="{A}" stroke-width="2" fill="none"/>',
        f'<path d="M12 9 L15 12 L12 15 L9 12 Z" fill="{A}"/>',
    ]
    positions = [(5.0, 5.5), (19.0, 5.5), (21.5, 12.0), (19.0, 18.5), (5.0, 18.5)]
    for x, y in positions:
        parts.append(
            f'<line x1="{x}" y1="{y}" x2="12" y2="12" '
            f'stroke="{A}" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.85"/>'
        )
        parts.append(f'<circle cx="{x}" cy="{y}" r="1.5" fill="{A}"/>')
    return "".join(parts)


def _g_dp13_vault_dome(A):
    return (
        '<path d="M3.5 17 Q3.5 4.5 12 4.5 Q20.5 4.5 20.5 17" '
        'stroke="' + A + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
        '<line x1="2.5" y1="17" x2="21.5" y2="17" stroke="' + A + '" stroke-width="2.4" stroke-linecap="round"/>'
        '<rect x="8" y="8.5" width="8" height="8" rx="1" stroke="' + A + '" stroke-width="1.8" fill="none"/>'
        '<line x1="10" y1="8.5" x2="10" y2="6.8" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<line x1="14" y1="8.5" x2="14" y2="6.8" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<line x1="10" y1="16.5" x2="10" y2="18.2" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round" stroke-opacity="0.6"/>'
        '<line x1="14" y1="16.5" x2="14" y2="18.2" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round" stroke-opacity="0.6"/>'
        '<line x1="8" y1="11" x2="6.5" y2="11" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<line x1="8" y1="14" x2="6.5" y2="14" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<line x1="16" y1="11" x2="17.5" y2="11" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<line x1="16" y1="14" x2="17.5" y2="14" stroke="' + A + '" stroke-width="1.3" stroke-linecap="round"/>'
        '<circle cx="12" cy="12.5" r="1.4" fill="' + A + '"/>'
        '<line x1="5" y1="20.5" x2="9" y2="20.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="15" y1="20.5" x2="19" y2="20.5" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<circle cx="12" cy="20.5" r="0.9" fill="' + A + '"/>'
    )


def _g_dp14_eye_handshake(A):
    return (
        '<path d="M3 12 Q12 5 21 12 Q12 19 3 12 Z" stroke="' + A + '" stroke-width="2.6" fill="none" stroke-linejoin="round"/>'
        '<circle cx="12" cy="12" r="4.4" stroke="' + A + '" stroke-width="2.2" fill="none"/>'
        '<circle cx="12" cy="12" r="2" fill="' + A + '"/>'
        '<circle cx="13.2" cy="10.8" r="0.9" fill="#ffffff"/>'
        '<line x1="6" y1="4.5" x2="11" y2="6" stroke="' + A + '" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7"/>'
        '<line x1="13" y1="6" x2="18" y2="4.5" stroke="' + A + '" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.7"/>'
    )


def _g_dp15_shield_chain(A):
    return (
        '<path d="M12 3 L19 6 L19 12 Q19 17 12 21 Q5 17 5 12 L5 6 Z" '
        'stroke="' + A + '" stroke-width="2.4" fill="none" stroke-linejoin="round"/>'
        '<rect x="6.5" y="9.5" width="8" height="5" rx="2.5" '
        'stroke="' + A + '" stroke-width="1.8" fill="none"/>'
        '<rect x="9.5" y="9.5" width="8" height="5" rx="2.5" '
        'stroke="' + A + '" stroke-width="1.8" fill="none" fill-opacity="0.2"/>'
        '<rect x="10.8" y="16.3" width="2.4" height="2" rx="0.3" stroke="' + A + '" stroke-width="0.8" fill="' + A + '"/>'
    )


def _g_dp16_flag_peak(A):
    return (
        '<path d="M3 19 L11 6 L19 19 Z" stroke="' + A + '" stroke-width="2" fill="none" stroke-linejoin="round"/>'
        '<path d="M14 19 L11 12" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6"/>'
        '<line x1="11" y1="6" x2="11" y2="2" stroke="' + A + '" stroke-width="1.8" stroke-linecap="round"/>'
        '<path d="M11 2 L17 3.6 L11 5.4 Z" fill="' + A + '"/>'
        '<circle cx="6" cy="14.5" r="0.8" fill="' + A + '" fill-opacity="0.7"/>'
        '<circle cx="8" cy="11.5" r="0.8" fill="' + A + '" fill-opacity="0.85"/>'
        '<circle cx="9.5" cy="8.5" r="0.8" fill="' + A + '"/>'
        '<line x1="2" y1="20" x2="22" y2="20" stroke="' + A + '" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.6"/>'
    )


def _g_dp17_coin_plant(A):
    return (
        '<circle cx="12" cy="14" r="6.5" fill="' + A + '"/>'
        '<circle cx="12" cy="14" r="6.5" stroke="' + A + '" stroke-width="2" fill="none"/>'
        '<path d="M9 13 Q9 11 10.5 11 Q12 11 12 13 Q12 15 13.5 15 Q15 15 15 13" '
        'stroke="' + BG_DEEP + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
        '<path d="M12 7.5 L12 4" stroke="' + A + '" stroke-width="1.8" stroke-linecap="round"/>'
        '<path d="M12 5.5 Q9.5 5 9 3.5 Q11 3.5 12 5.5" fill="' + A + '"/>'
        '<path d="M12 4.5 Q14.5 4 15 2.5 Q13 2.5 12 4.5" fill="' + A + '"/>'
    )


def _g_dp18_loop_chat(A):
    return (
        '<path d="M19 8 A7 7 0 1 0 18 16" stroke="' + A + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
        '<path d="M19 8 L22 8 L19 11 Z" fill="' + A + '"/>'
        '<rect x="7" y="9.5" width="10" height="6.5" rx="1.5" stroke="' + A + '" stroke-width="1.6" fill="none"/>'
        '<path d="M9 16 L8 18 L11 16 Z" fill="' + A + '"/>'
        '<circle cx="9.5" cy="12.7" r="0.7" fill="' + A + '"/>'
        '<circle cx="12" cy="12.7" r="0.7" fill="' + A + '"/>'
        '<circle cx="14.5" cy="12.7" r="0.7" fill="' + A + '"/>'
    )


def _g_dp19_megaphone(A):
    return (
        '<path d="M4 10 L4 14 L13 17 L13 7 Z" stroke="' + A + '" stroke-width="2" fill="' + A + '" fill-opacity="0.85" stroke-linejoin="round"/>'
        '<rect x="13" y="9.5" width="3" height="5" stroke="' + A + '" stroke-width="1.8" fill="none" rx="0.5"/>'
        '<path d="M17 9 Q19 12 17 15" stroke="' + A + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>'
        '<path d="M19.5 8 Q22 12 19.5 16" stroke="' + A + '" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-opacity="0.75"/>'
    )


def _g_dp20_globe_people(A):
    return (
        '<circle cx="12" cy="11" r="6.5" stroke="' + A + '" stroke-width="2.2" fill="none"/>'
        '<ellipse cx="12" cy="11" rx="6.5" ry="2.3" stroke="' + A + '" stroke-width="1.3" fill="none" stroke-opacity="0.75"/>'
        '<ellipse cx="12" cy="11" rx="2.3" ry="6.5" stroke="' + A + '" stroke-width="1.3" fill="none" stroke-opacity="0.75"/>'
        '<path d="M5 14.5 Q4 16 5 19 L7 19 Q8 19 8 18 Q8 16 9 16" '
        'stroke="' + A + '" stroke-width="1.6" fill="' + A + '" fill-opacity="0.55" stroke-linejoin="round"/>'
        '<path d="M19 14.5 Q20 16 19 19 L17 19 Q16 19 16 18 Q16 16 15 16" '
        'stroke="' + A + '" stroke-width="1.6" fill="' + A + '" fill-opacity="0.55" stroke-linejoin="round"/>'
        '<circle cx="10" cy="11" r="0.7" fill="' + A + '"/>'
        '<circle cx="12" cy="9.5" r="0.7" fill="' + A + '"/>'
        '<circle cx="14" cy="11" r="0.7" fill="' + A + '"/>'
        '<circle cx="12" cy="13" r="0.7" fill="' + A + '"/>'
    )


def _g_dp21_multimodal_waves(A):
    return (
        '<path d="M2 7 Q4 3 6 7 T10 7 T14 7 T18 7 T22 7" stroke="' + A + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
        '<path d="M2 12 Q5 8 8 12 T14 12 T20 12 Q21.5 12 22 11.5" stroke="' + A + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-opacity="0.9"/>'
        '<path d="M2 16 Q4 14 6 16 T10 16 T14 16 T18 16 T22 16" stroke="' + A + '" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-opacity="0.7"/>'
        '<path d="M2 19.5 Q3.5 18 5 19.5 T9 19.5 T13 19.5 T17 19.5 T22 19.5" stroke="' + A + '" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-opacity="0.55"/>'
        '<circle cx="3" cy="7" r="0.8" fill="' + A + '"/>'
        '<rect x="20.5" y="15.4" width="1.6" height="1.6" fill="' + A + '" fill-opacity="0.85"/>'
    )


def _g_dp22_dna_helix(A):
    return (
        '<path d="M12 3 Q6 6 12 9 Q18 12 12 15 Q6 18 12 21" '
        'stroke="' + A + '" stroke-width="2.1" fill="none" stroke-linecap="round"/>'
        '<path d="M12 3 Q18 6 12 9 Q6 12 12 15 Q18 18 12 21" '
        'stroke="' + A + '" stroke-width="2.1" fill="none" stroke-linecap="round"/>'
        '<line x1="9" y1="6" x2="15" y2="6" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="9" y1="12" x2="15" y2="12" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<line x1="9" y1="18" x2="15" y2="18" stroke="' + A + '" stroke-width="1.4" stroke-linecap="round"/>'
        '<circle cx="12" cy="3" r="1.1" fill="' + A + '"/>'
        '<circle cx="12" cy="21" r="1.1" fill="' + A + '"/>'
    )


_GLYPHS = {
    1: _g_dp1_fingerprint, 2: _g_dp2_three_figures, 3: _g_dp3_gear_plant,
    4: _g_dp4_shield_keyhole, 5: _g_dp5_dharma_wheel, 6: _g_dp6_cart_coins,
    7: _g_dp7_puzzle, 8: _g_dp8_three_nodes_triangle, 9: _g_dp9_rocket,
    10: _g_dp10_book_sun, 11: _g_dp11_brain, 12: _g_dp12_connections_people_ai,
    13: _g_dp13_vault_dome, 14: _g_dp14_eye_handshake, 15: _g_dp15_shield_chain,
    16: _g_dp16_flag_peak, 17: _g_dp17_coin_plant, 18: _g_dp18_loop_chat,
    19: _g_dp19_megaphone, 20: _g_dp20_globe_people, 21: _g_dp21_multimodal_waves,
    22: _g_dp22_dna_helix,
}


# --------------------------------------------------------------------------- #
# Source SVG (24x24) — bare glyph, no background                               #
# --------------------------------------------------------------------------- #
def build_source(dp_num: int, name: str, group_key: str) -> str:
    accent = group_color(group_key)
    glyph = glyph_svg(dp_num, accent)
    title_safe = x(name)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        'fill="none" stroke-linecap="round" stroke-linejoin="round" '
        'role="img" aria-labelledby="t">\n'
        f'  <title id="t">DP{dp_num} \u2014 {title_safe}</title>\n'
        f'  <g stroke="{accent}" fill="none">\n'
        f'    {glyph}\n'
        f'  </g>\n'
        '</svg>\n'
    )


# --------------------------------------------------------------------------- #
# Starfield                                                                   #
# --------------------------------------------------------------------------- #
def _starfield_svg(seed: int, count: int = 18) -> str:
    import random
    rng = random.Random(seed)
    out = []
    for _ in range(count):
        cx = round(rng.uniform(20, 580), 1)
        cy = round(rng.uniform(20, 580), 1)
        r = round(rng.uniform(0.4, 1.2), 2)
        op = round(rng.uniform(0.2, 0.55), 2)
        col = rng.choice(["#ffffff", GOLD_WARM, "#a0c8ff"])
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}" fill-opacity="{op}"/>')
    return "\n  ".join(out)


# --------------------------------------------------------------------------- #
# Badge SVG (600x600) - dark navy + gold + group-color framing                 #
# --------------------------------------------------------------------------- #
def build_badge(dp_num: int, name: str, group_key: str, short_title: str) -> str:
    accent = group_color(group_key)
    glyph = glyph_svg(dp_num, accent)
    stars = _starfield_svg(seed=dp_num)

    gl = group_label_long(group_key)
    if len(gl) > 32:
        for sep in [" & ", " and "]:
            if sep in gl:
                a, _, b = gl.partition(sep)
                line1 = a + sep.strip()
                line2 = b
                break
        else:
            mid = len(gl) // 2
            line1, line2 = gl[:mid], gl[mid:]
    else:
        line1, line2 = gl, ""

    code = ""
    for n, _, _, c, _ in DP_TABLE:
        if n == dp_num:
            code = c
            break

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num:02d} \u2014 {x(name)}</title>
  <rect width="600" height="600" fill="{BG_DEEP}"/>
  {stars}
  <rect x="6" y="6" width="588" height="588" rx="14" fill="none" stroke="{GOLD_BORDER}" stroke-width="6"/>
  <rect x="22" y="22" width="556" height="556" rx="8" fill="none" stroke="{accent}" stroke-width="3" stroke-opacity="0.9"/>
  <text x="46" y="100" font-family="{FONT_STACK}" font-size="62" font-weight="800" fill="{GOLD_HIGHLIGHT}" letter-spacing="-1.5">DP{dp_num:02d}</text>
  <text x="48" y="148" font-family="{FONT_STACK}" font-size="40" font-weight="700" fill="{accent}" letter-spacing="6">{x(code)}</text>
  <text x="554" y="80" font-family="{FONT_STACK}" font-size="13" font-weight="700" fill="{accent}" letter-spacing="3" text-anchor="end">{x(line1.upper())}</text>
  {('<text x="554" y="100" font-family="' + FONT_STACK + '" font-size="13" font-weight="700" fill="' + accent + '" letter-spacing="3" text-anchor="end">' + x(line2.upper()) + '</text>') if line2 else ''}
  <line x1="430" y1="115" x2="554" y2="115" stroke="{accent}" stroke-width="1.2" stroke-opacity="0.7"/>
  <circle cx="554" cy="115" r="2.5" fill="{accent}"/>
  <circle cx="40" cy="290" r="3" fill="{GOLD_HIGHLIGHT}" fill-opacity="0.85"/>
  <line x1="40" y1="240" x2="40" y2="262" stroke="{GOLD_HIGHLIGHT}" stroke-width="1.2" stroke-opacity="0.55"/>
  <line x1="40" y1="318" x2="40" y2="340" stroke="{GOLD_HIGHLIGHT}" stroke-width="1.2" stroke-opacity="0.55"/>
  <circle cx="560" cy="290" r="3" fill="{GOLD_HIGHLIGHT}" fill-opacity="0.85"/>
  <svg x="165" y="170" width="270" height="270" viewBox="0 0 24 24" fill="none" stroke="{accent}">
    {glyph}
  </svg>
  <text x="300" y="510" font-family="{FONT_STACK}" font-size="26" font-weight="700" fill="{WHITE}" text-anchor="middle" letter-spacing="0.3">{x(short_title)}</text>
  <text x="300" y="540" font-family="{FONT_STACK}" font-size="14" font-weight="500" fill="{INK_MUTED}" text-anchor="middle" letter-spacing="0.5">{x(group_label_short(group_key))}</text>
  <line x1="200" y1="562" x2="400" y2="562" stroke="{accent}" stroke-width="1" stroke-opacity="0.45"/>
  <text x="300" y="582" font-family="{FONT_STACK}" font-size="11" font-weight="700" fill="{accent}" letter-spacing="3" text-anchor="middle">{x(group_label_short(group_key))}</text>
  <circle cx="32" cy="568" r="5" fill="{GOLD_HIGHLIGHT}"/>
  <circle cx="568" cy="568" r="5" fill="{accent}"/>
</svg>
"""


# --------------------------------------------------------------------------- #
# Cover SVG (1200x630)                                                         #
# --------------------------------------------------------------------------- #
def build_cover(dp_num: int, name: str, group_key: str, short_title: str) -> str:
    accent = group_color(group_key)
    glyph = glyph_svg(dp_num, accent)
    stars = _starfield_svg(seed=dp_num + 1000)

    lines = _wrap_title(short_title, max_chars=24)
    line_y_start = 240
    line_height = 70
    text_lines = []
    for i, line in enumerate(lines):
        text_lines.append(
            f'<text x="640" y="{line_y_start + i * line_height}" '
            f'font-family=\'{FONT_STACK}\' font-size="56" font-weight="700" '
            f'fill="{WHITE}">{x(line)}</text>'
        )
    lines_svg = "\n  ".join(text_lines)

    code = ""
    for n, _, _, c, _ in DP_TABLE:
        if n == dp_num:
            code = c
            break

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num:02d} \u2014 {x(name)}</title>
  <rect width="1200" height="630" fill="{BG_DEEP}"/>
  {stars}
  <rect x="6" y="6" width="1188" height="618" rx="10" fill="none" stroke="{GOLD_BORDER}" stroke-width="4"/>
  <g transform="translate(70 15)">
    <rect x="6" y="6" width="588" height="588" rx="10" fill="none" stroke="{accent}" stroke-width="3" stroke-opacity="0.85"/>
    <text x="40" y="98" font-family="{FONT_STACK}" font-size="62" font-weight="800" fill="{GOLD_HIGHLIGHT}" letter-spacing="-1.5">DP{dp_num:02d}</text>
    <text x="42" y="146" font-family="{FONT_STACK}" font-size="40" font-weight="700" fill="{accent}" letter-spacing="6">{x(code)}</text>
    <text x="588" y="62" font-family="{FONT_STACK}" font-size="12" font-weight="700" fill="{accent}" letter-spacing="3" text-anchor="end">{x(group_label_short(group_key))}</text>
    <line x1="500" y1="74" x2="588" y2="74" stroke="{accent}" stroke-width="1.2" stroke-opacity="0.7"/>
    <svg x="170" y="170" width="260" height="260" viewBox="0 0 24 24" fill="none" stroke="{accent}">
      {glyph}
    </svg>
    <text x="300" y="510" font-family="{FONT_STACK}" font-size="26" font-weight="700" fill="{WHITE}" text-anchor="middle">{x(short_title)}</text>
    <line x1="200" y1="544" x2="400" y2="544" stroke="{accent}" stroke-width="1" stroke-opacity="0.45"/>
    <text x="300" y="572" font-family="{FONT_STACK}" font-size="11" font-weight="700" fill="{accent}" letter-spacing="3" text-anchor="middle">{x(group_label_short(group_key))}</text>
  </g>
  <rect x="690" y="6" width="504" height="618" fill="{accent}" fill-opacity="0.07"/>
  <line x1="690" y1="6" x2="690" y2="624" stroke="{accent}" stroke-width="2" stroke-opacity="0.6"/>
  <text x="720" y="120" font-family="{FONT_STACK}" font-size="32" font-weight="800" fill="{GOLD_HIGHLIGHT}" letter-spacing="2">DP{dp_num:02d}</text>
  <text x="720" y="170" font-family="{FONT_STACK}" font-size="32" font-weight="700" fill="{accent}" letter-spacing="6">{x(code)}</text>
  {lines_svg}
  <text x="720" y="500" font-family="{FONT_STACK}" font-size="14" font-weight="700" fill="{accent}" letter-spacing="3">{x(group_label_short(group_key))}</text>
  <text x="720" y="555" font-family="{FONT_STACK}" font-size="14" font-weight="500" fill="{INK_MUTED}">Desirable Properties \u2014 Meta-Layer</text>
  <circle cx="32" cy="598" r="5" fill="{GOLD_HIGHLIGHT}"/>
  <circle cx="1168" cy="598" r="5" fill="{accent}"/>
</svg>
"""


def _wrap_title(title: str, max_chars: int) -> list:
    words = title.split()
    lines = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_chars:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:3]


def main() -> int:
    source_targets = [
        DESIRABLE_ASSET_ROOT / "source",
        REPO_DEV / "static" / "images" / "dp-icons" / "source",
        REPO_PROD / "static" / "images" / "dp-icons" / "source",
    ]
    badge_targets = [
        DESIRABLE_ASSET_ROOT / "badges",
        REPO_DEV / "static" / "images" / "dp-icons" / "badges",
        REPO_PROD / "static" / "images" / "dp-icons" / "badges",
    ]
    cover_targets = [
        DESIRABLE_ASSET_ROOT / "covers",
        REPO_DEV / "static" / "images" / "dp-icons" / "covers",
        REPO_PROD / "static" / "images" / "dp-icons" / "covers",
    ]
    for t in source_targets + badge_targets + cover_targets:
        t.mkdir(parents=True, exist_ok=True)

    for dp_num, name, group_key, code, short_title in DP_TABLE:
        src = build_source(dp_num, name, group_key)
        bdg = build_badge(dp_num, name, group_key, short_title)
        cov = build_cover(dp_num, name, group_key, short_title)

        for d in source_targets:
            (d / f"dp{dp_num:02d}.svg").write_text(src)
        for d in badge_targets:
            (d / f"dp{dp_num:02d}.svg").write_text(bdg)
        for d in cover_targets:
            (d / f"dp{dp_num:02d}.svg").write_text(cov)

    print(f"Wrote {len(DP_TABLE)} DPs \u00d7 3 variants \u00d7 3 sites = "
          f"{len(DP_TABLE) * 3 * 3} SVG files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
