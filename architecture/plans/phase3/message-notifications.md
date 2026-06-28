# Plan: In-App Message Notifications

Alert users when new messages arrive while the app is open — via unread badges, live home updates, and optional browser notifications when the tab is hidden.

## Phase

**Phase 3** — Medium effort; builds on [unread-and-read-state.md](./unread-and-read-state.md). Deferred from Phase 1.

## Problem

Today, message awareness is **page-local**:

- [ChatView](../../../apps/web/src/app/(app)/chat/[id]/chat-view.tsx) subscribes to Realtime only for the open conversation
- [Home](../../../apps/web/src/app/(app)/home/page.tsx) is SSR-only; it does not update when a message arrives on another route
- No unread badges, no tab title change, no OS-level alert when the user is on `/settings` or the tab is in the background

Users miss new messages unless they are already inside that chat.

## Tiered notification model

| Tier | When | Mechanism | User sees |
|------|------|-----------|-----------|
| **In-app (this doc)** | App open (any route) | Global Realtime listener + React state | Unread badge, preview/time reorder on home, optional `document.title` prefix |
| **Tab hidden** | Tab open but not focused | Browser [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification) | OS toast from the still-loaded page |
| **Background push** | Tab closed or PWA not in foreground | Web Push via service worker | See [notifications.md](./notifications.md) |

## Scope

### In scope

- Global Realtime subscription for incoming messages (all conversations the user participates in)
- Live updates on `/home`: last preview, `lastMessageAt`, sort order, unread badge
- Unread badge on contact rows (data from [unread-and-read-state.md](./unread-and-read-state.md))
- Suppression when user is actively viewing that conversation
- Optional browser `Notification` when tab is hidden and message is for another conversation
- `document.title` indicator when total unread > 0 (e.g. `(2) CallingApp`)
- Single app-level provider mounted in `(app)` layout

### Out of scope

- Service worker / Web Push / VAPID / `push_subscriptions` table → [notifications.md](./notifications.md)
- Friend-request notifications
- Sound / vibration
- Per-device notification settings UI (full toggle in [notifications.md](./notifications.md); may use `localStorage` for browser toasts on/off here)
- Notifications when app is fully closed

## Suppression rules

Do **not** surface an alert (badge increment, browser toast, title bump) when:

1. Incoming message `sender_id !== currentUserId`, **and**
2. User is on `/chat/[conversationId]` for that message's `conversation_id`

**Mark read:** Opening a chat upserts `conversation_reads` per [unread-and-read-state.md](./unread-and-read-state.md); the global listener clears local unread for that conversation.

## Implementation steps

### 1. Schema & read state (prerequisite)

Implement [unread-and-read-state.md](./unread-and-read-state.md) first.

### 2. Provider, home live updates, chat integration

See full architecture in git history of this doc; key files:

- `apps/web/src/components/notifications/message-notification-provider.tsx`
- `apps/web/src/contexts/active-conversation-context.tsx`
- `apps/web/src/components/contacts/contacts-list.tsx`

## Acceptance criteria

- [x] Message to another conversation increments unread badge on home without refresh
- [x] Home preview and sort order update live when a new message arrives
- [x] No badge/toast/title change while user is viewing that conversation
- [x] Opening a chat clears unread for that conversation (UI + DB)
- [ ] With tab hidden and permission granted, browser toast appears for messages in non-active chats
- [x] `document.title` shows total unread count when > 0
- [x] Global channel unsubscribes on logout

## Dependencies

- [unread-and-read-state.md](./unread-and-read-state.md) — **implement first**
- Phase 1 chat MVP shipped
- Supabase Realtime on `messages` (already published)

## Downstream

- [notifications.md](./notifications.md) — Web Push when app backgrounded/closed
- [group-chat.md](../phase2/group-chat.md) — fan-out to all group members

## Estimated effort

**1–2 days** (after unread-and-read-state)