# Desirable Properties Challenge — Welcome Messages

Use when someone **joins a DP workgroup directly** (Message A only) or is **approved as workgroup coordinator by administrators** (Message A + Message B combined in one welcome).

This document is the canonical source for welcome-page copy. After editing Message A or Message B, run `npm run generate:dp-welcome` in `challenge-site`; `npm run test:dp-welcome` verifies the generated page content has not drifted.

**Context:** Participants are in **Step 1** of the four-step arc—defining *what* the Meta-Layer must enable before requirements, ADRs, and implementation (including the Overweb).

**Key dates**

- Community review begins: **July 16, 2026**
- Workgroup synthesis target: **September 1, 2026** (v1.0 editorial window)
- Book and monument launch: **September 16, 2026**

These dates are exported as `CHALLENGE_KEY_DATES` by `npm run generate:dp-welcome` and consumed by the challenge timeline (book launch countdown).

---

## Legacy routes

- `/welcome/lead` — kept as a permanent redirect to `/welcome/coordinator` for welcome emails sent before the coordinator rename. Target removal after the **September 16, 2026** launch.

---

## Message A — Workgroup member (join directly)

**Subject:** Welcome to the Desirable Properties Challenge

---

The properties you help refine today become the requirements and architectural decisions that guide how the Overweb—and the broader Meta-Layer—gets built:

![We are here to define the next level of the internet: Desirable Properties Challenge → Requirements → Architecture Decision Records → Build Overweb](/images/dp-challenge-arc.jpg)

**Your mission**

We are glad you are here. You bring experience and a critical lens that this challenge needs.

Your workgroup is helping refine one or more **Desirable Properties**—the community-defined qualities a trustworthy Meta-Layer must possess *before* we lock in protocols. Getting the “what” right is the community’s first and most important architectural decision.

**What we ask of you**

- Read your assigned Desirable Property chapter(s) on the book ([book.desirableproperties.org](https://book.desirableproperties.org/)).
- Review for **clarity**, **context**, and **completeness**.
- **Discuss** on the book—chapter comments are live now (Canopi on each chapter).
- **Patch** on Gov Hub—select a passage in the draft and submit specific suggested text revisions, not just general feedback. (Passage-level patching on the book is coming; use Gov Hub for patches today.)
- Participate in workgroup discussion as community feedback arrives from the book and Gov Hub.

**Time & deadline**

- **July 16, 2026** — Community review begins. Plan **1–3 hours per Desirable Property** for a thorough review.
- **September 1, 2026** — Workgroup synthesis (v1.0 editorial window).
- **September 16, 2026** — The Layered Web and monument launch.

**Questions?** Submit a support request at [desirableproperties.org/support](https://desirableproperties.org/support) or [hub.themetalayer.org/support](https://hub.themetalayer.org/support).

Welcome to the challenge.

---

## Message B — Workgroup coordinator (admin approved)

**Subject:** Welcome to the Desirable Properties Challenge — Workgroup coordinator

Send **Message A** in full, then add this block (one combined welcome — not two separate messages):

---

**As workgroup coordinator**

You're approved as workgroup coordinator. In addition to the member duties above:

- Coordinate **at least one workgroup sync** during the review window (late July–August). Rooms in Canopi or another tool your group prefers is fine.
- Facilitate discussion so every proposal gets consideration.
- Maintain the shared working document and help the group reach rough consensus on recommended revisions.
- Prepare synthesis drafts for the editorial process by **September 1, 2026**.

---

## Short onboarding blurb (UI / email confirmation)

> **You joined [DP workgroup name].**  
> Help refine Desirable Properties v0.77 into v1.0 by reviewing for clarity, context, and completeness—and submitting suggested text revisions. Plan 1–3 hours per DP. Synthesis deadline: **Sept 1, 2026**.  
> Your work defines *what* the Overweb must enable—before requirements, ADRs, and implementation.  
> Questions? Submit a support request.

---

## Review standard (example)

| | Text |
|---|---|
| **Example (vague)** | *“The Meta-Layer should support trust.”* |
| **Problem** | “Trust” is undefined. Trust *of whom*, *about what*, *under what conditions*? No reader knows what to design or test. |
| **Suggested revision** | *“The Meta-Layer must make **identity, intent, and accountability visible at the point of interaction**—so participants can assess who they are dealing with, what an actor is authorized to do, and what recourse exists if something goes wrong, **without requiring blind faith in any single platform**.”* |
| **Why it’s better** | Names concrete capabilities (identity, intent, accountability), situates them (at interaction), and states the design constraint (no platform monopoly on trust). A reviewer or implementer can turn this into requirements and an ADR. |

**Review checklist for contributors**

1. **Clarity** — Could someone outside the core team understand this?
2. **Context** — Why does this matter? What failure mode does it prevent?
3. **Completeness** — Is anything essential missing (examples, boundaries, dependencies on other DPs)?
4. **Suggested revision** — Provide replacement text, not only critique.

---

## Copy notes

1. **Sept 1 vs Sept 16** — Sept 1 opens the v1 synthesis window; Sept 16 is book/monument launch. Member deadline for synthesis work: **Sept 1**.
2. **Overweb framing** — Step 4 can read “Build the Meta-Layer (Overweb)” if you prefer that wording.
3. **Nomination vs join** — Same mission text (Message A) for both; coordinators get Message B's extra coordination block in **one combined** welcome after admin approval (not at nominee accept, and not as two separate messages).
4. **Arc image** — `challenge-site/public/images/dp-challenge-arc.jpg` (1024×479). To swap the artwork, replace that file or change the image path in Message A and re-run `npm run generate:dp-welcome`; the width/height in `DpWelcomeView` set the intrinsic aspect ratio and should match the new file.
5. **Role naming** — The workgroup role is **coordinator** (never "lead" or "chair"); **co-lead** keeps its name.
