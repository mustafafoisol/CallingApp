# UI Shell

Warm chat-first layout using design tokens from `design/README.md`. Messaging uses **Option A · Classic** (sidebar + chat panel); secondary pages use a simple titled shell.

## Design direction

- **Warm palette** — `--chat-bg`, `--chat-sidebar`, `--chat-coral` (see `globals.css`)
- **Option A · Classic** — 340px contacts sidebar + chat panel, max width 1200px
- **Responsive** — split view at `lg:`; mobile shows sidebar *or* chat full-width
- **Font** — Plus Jakarta Sans via `next/font/google`

## Messages shell (Option A)

`apps/web/src/components/messages/messages-shell.tsx`

```
┌──────────────┬────────────────────────────┐
│  Sidebar     │  Chat panel                │
│  Messages    │  Header (friend + actions) │
│  Search      │  Message thread            │
│  Contacts    │  Compose bar               │
│  Settings    │                            │
└──────────────┴────────────────────────────┘
```

| File | Role |
|------|------|
| `messages-shell.tsx` | Split layout wrapper |
| `contacts-sidebar.tsx` | Search, contact list, settings link |
| `sidebar-chrome.tsx` | Messages header, `+` opens add-friend dialog |
| `chat-empty-state.tsx` | Right panel placeholder on `/home` |
| `lib/contacts/load-contacts.ts` | Shared contact + preview loading |

On mobile, `/home` shows the sidebar only; `/chat/[id]` shows the chat panel with a back link to `/home`. At `lg:` both panels are visible.

## App shell (secondary pages)

`apps/web/src/components/app-shell.tsx` — used for `/settings` only. Add friend is a dialog from the messages sidebar (`+` or `?addFriend=1`).

```
┌─────────────────────────┐
│  Header (title)         │
├─────────────────────────┤
│  Main content           │
└─────────────────────────┘
```

## Page inventory

| Page | Shell | Auth |
|------|-------|------|
| `/login` | Standalone centered card | Public |
| `/onboarding` | Standalone centered | Auth (no shell) |
| `/home` | MessagesShell (empty chat panel) | Protected |
| `/chat/[id]` | MessagesShell (sidebar + chat) | Protected |
| `/friends/add` | Redirect → `/home?addFriend=1` | Protected |
| `/settings` | AppShell "Settings" | Protected |

## UI primitives

Located in `apps/web/src/components/ui/`:

| Component | File | Variants |
|-----------|------|----------|
| `Button` | `button.tsx` | default, secondary, danger; sizes sm/lg |
| `Input` | `input.tsx` | Standard text input |
| `Card` | `card.tsx` | Bordered rounded container |

Built with:
- `class-variance-authority` for variant styles
- `clsx` + `tailwind-merge` via `cn()` in `lib/utils.ts`

## Global styles

`apps/web/src/app/globals.css` — Tailwind 4 import + CSS variables for:
- `--background`, `--foreground`
- `--primary`, `--muted`, `--border`, `--danger`, `--accent`

Font: Plus Jakarta Sans via `next/font/google` in root layout.

## PWA metadata (partial)

`apps/web/public/manifest.json` exists with:
- `name`, `short_name`, `description`
- `start_url: /home`
- `display: standalone`
- Theme/background colors
- Icon references (`icon-192.png`, `icon-512.png`)

Service worker not implemented — see [pwa.md](../plans/phase3/pwa.md).

## Chat-specific layout

`ChatView` fills the messages shell right panel (`h-full`, flex column). `ChatHeader` uses `variant="classic"` (no back button on desktop; search + more actions). Received bubbles show a small avatar in classic mode.

## Extension guidelines

| Need | Approach |
|------|----------|
| Sidebar footer link | Add to `contacts-sidebar.tsx` |
| Toasts | Add sonner or similar; wrap in root layout |
| Loading states | `loading.tsx` per route segment |
| Error boundaries | `error.tsx` per route segment |
| Conversation search | Wire sidebar search input (currently placeholder) |