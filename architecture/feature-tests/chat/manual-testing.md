# Chat Manual Testing Guide

Step-by-step manual test procedures for realtime 1-on-1 chat. Run with **two browsers** (or one normal window + one incognito).

---

## Setup (do once per session)

### 1. Start the app

```bash
pnpm dev
```

Open http://localhost:3000

### 2. Create User A

| Step | Action | Expected |
|------|--------|----------|
| 1 | Browser 1 → Continue with Google (Account A) | Login succeeds |
| 2 | Complete onboarding — display name `Alice` | Public ID shown (e.g. `CA7K9M2X`) |
| 3 | Note Alice's public ID | Copy to clipboard |

### 3. Create User B

| Step | Action | Expected |
|------|--------|----------|
| 1 | Browser 2 → Continue with Google (Account B) | Login succeeds |
| 2 | Complete onboarding — display name `Bob` | Public ID shown |
| 3 | Note Bob's public ID | Copy to clipboard |

### 4. Establish friendship

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Press sidebar `+` → enter Bob's public ID → search → Add friend | Status: pending |
| 2 | Bob | Press sidebar `+` → Pending requests → Accept | Request disappears |
| 3 | Both | Home → see each other in contacts | Both lists show the other friend |

**Checkpoint:** Both users have an accepted friendship. If either contact opens the add-friend dialog instead of chat, the conversation trigger may have failed — stop and investigate DB.

---

## Happy path tests

### HP-1: First message (P0) — maps to H-01

**Goal:** Alice sends the first message; Bob receives it live.

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Home → tap Bob | Opens `/chat/...`; header shows "Bob" |
| 2 | Alice | Type `Hello Bob` → Send | Input clears |
| 3 | Alice | Observe thread | Blue/right bubble: `Hello Bob` |
| 4 | Bob | Home → tap Alice | Opens chat |
| 5 | Bob | Observe thread | Gray/left bubble: `Hello Bob` |
| 6 | Bob | Keep chat open | — |
| 7 | Alice | Send `Second message` | — |
| 8 | Bob | Wait ≤3s, no refresh | New left bubble appears; scroll at bottom |

**Pass:** Bob sees messages without refreshing.  
**Fail:** Bob sees empty thread or must refresh.

---

### HP-2: Two-way conversation (P0) — maps to H-02, H-03

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Both | Both on same chat screen | — |
| 2 | Alice | Send `A1` | Alice right, Bob left |
| 3 | Bob | Send `B1` | Bob right, Alice left |
| 4 | Alice | Send `A2` | Order: A1, B1, A2 |
| 5 | Bob | Send `B2` | Order preserved for both |
| 6 | Both | Compare message order | Identical order on both screens |

**Pass:** Order matches on both sides; correct left/right alignment.  
**Fail:** Missing message, wrong order, or wrong bubble side.

---

### HP-3: Recipient away from chat (P0) — maps to H-07

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Bob | Navigate to Settings (leave chat) | — |
| 2 | Alice | Send `Are you there?` | Appears for Alice |
| 3 | Bob | Home → tap Alice | Message visible immediately |

**Pass:** Message present on entry.  
**Fail:** Message missing until hard refresh.

---

### HP-4: Persistence after reload (P0) — maps to H-08

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Send `Persistence test` | Bubble visible |
| 2 | Alice | Hard refresh (Ctrl+Shift+R) | Same message still visible |
| 3 | Bob | Hard refresh | Same message visible |

**Pass:** History survives reload.  
**Fail:** Messages lost.

---

### HP-5: Contact list updates (P1) — maps to H-09

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Both | Note current home sort order | — |
| 2 | Bob | Send message to Alice (only active thread) | — |
| 3 | Alice | Go to Home | Bob appears at or near top (most recent activity) |

**Pass:** Contact with latest message sorts higher.  
**Fail:** Order unchanged after new message.

---

### HP-6: Empty thread (P1) — maps to H-13

**Precondition:** New accepted pair OR mentally note a fresh thread.

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Open chat with friend, no prior messages | Empty message area |
| 2 | Alice | Send `First ever` | Bubble appears; Bob receives |

**Pass:** Empty state does not block sending.

---

### HP-7: Long and special text (P1) — maps to H-04, H-05, H-10

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Send 300-character paragraph | Full text in bubble |
| 2 | Alice | Send `Emoji 🎉 symbols & <test> "quotes"` | Displayed correctly |
| 3 | Bob | Verify both | Readable, no HTML injection |

**Pass:** Content renders as typed.

---

## Edge case tests

### EC-1: Empty and whitespace input (P0) — maps to E-01, E-02

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Press Send with empty input | Nothing sent; no empty bubble |
| 2 | Alice | Type spaces only → Send | Nothing sent |
| 3 | Alice | Type `  trimmed  ` → Send | Single bubble: `trimmed` |

