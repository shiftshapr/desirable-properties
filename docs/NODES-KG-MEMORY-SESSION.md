# Session: Knowledge Graphs as the Memory Layer of Collective Intelligence

Paste-ready copy for the evaluation form, plus a proposed 30–45 minute talk structure.

Related architecture: [DP-COMMUNITY-AI-BRIEFING.md](./DP-COMMUNITY-AI-BRIEFING.md).

---

## Form fields

**Title**  
Knowledge Graphs as the Memory Layer of Collective Intelligence

**Optional subtitle** (if the form allows it)  
GraphRAG, agent memory, and human ratification in a live governance community

**Session format**  
Full session, 30–45 min

**Level**  
Intermediate

**Prerequisites**  
Basic familiarity with graphs, Neo4j, and RAG is helpful but not required. No advanced Cypher. Interest in agent memory, provenance, or collaborative AI is enough.

**Topic of your presentation**  
Knowledge Graph · Responsible AI · GenAI · AI Agents · Memory · GraphRAG · Context Graph · Context Engineering · Collective Intelligence · Provenance

**Neo4j use-case**  
Knowledge Graph · GraphRAG · AI Agents

If the form allows a fourth tag: Memory / RAG grounding.

---

## Description (submit this)

Large language models are fluent, but they are not a memory system. Context windows forget. Vector search retrieves similar text without preserving the relationships, provenance, and disagreements that communities actually reason with. Isolated documents and embeddings cannot tell you what depends on what, who corrected whom, or whether a claim is inscribed, drafted, or still in dispute.

This session treats the knowledge graph as a persistent memory layer for both AI agents and collective intelligence. The working example is a production community agent (Hermes / DP Community AI) used by the Desirable Properties challenge: a public effort to specify properties of a layered internet. Artifacts — book chapters, governance records, conversations, uploaded documents, and community corrections — are modeled in Neo4j as entities, `DEPENDS_ON` edges, claims, proposals, and verified notes. The agent may answer **only** from that retrieved graph (plus cited book passages). If the graph does not contain the answer, it must say what is missing. It does not invent frameworks from training data.

Attendees will see graph modeling and retrieval choices that matter in practice: inscribed versus draft nodes, relationship-aware GraphRAG rather than similarity-only lookup, provenance labels on every citation, and a teaching loop in which humans write corrections that **admins verify before those notes override retrieval**. We will also walk the last mile that most GraphRAG talks skip: detecting when a conversation is ready to become a patch, ledgering the filing, and writing the contribution back so the graph and the human record stay aligned.

A second pattern is agent memory in group chat. The graph (and the agent) may raise a private “hand” in a workgroup — observer, facilitator, or devil’s advocate — but they **never auto-post**. A person must share with attribution or adopt the text as their own. Human speech remains the system of record. That is responsible AI as architecture, not as a slide.

By the end of the session, attendees will have a reusable pattern: knowledge graph as shared substrate connecting human knowledge, AI reasoning, and collaborative decision-making — plus concrete Neo4j retrieval strategies, relationship design, provenance tracking, and success measures that are not engagement (filings that survive review, teaching notes that actually change later answers, labeled AI speech versus unlabeled capture).

---

## Why this version (for the speaker, not the form)

| Generic GraphRAG CFP | This session |
|----------------------|--------------|
| Documents become a graph | Live community agent grounded on Neo4j |
| Vectors miss relationships | `DEPENDS_ON`, inscribed vs draft, claims/proposals |
| Trust as a closing adjective | Agent answers only from retrieved context; teaching is ratified |
| Chatbot demo | Chat → readiness → patch ledger → Discuss / Gov Hub |
| Enterprise KM as the hook | Same pattern, proven in a public governance community |

If the program is strictly vendor-neutral, replace product names with “a production community-governance agent on Neo4j” and keep Desirable Properties as the domain.

---

## Proposed presentation structure (30–45 min)

Times below assume **40 minutes talk + 5 minutes Q&A**. Compress the starred sections first if the slot is 30 minutes.

### 0. Cold open (2 min)

**Demo beat, not a title slide.** One question a generic RAG stack fails:

- “How does DP7 relate to DP22, and is that inscribed or still a draft?”
- Or: “Hermes said X last week. The community corrected it. What does it say now?”

Show the **citation pills** / `[source]` labels. State the thesis: *the graph is the memory; the model is the speaker; humans remain the record.*

### 1. The problem is memory, not generation (4 min)

- LLMs: fluency without persistence, provenance, or disagreement.
- Vector RAG: similarity ≠ relationship; cannot encode “depends on,” “overrides,” “inscribed vs draft,” “verified correction.”
- Collective intelligence needs **shared memory across people, agents, and time** — not a longer context window.

**Slide pattern:** three failing retrievals (chunk, embedding, keyword) vs one graph walk.

### 2. Pattern: graph as shared memory substrate (5 min)

Architecture, one diagram:

```text
Humans (book, workgroups, patches)
        ↘
     Neo4j memory layer  ←→  Hermes (agent)
        ↗
Governance records, teaching notes, contribution ledger
```

Name the **three consumers** of the same graph:

1. Retrieval for the agent (GraphRAG).
2. Memory of conversations and filings (threads, contribution sets).
3. Human ratification (verified notes, inscribed vs draft).

