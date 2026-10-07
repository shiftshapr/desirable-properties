# Desirable Properties: capabilities

**Hub:** [desirableproperties.org](https://desirableproperties.org)  
**Book:** [book.desirableproperties.org](https://book.desirableproperties.org)  
**As of:** 22 September 2026

The public name of the assistant is **Deepi** (tagline: DP Community AI). The page is `/agent`. Hermes is the private server process behind Deepi. Participants do not see that name.

Canopi is the place passage changes are made on the book: **Discuss, Patch, and Insert**. Gov Hub is the formal draft record and the membership system. Workgroups synthesize both into a revision.

## 1. Challenge site (desirableproperties.org)

### Home

- Hero, Start Here panel, and a plain-language definition of Desirable Properties.
- Live counts: 23 canonical DPs, number of active workgroups.
- Recent activity feed, with a link to the full feed.
- Card grid of every DP, each linked to its page and its workgroup.
- “Missing something?” submits a candidate DP on Gov Hub, or opens the DP Discovery workgroup.
- Three entry cards: Collaborate page, Discuss & Patch (opens the book in Canopi), Deepi.

### Start Here, About, Challenge, FAQ, Kickoff

- **Start Here:** the two contribution tracks (review on the book, join a workgroup) and the Version 1.0 date (13 November 2026).
- **About:** framing essay for the Coordination Layer / Meta-Layer.
- **Challenge:** timeline, current phase, countdown, workgroup formation status. Community Review Draft milestone was 16 September 2026. Open draft is Version 0.77.
- **FAQ:** tool map (book, Collaborate, Gov Hub, Deepi, On-Chain), Discuss vs Patch vs Insert, roles, Version 0.77 vs 1.0.
- **Kickoff:** 16 September 2024 meeting with Vint Cerf, written summary and recording.
- **Participate:** longer catalog beyond Start Here (Deepi, badges, roles, Gov Hub, optional paths).
- **Launch briefing:** what shipped for the 16 September governance demo.
- **Terms and privacy.**
- **Login** via Web3Auth. Same identity is handed to the Canopi embed.

### Each DP page (`/dp/dp1` … `/dp/dp23`)

- Campaign view and spec view.
- Name, category, description, key elements, image.
- Provenance: inscription link (DP1–DP22), Gov Hub ML-Draft, PDF download, PCI / Call for Input sources where they exist.
- Quick actions: open the chapter in Canopi (Discuss & Patch), open the collaborate page, open the Gov Hub draft.
- Related pathway when the property is on the AI & human agency path.
- Civic-challenge framing where one is defined for that DP.

### Activity (`/activity`)

Three tabs:

- **Activity:** unified feed of Gov Hub governance, workgroup actions, and book discussion.
- **Updates:** archive of email broadcasts sent to the community, with images. Recipients can unsubscribe.
- **Blueberries:** optional participation actions (read, comment, patch, invite, and similar). Admins define the list. A support reply can award one.

Home also raises a toast when new activity arrives.

### Badges (`/badges`)

- One base badge per Desirable Property.
- Role overlays: Member, Workgroup Coordinator, Co-lead, Reviewer, Patch Contributor, Steward. One badge can carry more than one overlay.
- Minted badges can link to the work that earned them (BRC333 mint preview).
- Series badge and PEARL badge are separate (see Events).

### On-Chain (`/onchain`)

- Index of inscribed DP1–DP22 (ordinal ids) and the note that DP23 is draft-only.
- Call for Input inscription, PCI emails, and the community submission index with inscription ids.
- Book monument / reader preview.
- Claimable lists.
- Admin login (allowlisted emails) to manage claims. Not part of public review.

### Landing pads (`/pad`)

- Directory: look up an org, create a person pad.
- **Org pad** (`/pad/{slug}`): public corpus briefing, invite into the properties, Community Chat.
- **Person pad** (`/pad/person/{slug}`): profile links, sources the person chose, a preview of how their perspective might be read, upload, and confirm-or-edit. Nothing inferred becomes fact until they confirm it.
- Admins set pad defaults.

### Support (`/support`)

- File a ticket, with attachments.
- Admin queue: read, reply by email, award a blueberry.
- A separate internal queue triages tickets and runs health checks. That queue is not Deepi and is not on the public nav.

### Legal and identity

- Web3Auth session (`/api/auth/web3auth`, `/api/auth/me`, logout).
- Canopi embed session mint and refresh, so the book sidebar is the same person.
- Invitations by token: open and accept.

## 2. The book

`book.desirableproperties.org` is the reader for *The Layered Web*.

- Cover and full reader.
- 23 chapters, grouped into parts, sidebar table of contents, keyboard previous/next, progress, dark/light theme.
- Local text vs inscribed mode. Local chapter text is the Gov Hub rail, synced into `content/local/dpN.md`.
- Smart links: a `DP7` mention jumps to that chapter.
- Bookmark `#ch=dp-N`.
- Inscription id at the end of each inscribed chapter, linking to the ordinal.
- Canopi corner tab, label “Join the discussion,” on every `/viewer/*` chapter and on the Fork perspective page.
- “Discuss & Patch” from the challenge site opens the chapter with Canopi already open (`?discuss=1`).

Staging reader: `staging.book.desirableproperties.org`.

## 3. Canopi

Canopi is the conversation and patching layer. On the book it is a sidebar (Go Meta / corner tab), not a separate site the reader has to find.

### Passage actions (this is where Patch and Insert happen)

Select text in a chapter. Canopi attaches that selection as the anchor.

- **Discuss:** anchored comment. Chapter text stays as it is.
- **Patch:** propose replacement text for the selection.
- **Insert:** propose new text above the selection. The anchor passage stays.
- Hover a Patch or Insert in the feed to preview the change.
- Save a Discuss draft, or post it.
- Comment on a patch without changing its wording. Like posts.

Deepi’s “submit” writes a Patch or Insert into this same Canopi Discuss feed. If the quality check rejects the wording, the person can ask Deepi to revise it or save the Discuss draft and keep editing.

### Sidebar tabs on the DP embed

- **Discuss:** the chapter thread, including Patch and Insert.
- **Visibility:** how the person appears on the page.
- **Rooms:** live room chat for that chapter, separate from the async Discuss thread.
- **People:** who is associated with the page.
- **Settings.**

The same embed is allowed on `desirableproperties.org`, `www`, staging, `book.desirableproperties.org`, `staging.book`, and `book.themetalayer.org`. Support from inside the widget goes to `/support`.

### Inside a workgroup

- Canopi strip on Getting Started and Astra: post, comment, review, like on that chapter without leaving the collaborate page.
- Roster shows Canopi avatars and profile links.
- People search (Canopi users) when inviting.

Gov Hub patching still exists: open an ML-Draft, select a passage, file a formal revision. Review reads **both** Canopi Patch/Insert and Gov Hub draft patches. Canopi is the book widget. Gov Hub is the draft system of record.

## 4. Deepi (`/agent`)

Header name: **Deepi**. Tagline: DP Community AI. Sign-in required to send. Intro: clarify what properties mean, surface tensions, turn arguments into patches. Conversations stay in the sidebar.

### Sidebar

- **New → Personal chat:** private thread with Deepi.
- **New → Community Chat:** group thread. Invite others. Badge and invite count on the row.
- Search conversations.
- Rename, archive, delete, copy chat id.
- Archived view.
- Shared with me / shared by me.
- Landing-pad threads appear in the list when a pad opened one.
- About popover links to Start Here.

### Personal chat

- Multi-turn thread. Reload keeps `?thread=`.
- Starters from the URL: a DP, an intent, a pathway, a prompt.
- Attach a document. Fetch a URL that appears in the conversation and use it as source material.
- Answers are limited to retrieved material: property texts, dependency links between properties, verified community notes, and the attached document or URL. Missing material is called missing. DP23 is treated as a draft, not as an inscription.
- Edit a message after Deepi has finished. Stop a reply in progress.
- **Fork** from a turn. **Truncate** from a turn.
- **Teach Deepi:** write the correction. A layer admin verifies, rejects, or revokes it. Verified notes override later answers. The bad reply is not stored as teaching.
- **Share** the thread: watch or control. Request control, accept control, resolve a control request, revoke a share. Redeem a share link.
- Source pills on answers.

### Filing from the thread

When the exchange has real wording:

- Readiness check.
- Draft a patch or insert (anchor, original, proposed).
- Revise after a rejection.
- Stage it.
- Submit it to Canopi Discuss as a Patch or Insert, or publish edits.
- Open the resulting Discuss post or draft on the book.
- Ledger: contribution sets, status, revision-of, so the same filing is not offered again.
- **Contribution activity** page: that person’s sets. Admins see contributor count, sets filed, DPs touched, threads with a filing.

### Community Chat (still on the Deepi page)

- Human messages in the center. Placeholder: “Message Community Chat…”
- Private Deepi rail on the right: raised hand, Ask Deepi, dismiss, open, share into the human thread (labeled as Deepi) or adopt and send as yourself.
- Raised hands do not auto-post.
- Owner invites by email or link. Members can post and use private Deepi. Watchers can read. Controllers apply to private agent flows.
- Edit or delete your community message.
- Workgroup **External Chat** creates one of these and lands on Deepi.
- An embeddable community thread exists for a host page (`/embed/hermes/community`) with access check, thread load, and chat.

### Deepi next to workgroup chat

Same three channels as Community Chat, scoped to the Gov Hub member thread:

- Draft my message (sent only when the member sends it).
- Ask Deepi (private until Share or Adopt).
- Raised hand (private until opened, never auto-posts).
- Facilitator settings: confidence threshold, cooldown, allowed modes (observer, facilitator, devil’s advocate), whether devil’s advocate requires an explicit ask.
- Facilitator queue of hands.
- Experimental badge and a support link for feedback on that feature.

## 5. Workgroups

23 property workgroups plus **DP Discovery**.

Directory (`/workgroups`):

- One card per DP plus Discovery, with short description and image.
- Join, or nominate a coordinator (layer admin approves).
- Leave.
- See whether you are already a member.
- Roster target: at least three people. Nudge when a group is under that.
- FAQ on size, picking a group, low-touch roles, multiple memberships, how coordinators are chosen.
- **Signups** list.
- Positions catalog.

Roles: Member, Coordinator, Co-lead, Editor, Presenter, Facilitator, Liaison, Recorder.

Welcome pages: member, coordinator, lead. Each can be opened for a specific workgroup.

Gov Hub holds membership, roles, the human chat transcript, and draft proposals. The collaborate page is the workspace.

### Collaborate page tabs

**Getting Started**

- States the job: Community Review Draft to Version 1.0.
- Roster status (recruit vs enough people).
- Opens Astra, Review, Invite.
- Links: DP page, member welcome, book chapter in Canopi, Gov Hub draft, Gov Hub workgroup, all workgroups, editorial synthesis index.
- Canopi strip.
- Mission and the ask (read, review, discuss, patch, join the group thread).
- Launch briefing link when that group is in the demo set.

**Members**

- Roster sorted with coordinator first, then people who hold a position.
- Role badges, join date, Canopi avatar and profile.

**Workgroup Chat**

- Human messages stored on Gov Hub.
- Composer with draft assist.
- Deepi side panel (section 4).
- Share a message with another roster member, from that message forward. Watch or control. Control is limited to facilitators, or to the author sharing their own message. External emails are rejected. No public links. Private Deepi notes are not shareable outside the roster.
- Message share records who received it.

**Astra**

- Reads one immutable editorial release (integrated community-review chapter).
- Chapter reader with each change highlighted.
- Provenance: which proposal a change came from.
- Omitted-material list.
- Applause counts, including yours.
- Coordinator can revoke or restore an Astra change.
- Deep link to a change or a proposal.
- Chapter PDF and full-book PDF. Downloads are tracked on the activity feed.
- DP Discovery can switch among all 23 chapters.

**Review**

- Queue of Canopi book Patch/Insert items and Gov Hub draft patches for this chapter.
- Source badge (Book Discuss vs Gov Hub), patch vs insert, status, author.
- Conflict set when more than one replacement targets the same passage.
- Diff preview (removed / added).
- Rationale.
- Links back to the book Discuss item and the Gov Hub draft.
- Members: yes or no, plus an optional comment. Votes stay on the workgroup. They are not a public downvote.
- Coordinator: **Promote to revision** (composes the next unpublished draft) or **Drop**. Leave pending by doing nothing. Promote can be blocked, with a reason shown.
- **Publish revision** appears after at least one proposal is in the composed draft. Optional release note. Publish is the step that makes the draft the live text. Promote does not.

**External Chat**

- Starts a Deepi Community Chat for people who are not on the workgroup roster.

**Activity**

- Merged log: workgroup chat, Gov Hub proposals, Canopi Discuss, member chapter edits, Astra revoke/restore, downloads.
- Filter to comments and patches.
- Diff preview on patch rows.
- Jump toward the book or the draft.

**Invite with Email**

- Pick content to include (event, perspective, DP).
- Draft the note, with Deepi research and draft assist.
- Confirm and send.
- Disambiguate when a name matches more than one person (Canopi and Gov Hub people search).

### Other workgroup actions

- Join and leave from the page.
- Nominate coordinator.
- Chapter edits: a member can propose a passage patch against the Astra chapter (pending, active, rejected, revoked). Coordinators review. Legacy full-chapter snapshots still load. Effective markdown is base plus accepted edits.
- Editorial synthesis index lists the synthesized chapters across DPs.

## 6. Events

### Index (`/events`)

- Upcoming and past.
- Each card: image, date, title, kind (Event or Workshop), series name.
- RSVP on Luma when the event is external.
- Watch recording when one exists.
- Date and title open the session page, which holds the questions.

Nav adds an Events menu when upcoming items exist. Titles only in the menu. Dates are on the pages.

### Single events

- **Community Review, 16 September 2026** (`/events/community-review`): public milestone page for the Community Review Draft and the governance / patching / feedback demo. Register on Luma. Featured properties: DP1, DP2, DP12, DP19, DP22. Marked historical. Start Here is the current onboarding path.
- **Kickoff, 16 September 2024** (`/kickoff`): the meeting that started the challenge, with recording.

### Series

- Index at `/series`.
- Series page: title, subtitle, hero, description, session list, perspective link, pathway link, live URL for a single-session event.
- Signed-in progress across sessions.

**Fork in the Web** (`/series/fork-in-the-web-workshops`): four standalone sessions, about 75 minutes each, about 8 hours with pre-read and questions. Question: will AI mediate reality, or help build a human-centered internet.

**Session page**

- Pre-reads with time estimates.
- Confirm attend / watch / pre-read.
- Prepare, Engage, Reflect questions. Text answers have a minimum length.
- Per-field Deepi assist (plain text, participant voice, dropped into the textarea).
- If assist was used, submit requires “I stand by all the answers.”
- Consent: anonymized answers may be used in synthesis. Optional attribution.
- Save and edit after submit.
- Series progress panel.

**PEARL track** (`/series/{slug}/pearl`)

- Patch idea (textarea plus assist).
- Where it was socialized, and a note.
- Feedback summary and who it came from.
- **Verified patch:** the site looks up a real Canopi Patch/Insert or Gov Hub patch by the signed-in person. A pasted URL is not the check. Status endpoint reports found / not found and a link.
- Reflection.
- Series badge when every required session has attend-or-watch plus a submitted response.
- PEARL badge when the verified patch step is complete and the track is submitted.
- Badge artwork preview on the page.

**Perspective and pathway**

- `/perspectives/a-fork-in-the-web` (Canopi embed enabled on this page).
- `/pathways/ai-human-agency`, linked from related DP pages and from the series.

### Event admin

`/admin` → Event series:

- Create and edit a series (not hard-coded to Fork).
- Sessions, sections, questions, pre-reads.
- Preview a session.
- See submissions and PEARL progress.

## 7. Interface Governance Hub (what this system uses it for)

Public site: [interfacehub.net](https://interfacehub.net). Drafts, formal passage patches, workgroup membership, and layer governance live here.

- ML-Draft read and patch for each property.
- Workgroup records: create/join, membership, positions, human chat messages.
- Coordinator nomination and layer-admin approval.
- `dp_proposal` rows: anchor, patch vs insert, rationale, status, source channel (Gov Hub or Canopi sync).
- Submit a candidate DP (`/submit/?layer=the-metaweb`).
- Approve a revision. Rail sync copies that approved text into the book.
- Support at interfacehub.net/support.
- Broadcast audience is built from workgroup signups, then enriched for email addresses.

## 8. Admin, mail, and ops on the challenge site

`/admin` groups:

**Community**

- Blueberries: create, edit, reorder, remove, search posts to attach.

**Outreach**

- Broadcast: audience, preview, test send, live send, images, log.
- Site messages: schedule a modal on a page. Public site reads the active one.
- Invite content: library of events and perspectives an invite can attach.
- Email invites: research a person, draft with Deepi, classify, review, send, retry failures, send-all status, Zoho ingest, pathway URL apply.
- Long-gap send: re-contact people who have been quiet.

**Events:** series editor (section 6).

**Ops**

- Support ticket queue.
- Site admin, including pad defaults and the default tab for landing pads.
- Extra admin emails beyond the env allowlist.

Also:

- Unsubscribe and public broadcast archive.
- Resend webhook for delivery events.
- On-chain claims admin.
- Deepi teaching admin: verify, reject, revoke community notes (`/agent/admin`).

## 9. Backend

What has to be running for the capabilities above.

| Service | What it does |
| --- | --- |
| challenge-site, PM2 `desirableproperties`, port 3005 | Production site: pages, APIs, Deepi proxy, collab, events, admin |
| `desirableproperties-staging`, port 3006 | Staging site (`staging.desirableproperties.org`) |
| Book static files | Reader at book.desirableproperties.org and staging book |
| Canopi prod API | Discuss, Patch, Insert, Rooms, Visibility, People, likes, profiles, embed script `embed/v1.js`. Community id and embed id are fixed for this book |
| Canopi staging API | Same embed against staging when the staging book is used |
| Interface Governance Hub (`interfacehub.net`), datatracker port 8000 | Drafts, proposals, workgroups, membership, chat. Dev on 8001 |
| Gov Hub vote-tick | Closes governance timers |
| hermes-chat, localhost port 8790 | Deepi’s model runtime. Not public. Browser calls `/api/agent/chat`. That route calls `/api/dp/chat` with a shared secret. Also threads, ambient assess, contributions, community notes |
| Neo4j `neo4j-kg` | DP catalog, dependency edges, claims, proposals, Deepi thread memory, verified notes |
| dp-memory-graph | Scheduled sync of Gov Hub proposals and the catalog into Neo4j. Not the chat process |
| Postgres `desirable_properties` | `dp_` tables: tickets, broadcasts, modals, blueberries, event series and answers, PEARL, raised hands, Deepi workgroup settings, message shares, review votes, chapter edits, Astra applause and revocations, pads |
| Astra release files | Immutable chapter bundles the Astra tab serves. Env picks the release id |
| Rail sync workflow | Pulls the latest approved Gov Hub revision of each ML-Draft, plus images, into the book local rails |
| Resend | Support mail and broadcasts |
| Web3Auth | Sign-in. Embed JWT so Canopi on the book is the same session |

Deepi turn:

```text
Browser
  → POST /api/agent/chat
  → hermes-chat :8790  /api/dp/chat
  → model + Neo4j + book files
  → optional Patch or Insert on Canopi, or a Gov Hub draft ref
```

Human workgroup chat is posted to Gov Hub. Canopi Patch and Insert bodies live in Canopi. Review reads both. Promote and publish write back through Gov Hub. Rail sync then updates the book file.

## 10. Who is allowed to do what

- Anyone can read the book, the DP pages, events, and on-chain index.
- Signed-in people can chat with Deepi, join a workgroup, vote on Review, answer session questions, and file a Canopi Patch or Insert.
- Workgroup members can post in that group’s chat and use the Deepi side panel.
- Facilitators (coordinator, co-lead, or an approved facilitator position) can share any chat message, change Deepi room settings, and promote or drop a Review item.
- A layer admin approves coordinators and verifies Teach Deepi notes.
- Site admins run broadcasts, tickets, series, blueberries, and pads.
- Publish revision is the release step. It is separate from promote. Promote only composes the unpublished draft.
