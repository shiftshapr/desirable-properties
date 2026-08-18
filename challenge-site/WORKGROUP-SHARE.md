# Workgroup chat share restrictions

Workgroup message shares are **internal collab only**: members share a point in the workgroup chat thread with another member. No public expiring links.

## Who can share

- Only signed-in **active workgroup members** may open the share modal.
- **Facilitators** (coordinator, co-lead, or approved facilitator position) may share any visible chat message.
- **Regular members** may share only:
  - messages they authored, or
  - Hermes ambient / Ask Hermes messages already posted to the thread (bodies prefixed with `✋ *Hermes (`).

## Who can receive

- Recipient must match a **workgroup roster member** (Gov Hub `user_id` / display name within the same workgroup).
- Platform users invited to the workgroup who appear on the members list qualify.
- **External emails outside the roster are rejected** with an error.

## Share modes

| Mode | Default | Who may grant |
|------|---------|---------------|
| Watch only | Yes | Any eligible sharer |
| Control | No | Facilitator, or author sharing their own message |

- Per-message share always anchors **from that message forward** (`from_share_point`).
- Anchor floor: recipients cannot see or disrupt history before the share point (same rule as Hermes thread shares).

## Visibility and Hermes

- Shared thread visibility respects workgroup ambient policies (private Hermes notes vs shared-to-thread posts).
- Private Hermes panel content must not leave the workgroup roster; workgroup chat share never creates public links.

## API

| Route | Purpose |
|-------|---------|
| `GET /api/workgroups/:id/members/roster` | Member autocomplete (member-only) |
| `POST /api/workgroups/:id/messages/:messageId/shares` | Create internal share record |

Storage: `dp_workgroup_message_share` (Postgres). Hermes `ThreadShare` nodes accept optional `workgroup_id` for agent-thread shares in workgroup context; `mode=link` is rejected when `workgroupId` is set.

## UI copy

The share modal footer states: internal members only, no public links, anchor-from-message, private Hermes stays in-roster.

Implementation: `src/lib/workgroup-share-restrictions.ts`, `WorkgroupMessageShareModal.tsx`.