**Takeaway:** one substrate, three jobs. Do not build a chat log, a vector index, and a wiki that never meet.

### 3. Modeling that actually matters (7 min) *

Concrete Neo4j shapes (no advanced Cypher required on slides; one simple `MATCH` is enough):

| Concept | Graph choice | Why |
|---------|--------------|-----|
| Desirable Property | Node + inscription status | 22 canonical vs draft (e.g. DP23) must not be conflated |
| Depends on | `DEPENDS_ON` (and reverse) | Reasoning across the set, not isolated chapters |
| Claim / critique / proposal | Typed nodes from Gov Hub sync | Community debate is first-class, not buried in PDFs |
| Community note | Verified override in retrieval | Teaching is governed write, not silent fine-tune |
| Chat turn / thread | Hermes namespace | Agent memory is attributable, forkable, truncatable |

**Demo:** one `DEPENDS_ON` neighborhood + a verified note beating a stale generic answer.

**Anti-pattern (10 seconds):** dumping every PDF chunk as a node with no relationship design.

### 4. Retrieval strategy (GraphRAG in this system) (6 min)

Walk one live `/agent` turn:

1. Extract DP numbers, topics, section refs from message + recent history.
2. Pull graph excerpts, book passages, verified notes, optional URL fetch.
3. Generate **only** from that context. If missing, say what is missing.
4. Cite `[source]` / `[web:host]`. UI renders pills, not hidden chain-of-thought.

Contrast with “top-k embeddings over the book.” Relationship queries and focus-DP full text vs keyword snippets.

**Responsible-AI beat:** the model is forbidden to invent DP taxonomies. That is a prompt *and* a retrieval contract.

### 5. The last mile: conversation → contribution (5 min) *

Most GraphRAG talks stop at a good answer. This system asks: *is this ready to become a patch?*

1. Second model pass: contribution readiness (comment vs patch, message vs thread scope).
2. Draft payloads (anchor, original/proposed, insert vs replace).
3. Submit to Canopi Discuss / Gov Hub.
4. Ledger the **contribution set** (fingerprints, revisions) and append a record on the thread.

**Takeaway:** graph memory is incomplete until the human filing is written back. Success = artifacts that enter Version 1.0 review, not thumbs-up on a chat bubble.

### 6. Agents in the room without capturing the room (5 min) *

Workgroup chat:

- **Draft my message** — AI ghostwrites; human sends as self.
- **Ask Hermes** — private side panel; share (✋ attributed) or adopt.
- **Ambient raised hand** — assess (confidence, cooldown, mode); never auto-post.

Modes: observer / facilitator / devil’s advocate (devil’s advocate request-only by default).

**Thesis:** unlabeled synthetic consensus is a governance failure. The knowledge graph can remember AI offers; the **Gov Hub transcript** remains political speech.

If short on time: one screenshot of raised hand + share/adopt, skip mode details.

### 7. How we know it is working (3 min)

Not pageviews. Measures the stack already emits:

- Readiness CTA → completed contribution sets (and DPs touched).
- Teaching: submitted / verified / rejected / time-to-verify; later answers actually change.
- Ambient: raise / open / share / dismiss / adopt — high dismiss = noise; high unlabeled adopt = capture.
- North star: patches that survive editorial review; Hermes cited as **input**, not **authority**.

**Anti-metrics:** max hands raised, session length, “the agent agreed with us.”

### 8. What you can steal Monday (3 min)

Reusable patterns:

1. **Inscribed vs draft** (or prod vs proposed) as a first-class property.
2. **Override nodes** with a human verify step before they enter retrieval.
3. **Refuse to answer** when the graph is silent — log the gap as a graph task.
4. **Write-back loop:** agent output that becomes a governed artifact must be fingerprinted on the graph.
5. **Split stores on purpose:** human speech in the collaboration system; AI offers private until published.
6. **Relationship design before embeddings.** Use vectors as a helper, not the memory.

Point to Desirable Properties / Hermes as the public instance; enterprise KM is the same pattern with different node types.

### 9. Close + Q&A (5 min)

Restate: *Graph = shared memory. Model = reasoning under constraint. Community = ratification.*

Invite questions on modeling, Cypher/retrieval, teaching UX, or workgroup ambient.

**Backup slides** (if asked): localhost Hermes topology; `dp-memory-graph` sync cron; why Hermes is not inside the book Canopi embed yet.

---

## 30-minute cut

Drop or collapse: section 3 modeling table (keep one `DEPENDS_ON` slide), section 5 ledger detail (keep “readiness → file → write-back”), section 6 modes (keep never-auto-post). Keep cold open, problem, architecture diagram, one retrieval demo, steal-Monday list.

## 45-minute stretch

Add 5 minutes live: Teach Hermes → admin verify → same question, new override. Or walk a workgroup hand from assess JSON to share. Do not add another architecture overview.

---

## Speaker notes (hypotheses to name if asked)

These are product bets, not proven laws — say so:

- Grounding beats fluency for governance Q&A.
- In-thread filing increases real patches vs copy-paste.
- Verified teaching improves local truth without poisoning memory.
- Private-first ambient helps facilitation without capturing the transcript.
- People decide; AI organizes.

Falsifiers live in the architecture briefing (repeated Teach Hermes on the same claim, CTAs with no completed sets, high dismiss or unlabeled adopt).
