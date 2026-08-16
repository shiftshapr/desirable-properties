# DP Community AI — architecture, innovations, hypotheses, and measures of success

**Audience:** technical and product readers who need a briefing on what Hermes *is* in the Desirable Properties (DP) challenge, how it shows up in `/agent` and workgroup chat, what bets it encodes, and how to tell if those bets are working.

**Status as of 15 August 2026.** Grounded in the live stack on this VPS (`hermes-chat` on `:8790`, challenge-site `desirableproperties`, Gov Hub workgroup messages, Neo4j DP memory graph, Canopi Discuss). Older notes that say “Gov Hub `/api/dp/chat`” are stale: the public path is challenge-site → localhost Hermes.

**Related surfaces (not this briefing):** Canopi Discuss on `book.desirableproperties.org` is social/chapter conversation. Hermes is AI advisory. They share a contribution *destination* (patches/comments on the book), not a chat runtime. See `docs/BOOK-DISCUSS-EMBED.md`.

---

## 1. What it is

**DP Community AI** is the public name for **Hermes** as a *governance* agent: a signed-in chat that helps the community make the inscribed Desirable Properties coherent and actionable, and turn arguments into filings — not a generic chatbot and not Metaweb ops support.

Public copy on `/participate` and the `/agent` welcome state the job:

- Compare a person’s existing ideas with the current DPs.
- Find overlap, gaps, and tensions.
- Draft patches / inserts / comments for community discussion.
- In workgroups: cluster, synthesize, surface disagreement — **people decide; AI organizes**.

Hermes’ system prompt is explicit: work with members so the **22 inscribed DPs** (and on-disk **drafts such as DP23**) are clear enough to guide builders and strong enough to govern a Meta-Layer. It must **not** auto-approve governance changes.

Two other “Hermes” jobs exist in the same repo and should not be confused with Community AI:

| Job | Surface | Role |
|-----|---------|------|
| **DP Community AI** | `desirableproperties.org/agent`, workgroup collab | Grounded chat, threads, contributions, teaching |
| **Workgroup ambient / Ask Hermes** | Workgroup chat (experimental) | Private notes, raised hands, share/adopt |
| **Ops / support Hermes** | Cron + `/api/support/hermes/*` | Ticket triage, health checks (`docs/HERMES-ON-VPS.md`) |

---

## 2. Technical architecture

### 2.1 Request path

```text
Browser (Web3Auth session)
  → challenge-site Next.js
      POST /api/agent/chat          (and threads, notes, contributions, ambient proxies)
  → hermes-chat  127.0.0.1:8790     (secret header; not on the public internet)
      POST /api/dp/chat
      POST /api/hermes/ambient/*
      GET|POST /api/hermes/threads…
      POST /api/hermes/contributions/*
      GET|POST /api/hermes/community-notes
  → LLM  (OpenAI-compatible; model from HERMES_OPENAI_MODEL / MODEL_NAME)
  → Neo4j  bolt://127.0.0.1:7687   (DP catalog, DEPENDS_ON, claims, proposals, chat memory, notes)
  → Book files  desirableproperties-book/content/local/dpN.md
  → Optional: URL fetch at query time; Canopi / Gov Hub clients on submit
```

Challenge-site **never** talks to the LLM directly for Community AI. It attaches the signed-in `verifierId`, display name, and Gov Hub user id, then proxies with `HERMES_CHAT_SECRET`.

Workgroup **human** messages live on **Gov Hub** (membership, posting rights, thread body). Hermes ambient **hands** and **workgroup settings** live in challenge-site Postgres (`dp_hermes_hand`, `dp_hermes_workgroup_settings`). That split is intentional: group speech is the governance system of record; AI offers are local and private until someone publishes them.

### 2.2 Services and data stores

