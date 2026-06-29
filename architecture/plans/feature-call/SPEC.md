# Voice Calling — v1 Specification

**Status:** Approved (Task 00)  
**Branch:** `feature-call`  
**Date:** 2026-06-29

This document locks scope for tasks 01–12. Changes require explicit revision here before implementation.

---

## Summary

1-on-1 **voice** calls between **accepted friends**, initiated from the chat screen. Media via WebRTC (SRTP/DTLS). Signaling via Supabase Postgres + Realtime. No custom signaling server.

---

## In scope (v1)

| Area | Decision |
|------|----------|
| Media | Audio only (`getUserMedia({ audio: true, video: false })`) |
| Participants | Two users in an existing `conversations` row |
| Access gate | `friendships.status = 'accepted'` + user is `user_a_id` or `user_b_id` |
| Entry point | Phone icon in `ChatHeader` (`chat-header.tsx`) on `/chat/[id]` |
| Signaling | `calls` table + Supabase Realtime `postgres_changes` |
| SDP transport | `offer_sdp` / `answer_sdp` columns (full SDP, no trickle ICE) |
| ICE | STUN (Google public) + TURN (Metered.ca) via `GET /api/turn` |
| Incoming UX | In-app ring banner on any `(app)` page while logged in |
| Call states | `ringing`, `accepted`, `ended`, `missed`, `rejected`, `busy` |
| Ring timeout | 45 seconds → `missed` |
| In-call controls | Mute microphone, hang up |
| Encryption | WebRTC default (DTLS-SRTP) — **not** E2EE chat keys |

---

## Out of scope (v1)

| Item | Deferred to |
|------|-------------|
| Video / screen share | M10 (post-v1) |
| Web Push when app closed | [phase3/notifications.md](../phase3/notifications.md) |
| Call history in sidebar / home | Future |
| E2EE media (insertable streams) | Not planned for v1 |
| Call recording | Never in v1 |
| Group calls | [phase2/group-chat.md](../phase2/group-chat.md) |
| PSTN / phone numbers | Never |
| Call transfer / hold | Never in v1 |

---

## Acceptance criteria

| # | Criterion | How we verify |
|---|-----------|---------------|
| AC-1 | Caller taps phone icon → callee sees ring UI | Manual: two browsers |
| AC-2 | Callee accepts → both hear audio within ~5s | Manual: speak/hear |
| AC-3 | Either side hangs up → call ends, overlay dismisses both | Manual |
| AC-4 | Callee rejects → caller sees "Declined" | Manual |
| AC-5 | No answer in 45s → `missed` in DB, caller sees "No answer" | Manual + SQL |
| AC-6 | Works across NAT (one side on hotspot) | Manual: TURN path |
| AC-7 | E2EE text chat still works after a call | Manual: send message post-call |

---

## TURN provider (decided)

**Primary:** [Metered.ca](https://www.metered.ca/) — REST API for ephemeral credentials.

| Env var | Scope | Purpose |
|---------|-------|---------|
| `METERED_TURN_API_KEY` | Server only | Fetch TURN username/credential from `/api/turn` |

**Fallback (dev):** If key missing, `/api/turn` returns STUN-only (`stun:stun.l.google.com:19302`) with a console warning. Same-LAN testing only.

**Alternative (self-host):** coturn — swap task 03 implementation later; v1 spec assumes Metered shape.

---

## Technical constraints

| Constraint | Rationale |
|------------|-----------|
| HTTPS required | `getUserMedia` and secure WebRTC contexts |
| One active call per user | Second incoming → `busy` |
| `REPLICA IDENTITY FULL` on `calls` | Filtered Realtime (`id=eq.{callId}`) |
| End call on `session_replaced` | Align with single-device E2EE session |
| No `/api/turn` in client bundle | API key stays server-side |

---

## UI states (caller)

```
idle → outgoing (ringing) → connected → ended → idle
                    ↘ declined / no answer / busy
```

## UI states (callee)

```
idle → incoming banner → connected → ended → idle
              ↘ declined (immediate)
```

---

## Non-goals checklist (explicit)

- [x] Do not reuse E2EE conversation keys for call media
- [x] Do not store call audio on server
- [x] Do not add call button to contacts home (chat only for v1)
- [x] Do not block text chat while call UI is open (overlay is non-destructive)

---

## Open questions (none for v1)

All v1 decisions resolved. Video and push are tracked as separate milestones.