# Hermes thread sharing (agent chat)

Hermes agent threads on `/agent` support collaborative sharing with watch/control roles, anchor floors, and audit records in Neo4j.

## Roles

| Role | Can view | Can prompt | Can disrupt before anchor |
|------|----------|------------|---------------------------|
| Owner | Yes | Yes (unless someone else controls) | Yes (at/after anchor only) |
| Watcher | Yes (visibility rules apply) | No | No (fork instead) |
| Control invited | Yes | No until accepted | No |
| Controller | Yes | Yes | No before anchor (fork instead) |

## Share modes (v2)

### Live thread (default)
Recipient follows the canonical thread. New turns appear for watchers.

### Fork snapshot
Owner shares a **frozen copy** through the share anchor. Created via `forkThreadThroughTurn`. Live thread stays private.

### Link vs direct
- **Link:** expiring URL (`/agent?share=…`). Recipient redeems when signed in.
- **Direct:** recipient email matches a known `Contributor.email` in Neo4j. Share appears under **Shared with me** without a link.

## Control acceptance (v2)

When share `intended_role` is **controller**, opening the link or direct delivery sets `WATCHES.role = control_invited`. Recipient must click **Accept control** before sending prompts.

Watchers may **Request control**. Owner or current controller can **Approve** or **Deny** pending `ControlRequest` nodes.

## Anchor floor

No one (including controller) may truncate, regenerate, or resubmit **before** `share_anchor_turn_id`. Fork instead.

## API (challenge-site proxies)

| Route | Purpose |
|-------|---------|
| `POST /api/agent/threads/:id/shares` | Create share (`shareThreadKind`, `sendeeRole`, `visibility`, …) |
| `GET /api/agent/threads/:id/shares` | List active shares + recipient status (owner) |
| `POST /api/agent/shares/redeem` | Redeem link token |
| `POST /api/agent/shares/:id/revoke` | Revoke share |
| `POST /api/agent/threads/:id/control/accept` | Accept control invitation |
| `POST /api/agent/threads/:id/control/request` | Request control (watcher) |
| `GET /api/agent/threads/:id/control/requests` | List pending requests (owner/controller) |
| `POST /api/agent/threads/:id/control/requests/:id/resolve` | Approve or deny (`{ action }`) |

Upstream: `hermes-chat` on port 8790 (`neo4j-knowledge-graph/scripts/hermes-server.js`).

## Graph objects

- `ThreadShare`, `ShareGrant` – share created, recipient intent, redemption audit
- `WATCHES` – recipient join (`role`: `watcher`, `control_invited`, `controller`, `owner_watch`)
- `CONTROLS` – active controller (one at a time)
- `ControlRequest` – pending handoff requests

Workgroup chat shares use Postgres (`dp_workgroup_message_share`). See `WORKGROUP-SHARE.md`.

## UI

- **Share wizard** – visibility, live vs fork snapshot, watch vs control, recipient email
- **Thread header / message footer** – share status for owners
- **Control panel** – accept invite, request control, approve/deny requests
- **Sidebar** – Shared with me (👁 watch, ⏳ control invited, ✎ controlling)