| Component | Where | What it holds |
|-----------|--------|----------------|
| `hermes-chat` (PM2, port 8790) | `neo4j-knowledge-graph/scripts/hermes-server.js` | Chat, ambient assess/reply, threads, contribution ledger, community notes |
| `desirableproperties` (PM2, 3005) | challenge-site | UI, auth, proxy, ambient store, workgroup collab client |
| Gov Hub | `hub.themetalayer.org` | Workgroups, membership, chat messages, layer-admin for teaching |
| Neo4j `neo4j-kg` | Docker 7474/7687 | DP memory graph + Hermes thread/memory namespaces |
| `dp-memory-graph` | hourly cron | Syncs Gov Hub proposals / DP catalog into Neo4j (not the chat process) |
| Canopi | `api.canopi.live` | Discuss comments, patches, staged proposals from contribution submit |
| Challenge Postgres | `DP_DATABASE_URL` | Ambient hands/settings (plus unrelated site admin tables) |

Hermes HTTP is **localhost-only**. Registry verify: `curl -sf http://127.0.0.1:8790/health`.

### 2.3 Grounding pipeline (`handleDpChat`)

Each `/agent` turn:

1. **Auth / thread** — signed-in owner; create or assert thread; optional document extract.
2. **Retrieval** — `buildDpMemoryContext`: DP numbers from message + history + `dpFocus`; topic keywords; section refs; Neo4j DP nodes, `DEPENDS_ON` / reverse edges, claims, critiques, proposals; book passages (full draft or focused sections); **verified community notes** injected as overrides; optional **web fetch** of URLs in the conversation (`[web:hostname]`).
3. **Generate** — system prompt + graph/book context + last ~8 turns + user message. Thinking blocks stripped. Truncation retry. STE100-ish short sentences; markdown tables for the agent UI; **no markdown** on `/series` compose-assist (plain textarea insert, ≤1000 characters).
4. **Contribution readiness** — second LLM JSON pass: is this exchange ready to become a Canopi Discuss comment or patch?
5. **Memory** — record turn in Neo4j (non-fatal on failure). Auto-capture of “you’re wrong” into the graph is **disabled**; teaching is explicit.

Hard grounding rules in the prompt (the product, not decoration):

- Answer **only** from retrieved context. If missing, say what is missing.
- Community corrections marked override beat everything else.
- Do not invent DP taxonomies (“cluster bridges”, etc.).
- Disambiguate “bridge” (Metaweb vs DP7 vs DP22) from retrieved text only.
- 22 **inscribed** DPs vs **draft** DPs on disk — never conflate counts.
- Cite `[source]` labels; UI turns them into source pills.

### 2.4 Threads and teaching

Signed-in conversations persist as Hermes threads (list, rename, truncate from a turn, fork from a turn). Truncate/fork exist so a long inquiry can drop a bad branch without losing the whole session.

**Teach Hermes** (`HermesTeachModal`): the participant writes *what Hermes should know next time*. The wrong reply is shown for context but **not** stored as teaching. Notes wait for **layer-admin / teaching-admin verify**. Once verified, they are injected into retrieval as overrides. Reject/revoke paths exist. Teaching admin resolution: env verifier/email allowlist **or** Gov Hub layer admin (`the-metaweb` by default).

### 2.5 Conversation → filing (the “last mile”)

When readiness says the exchange has concrete wording:

1. UI shows a contribution CTA (not after already-filed sets for that turn).
2. `POST /api/hermes/contributions/draft` produces patch/comment payloads (anchor, original/proposed text, insert vs replace).
3. Stage or submit via **Canopi Discuss** (preferred book path) and/or **Gov Hub** draft refs.
4. A **contribution set** is ledgered (fingerprints, status staged/partial/complete/superseded, revision-of).
5. A contribution **record** is appended on the thread so the CTA does not reappear for the same filing.
6. `/contribution-activity` shows the participant’s sets; layer admins see a wider summary (contributor count, sets filed, DPs touched, threads with filing).

This is the architectural claim that Hermes is not “chat about DPs” but **a drafting bench attached to ratification surfaces**.

### 2.6 Workgroup chat — three AI channels

Workgroup collab (`WorkgroupCollabClient` + `WorkgroupChatPanel`) keeps **human posting** on Gov Hub. Hermes is layered as:

| Channel | Who it speaks as | When it posts to the thread |
|---------|------------------|-----------------------------|
| **Draft my message** | The participant | Only when they Insert/Send from the composer |
| **Ask Hermes** | Hermes, private side panel | Only on **Share to thread** (✋ Hermes attribution) or **Adopt as my post** (composer, then they send as themselves) |
| **Ambient raised hand** | Hermes, private until opened | Assess after a message; teaser on ✋; full reply generated on open; **never auto-posts** |

