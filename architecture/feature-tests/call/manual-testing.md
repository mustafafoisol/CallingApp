# Voice Call Manual Testing Guide

Step-by-step manual tests for 1-on-1 voice calling. Run with **two browsers** (normal window + incognito).

**Prerequisites:** Migration `20250629000001_restore_calls.sql` applied; `calls` in `supabase_realtime` publication.

---

## Setup (do once per session)

### 1. Environment

```bash
pnpm dev
```

Open http://localhost:3000

| Variable | Required for | Notes |
|----------|--------------|-------|
| `METERED_TURN_API_KEY` | HP-4 (hotspot) | See [infrastructure.md](../../features/infrastructure.md) |
| `METERED_TURN_APP_NAME` | HP-4 | Metered app subdomain |

Without TURN keys, HP-1–HP-3 and HP-5–HP-6 work on same LAN only.

### 2. Create User A and User B

| Step | Action | Expected |
|------|--------|----------|
| 1 | Browser 1 → Google login → onboard as `Alice` | Public ID shown |
| 2 | Browser 2 → Google login → onboard as `Bob` | Public ID shown |
| 3 | Alice adds Bob; Bob accepts | Both in contacts; conversation exists |
| 4 | Both browsers | Allow microphone when prompted |

### 3. Verify call button

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Open chat with Bob | Phone icon visible in header |
| 2 | Alice | Hover / focus phone button | Enabled (not greyed out) |

---

## P0 — Core scenarios

### HP-1 Happy path — call, answer, talk, hang up

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Open chat with Bob → tap phone icon | Overlay: "Calling…" |
| 2 | Bob | On any page (`/home` OK) | Top banner: "Incoming voice call" |
| 3 | Bob | Tap accept (green phone) | Overlay: "Connecting…" then "Connected · 0:00" |
| 4 | Alice | Wait | Overlay shows "Connected" with timer |
| 5 | Both | Speak for ~30 seconds | Each hears the other clearly |
| 6 | Alice | Tap red hang-up | Overlay: "Call ended" → dismisses |
| 7 | Bob | Within ~2s | Overlay dismisses automatically |
| 8 | Ops | Supabase `calls` table | Latest row `status=ended`, `ended_at` set |

### HP-2 Decline

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Start call from chat | Overlay "Calling…" |
| 2 | Bob | Tap decline (red phone) | Banner disappears |
| 3 | Alice | Wait | Overlay shows "Declined" then dismisses |
| 4 | Ops | `calls` row | `status=rejected` |

### HP-3 Missed — no answer 45s

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Start call | Overlay "Calling…" |
| 2 | Bob | Do **not** interact | Banner may appear; ignore it |
| 3 | Alice | Wait **45 seconds** | Overlay shows "No answer" then dismisses |
| 4 | Ops | `calls` row | `status=missed` |

### HP-4 TURN — one side on hotspot

Validates NAT traversal when P2P fails.

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Ops | Confirm `METERED_TURN_API_KEY` + `METERED_TURN_APP_NAME` in `.env.local` | `/api/turn` returns TURN servers (no `warning`) |
| 2 | Alice | Desktop on home Wi-Fi | — |
| 3 | Bob | Phone hotspot → laptop browser | Different network than Alice |
| 4 | Alice | Start call | Ringing overlay |
| 5 | Bob | Accept | Both connect; audio works both ways |
| 6 | DevTools | Console (dev build) | `iceConnectionState: connected` or `completed` |

**Fail signal:** Connected overlay but no audio → TURN misconfigured or blocked UDP.

### HP-5 Mute

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Both | Complete HP-1 steps 1–4 (connected call) | Timer running |
| 2 | Alice | Tap mute (mic icon) | Icon switches to mic-off |
| 3 | Bob | Speak | Bob hears himself; **does not** hear Alice |
| 4 | Alice | Tap mute again (unmute) | Bob hears Alice again |
| 5 | Either | Hang up | Clean teardown |

### HP-6 Chat regression — E2EE after call

Ensures calling does not break encrypted messaging.

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Both | Complete a short call and hang up | Overlays gone; `uiState` idle |
| 2 | Alice | Send text `After call check` | Message appears in thread |
| 3 | Bob | View chat | Message decrypted and visible |
| 4 | Bob | Reply `OK` | Alice receives reply |
| 5 | Ops | `message_envelopes` | No stuck envelopes (relay ACKs) |

---

## P1 — Edge cases

### EC-1 Caller cancel while ringing

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Start call | "Calling…" |
| 2 | Bob | See incoming banner | — |
| 3 | Alice | Tap hang-up before Bob answers | Overlay dismisses |
| 4 | Bob | Within ~2s | Banner gone |
| 5 | Ops | `calls` row | `status=ended` |

### EC-2 Busy — second call while in call

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice + Bob | Connected call (HP-1) | Both in overlay |
| 2 | Alice | Second browser tab: try calling Bob again | Blocked — phone disabled or no second overlay |
| 3 | Ops | If second INSERT attempted | `status=busy` on new row |

### EC-3 Session replaced mid-call

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Connected call on Browser 1 | — |
| 2 | Alice | Log in on Browser 2 (incognito) | Browser 1 kicked to login |
| 3 | Bob | Within ~2s | Call ends; overlay dismisses |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No incoming banner | `calls` in Realtime publication; Bob logged in; filter `callee_id` |
| "Microphone permission denied" | Browser site settings → allow mic |
| Connected but no audio | TURN keys for cross-network; check console ICE state |
| Stuck on "Connecting…" | SDP columns populated? Realtime UPDATE reaching both clients? |
| `/api/turn` 401 | Session expired — re-login |

## Automated checks

```bash
pnpm test    # call-session, signaling, peer-connection unit tests
pnpm build   # production build
```