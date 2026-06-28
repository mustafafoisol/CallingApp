# Plan: Push Notifications

Alert users to new messages and friend requests when the app is in the background.

## Phase

**Phase 3** — Large effort; depends on PWA foundation.

## Problem

Users only see new messages when the chat page is open and subscribed to Realtime. No alerts when tab is backgrounded or app is closed.

## Scope

### In scope
- Web Push via service worker (builds on [pwa.md](./pwa.md))
- Notify on new message when user is not viewing that conversation
- Notify on incoming friend request
- Per-device subscription storage
- Settings toggle to enable/disable notifications

### Out of scope
- Native iOS/Android apps
- Email notifications
- SMS

## Architecture

```mermaid
flowchart LR
  subgraph trigger [Event sources]
    MSG[messages INSERT]
    FR[friendships INSERT pending]
  end

  subgraph backend [Backend]
    EF[Supabase Edge Function or API route]
    VAPID[VAPID keys]
    PUSH[Web Push library]
  end

  subgraph client [Client]
    SW[Service Worker]
    SUB[Push subscription]
  end

  MSG --> EF
  FR --> EF
  EF --> PUSH
  PUSH --> SW
  SUB --> EF
```

## Implementation steps

### 1. Database

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
```

RLS: user can CRUD own subscriptions.

### 2. VAPID keys

Generate once; store in env:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### 3. Client subscription flow

1. Request `Notification.permission`
2. `registration.pushManager.subscribe()` with VAPID public key
3. `POST /api/notifications/subscribe` with subscription JSON

### 4. Send pipeline

**Option A — Supabase Database Webhook → Edge Function**
- On `messages` INSERT: look up recipient subscriptions, send push

**Option B — Next.js API route called from client** (simpler, less reliable)
- Not recommended for production

### 5. Service worker handler

```javascript
self.addEventListener("push", (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    data: { url: data.url },
  });
});

self.addEventListener("notificationclick", (event) => {
  clients.openWindow(event.notification.data.url);
});
```

### 6. Settings UI

Toggle in settings; on disable, delete subscriptions.

## Acceptance criteria

- [ ] User can opt in to notifications
- [ ] New message push opens correct `/chat/:id`
- [ ] Friend request push opens `/friends/add`
- [ ] No notification when user is actively viewing that chat
- [ ] Unsubscribe works
- [ ] iOS 16.4+ PWA push supported (with caveats documented)

## Dependencies

- [pwa.md](./pwa.md) — service worker required

## Estimated effort

**3–5 days**