**Pass:** No empty bubbles; whitespace trimmed.

---

### EC-2: Unauthorized access (P0) — maps to E-10, E-11

**Precondition:** User C (third account) OR logged-out state.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Copy Alice-Bob chat URL from browser address bar | URL format `/chat/{uuid}` |
| 2 | Logged out → paste URL | Redirect to `/login` |
| 3 | User C logged in → paste URL | Redirect to `/home` |

**Pass:** No message content visible to outsider.

---

### EC-3: Invalid conversation URL (P1) — maps to E-13

| Step | Action | Expected |
|------|--------|----------|
| 1 | While logged in, open `/chat/00000000-0000-0000-0000-000000000000` | Redirect to `/home` |
| 2 | Open `/chat/not-a-uuid` | Error page or redirect (not 500 crash) |

**Pass:** Graceful handling.

---

### EC-4: Pending friend cannot chat (P0) — maps to E-12

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | User C | Send friend request to Alice (do not accept) | Pending |
| 2 | C | If chat URL obtainable, try to send | Insert fails / no delivery |
| 3 | Alice | Reject or ignore | — |

**Note:** Pending pairs should not have accepted friendship; chat may not appear on home. Primary guard is RLS on INSERT.

---

### EC-5: Double-click Send (P2) — maps to E-04

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Type `Double` | — |
| 2 | Alice | Double-click Send rapidly | **Record:** 1 or 2 messages |
| 3 | Both | Compare | Document result |

**Known gap:** May produce duplicates. Not a fail until debounce ships — log as known behavior.

---

### EC-6: Tab backgrounded (P1) — maps to E-20

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Bob | Open chat with Alice | — |
| 2 | Bob | Switch to another tab for 30s | — |
| 3 | Alice | Send `Background test` | — |
| 4 | Bob | Switch back to chat tab | Message visible within a few seconds |

**Pass:** No manual refresh needed.  
**Fail:** Message missing until refresh.

---

### EC-7: Leave and re-enter chat (P1) — maps to E-21

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Bob | On chat | — |
| 2 | Bob | Navigate Home | — |
| 3 | Alice | Send `While away` | — |
| 4 | Bob | Re-open chat with Alice | Message present |

**Pass:** Messages sent while away appear on re-entry.

---

### EC-8: 50-message history cap (P1) — maps to E-30

**Precondition:** Thread with 50+ messages (repeat send or DB seed).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send 55 short messages (`Msg 1` … `Msg 55`) | All send successfully |
| 2 | Both hard refresh | Only last 50 visible |
| 3 | Check oldest visible | `Msg 6` or later; `Msg 1`–`Msg 5` not shown |

**Known gap:** Expected until pagination ships. Log as **Known — not a fail**.

---

### EC-9: Over max length (P1) — maps to E-03

| Step | Action | Expected |
|------|--------|----------|
| 1 | Paste 4001+ characters into input | — |
| 2 | Send | INSERT rejected; no new bubble |
| 3 | Input | Stays populated (no clear on error) |

**Pass:** No crash; no message stored.

---

### EC-10: Network interruption (P2) — maps to E-23

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | DevTools → Network → Offline | — |
| 2 | Alice | Send `Offline attempt` | **Record behavior** |
| 3 | Alice | Network → Online | **Record if message appears** |

**Known gap:** No explicit error UI. Document actual behavior for Phase 1.

---

## Test result log (template)

Copy per run:

```
Date:
Tester:
Build: (commit or "local dev")
Environment: localhost / staging

| ID    | Result (Pass/Fail/Known) | Notes |
|-------|--------------------------|-------|
| HP-1  |                          |       |
| HP-2  |                          |       |
| HP-3  |                          |       |
| HP-4  |                          |       |
| HP-5  |                          |       |
| HP-6  |                          |       |
| HP-7  |                          |       |
| EC-1  |                          |       |
| EC-2  |                          |       |
| EC-3  |                          |       |
| EC-4  |                          |       |
| EC-5  |                          |       |
| EC-6  |                          |       |
| EC-7  |                          |       |
| EC-8  |                          |       |
| EC-9  |                          |       |
| EC-10 |                          |       |

Release recommendation: Pass / Fail / Pass with known gaps
```

## Minimum bar for "two people chat seamlessly"

All of these must pass:

- [ ] HP-1 — first message delivers live
- [ ] HP-2 — two-way order and alignment correct
- [ ] HP-3 — recipient receives when not on chat
- [ ] HP-4 — messages survive reload
- [ ] EC-1 — no empty messages
- [ ] EC-2 — no unauthorized access

## Related

- Architecture: [architecture.md](./architecture.md)
- Scenario index: [test-plan.md](./test-plan.md)