Ambient assess (`/api/hermes/ambient/assess`): JSON `{ shouldRaise, confidence, mode, teaser }`. Raise only for DP alignment, tension, facilitation, or constructive challenge — not greetings/logistics. Modes: **observer**, **facilitator**, **devil’s advocate**. Defaults: confidence threshold **0.8**, cooldown **15 minutes**, devil’s advocate **request-only** (`@Hermes` / “Hermes, …” plus optional mode words). Facilitators can enable devil’s advocate without an explicit ask.

Workgroup-specific Ask Hermes starters: fit among DPs, new DP?, closest inscribed match, decision in the room, steelman the opposite, summarize for the room.

The first-open **experimental instructions** modal states the authorship rules in product language so the room is not captured by unlabeled AI speech.

### 2.7 Compose assist (adjacent)

The same `/api/dp/chat` path with a `/series` surface is used for Fork-in-the-Web workshop fields: short, complete sentences, participant voice, no markdown. That is Community AI **as a writing aid**, not the full agent thread UX.

---

## 3. Innovations (what is actually unusual)

These are the specific bets embodied in the shipped UX and APIs — not a generic “RAG chatbot” list.

### 3.1 Governance-grounded agent, not page-grounded generic Agent

Canopi’s optional Agent tab is a generic page-grounded prompt. Hermes is a **playbook**: inscribed vs draft DP counts, DEPENDS_ON graph, book passages, community overrides, and an explicit refusal to fill from training data. The book embed **deliberately does not** host Hermes yet (`BOOK-DISCUSS-EMBED.md`) so social Discuss and AI advisory stay separate.

### 3.2 Dual authorship in group chat

Most “AI in Slack” products post as a bot or silently rewrite humans. Workgroup Hermes splits:

- **Ghostwrite for me** (Draft my message) vs **consult privately** (Ask Hermes).
- **Share** (labeled ✋ Hermes) vs **Adopt** (human speech).
- Ambient **raise hand** (opt-in to read) vs **never auto-post**.

That is a product encoding of DP-adjacent values: human agency, accountability of speech, and resistance to unlabeled synthetic consensus.

### 3.3 Ambient facilitation with a confidence gate and cooldown

A cheap assess pass decides whether to interrupt. Workgroup settings (threshold, allowed modes, cooldown, devil’s-advocate policy) make “how much AI in the room” a **facilitator control**, not a global on/off hallucination firehose.

### 3.4 Readiness → ledger → Discuss, not “copy this into a form”

A second model pass detects *concrete wording*. Filing produces a **set** with fingerprints and revision links, then a thread-visible record. Success is a **published artifact on the book/Gov Hub**, not a thumbs-up on a chat bubble.

### 3.5 Teaching as governed memory, not silent fine-tuning

Participants write the correction they want remembered. Admins verify. Verified notes **override** retrieval. Wrong model text is not trained in. That is a small instance of “community ratification required” applied to the agent’s own knowledge.

### 3.6 Thread as a work object (truncate / fork / DP focus)

Inquiry is expected to last more than one sitting. Fork/truncate, per-thread contribution sets, and `dpFocus` treat the conversation as a **work product** that can branch into filings.

### 3.7 Document and URL intake as first-class review

Uploads and fetched URLs are primary sources for alignment critique, then cross-walked to graph + book. That matches `/participate` “integrate your existing ideas” (papers, notes, decks) in ≈10 minutes.

### 3.8 Explicit experimental labeling in workgroups

Workgroup Hermes is badged **experimental**, with a support-feedback deep link. That is both UX honesty and a measurement channel.

---

## 4. Hypotheses

Stated as testable product hypotheses implied by the architecture (not as proven results).

### H1 — Grounding beats fluency for DP work

If Hermes is constrained to graph + book + verified notes, members will get **citable, DP-specific** answers and will trust it enough to file patches — versus a fluent generic model that invents frameworks.

**Falsifier:** High rate of Teach Hermes on the same DP; “missing context” answers that *do* have full draft text in retrieval; invented categories in production replies.

### H2 — Last-mile filing increases real contributions

If readiness + draft + Canopi submit is in-thread, a larger share of *substantive* chats become **comments/patches** than equivalent Discuss-only or email workflows.

**Falsifier:** Many `contributionReady` CTAs, few completed sets; users copy text out and never submit; duplicate filings of the same fingerprint.

### H3 — Teaching loop improves local truth without poisoning memory

If corrections are explicit, reviewed, and override-scoped to DPs, later answers on those DPs will match community intent better than prompt-only iteration.

**Falsifier:** Unverified notes leaking into answers; verified notes unused; review queue stall; notes that conflict with inscribed text without being labeled as dissent.

### H4 — Private-first ambient AI adds facilitation without capturing the thread

If hands stay private until share/adopt, the **human transcript** remains the political record, while useful synthesis still happens.

**Falsifier:** High dismiss rate and low open rate (noise); or high share rate of low-confidence hands (capture); or members treating unlabeled adopted text as group consensus.

### H5 — Mode split (observer / facilitator / devil’s advocate) is load-bearing

Different rooms need different interventions. Request-only devil’s advocate by default prevents the agent from performing opposition that the group did not ask for.

**Falsifier:** Single-mode usage in practice; devil’s advocate shares that escalate conflict; facilitator notes that take sides.

### H6 — Dual composer (draft vs ask) preserves voice

Draft-my-message will be used for *sending as self*; Ask Hermes for *orientation*. Mixing them would collapse H4.

**Falsifier:** Almost all Ask replies adopted without edit; or draft assist unused because Ask is easier.

### H7 — People decide; AI organizes (workgroup synthesis)

Hermes can cluster themes, tensions, and next questions, but **ratification stays human** (workgroup + editorial + inscription process).

**Falsifier:** Groups rubber-stamp Hermes summaries as decisions; or Hermes is unused because it cannot see the real corpus of submissions yet (participate page lists clustering/synthesis that is still partly aspirational vs chat-over-recent-messages).

### H8 — Separation of Discuss vs Hermes is the right default for the book

Chapter-anchored social conversation and AI advisory should not share one sidebar until auth, prompt, threads, and notes can move together.

**Falsifier:** Users bounce because they cannot ask Hermes *on the passage*; Option A deep-link (`/agent?dp=N`) insufficient.

### H9 — Integrate-your-ideas is a 10-minute on-ramp

Document/URL intake plus gap/overlap answers will convert existing writing into DP-aligned proposals faster than reading 22 chapters first.

**Falsifier:** Upload path unused; answers too generic to draft a patch; users still need a human editor for every filing.

---

## 5. Measures of success

Prefer **stewardship metrics** over vanity traffic (aligned with DP19’s own warning: impressions and signups are not evidence). Use what the stack already emits.

### 5.1 Agent (`/agent`) — quality and conversion

| Measure | How to observe | Healthy direction |
|---------|----------------|-------------------|
| Signed-in threads created and **revisited** | Hermes threads list / Neo4j thread touch | Repeat sessions, not one-shot |
| Grounding honesty | Spot audits: citations vs “gap” admissions; Teach Hermes rate per DP | Fewer repeated corrections on the same claim |
| **Readiness → filed set** conversion | CTA shown vs contribution sets `complete` | Conversion up without duplicate fingerprints |
| Sets filed, DPs touched, threads with filing | `/contribution-activity` summary | Breadth across DPs, not one noisy thread |
| Destination mix | Canopi Discuss vs Gov Hub in ledger | Book Discuss as primary living draft |
| Teaching throughput | Notes submitted / verified / rejected / time-to-verify | Queue moves; verified notes cited in later answers |
| Truncation/fork use | Thread APIs | Used on long inquiries (signal of real work) |

### 5.2 Workgroup chat — agency and facilitation

| Measure | How to observe | Healthy direction |
|---------|----------------|-------------------|
| Hand **raise / open / share / dismiss / adopt** rates | `dp_hermes_hand` status timestamps | Open > dismiss for high-confidence; share modest; adopt edited |
| Confidence vs outcome | `confidence` vs open/share | Threshold 0.8 earns its keep; tune if noise |
| Cooldown violations | hands per workgroup per window | Ambient not firing on every message |
| Explicit `@Hermes` vs ambient | `requested_explicitly` | Both used; explicit for devil’s advocate by default |
| Authorship mix | ✋-prefixed Gov Hub messages vs human posts | Human majority; Hermes labeled when present |
| Experimental feedback tickets | Support links from instructions modal | Qualitative: confusion vs value |
| Facilitator settings changes | `dp_hermes_workgroup_settings` | Rooms actually configure modes/threshold |

### 5.3 Challenge outcomes (the real north star)

| Measure | Why it matters |
|---------|----------------|
| Patches/comments that survive editorial review into Version 1.0 language | Filing volume is not enough |
| Workgroup decisions that cite Hermes as *input*, not as *authority* | H7 |
| New or revised DPs (including draft DP23+) with community provenance | Integrate-your-ideas path |
| Member retention and return to collab / agent | DP19-style success |
| Reduced “where do I put this idea?” drop-off from `/participate` | Funnel: agent → filing or workgroup join |

### 5.4 Operational SLOs (necessary, not sufficient)

| Measure | Target sense |
|---------|----------------|
| `GET :8790/health` | Up with challenge-site |
| Chat latency / abort (90s LLM, 120s proxy) | Completions without empty/truncated replies (retry path exists) |
| Neo4j memory write failures | Logged, non-fatal, investigated if persistent |
| Secret/localhost posture | Hermes never bound to public interface |

### 5.5 Anti-metrics (do not optimize)

- Raw `/agent` pageviews, session length without filings or returns.
- Maximum hands raised.
- Maximum share-to-thread (that can mean capture).
- “Hermes agreed with us” as a decision record.

---

## 6. Known gaps vs the participate-page promise

The `/participate` workgroup list includes clustering submissions, recurring themes, and synthesis drafts across the **whole** comment/patch corpus. The **shipped** workgroup Hermes mostly sees **recent collab messages** plus DP book/graph retrieval — not a full submission warehouse in one pass. Treat corpus-scale synthesis as a **next hypothesis** (extend retrieval to Gov Hub patches + Canopi Discuss threads), not as already proven.

Ops Hermes (ticket queue) and Community AI share a name and graph host; they do not share the `/agent` prompt. Keep runbooks separate.

---

## 7. Code map

| Area | Path |
|------|------|
| Hermes HTTP API | `neo4j-knowledge-graph/scripts/hermes-server.js` |
| Chat + system prompt | `neo4j-knowledge-graph/src/hermes/dp-chat.js` |
| Retrieval | `src/hermes/dp-context.js`, `book-retrieval.js` |
| Ambient assess/reply | `src/hermes/ambient-hand.js` |
| Readiness | `src/hermes/contribution-readiness.js` |
| Ledger / Canopi submit | `contribution-ledger.js`, `canopi-client.js`, `govhub-client.js` |
| Teaching | `community-corrections.js`, `teaching-auth.js` |
| Challenge proxy | `challenge-site/src/app/api/agent/chat/route.ts` |
| Agent UI | `challenge-site/src/components/HermesChat.tsx` |
| Workgroup AI | `WorkgroupChatAiAssist.tsx`, `WorkgroupHermesPanel.tsx`, `HermesAmbientSidePanel.tsx` |
| Ambient store | `challenge-site/src/lib/dp-hermes-ambient-store.ts` |
| Public narrative | `challenge-site/src/app/participate/page.tsx` |
| Registry | `meta-console/registry.yaml` → `hermes-chat`, `desirable-properties` |

---

## 8. One-paragraph summary

DP Community AI is Hermes as a **localhost governance LLM** behind desirableproperties.org: retrieval-locked to the DP graph and book, with a **human-ratified teaching loop**, a **chat-to-Canopi-Discuss filing ledger**, and an **experimental workgroup layer** that may raise a private hand or answer in a side panel but **does not speak for the room unless a person shares or adopts**. Success is not engagement. It is **better, attributed contributions into Version 1.0**, with the human transcript remaining the political record.
