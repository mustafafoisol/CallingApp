# UI Shell

Mobile-first layout, navigation, and reusable UI primitives.

## Design direction

- **Dark theme** — background `#0b1020`, card surfaces, blue primary accent
- **Mobile-first** — max width `max-w-lg`, full viewport height (`min-h-dvh`)
- **Sticky chrome** — header top, nav bottom, scrollable main content

## App shell

`apps/web/src/components/app-shell.tsx`

```
┌─────────────────────────┐
│  Header (title)         │  sticky top
├─────────────────────────┤
│                         │
│  Main content           │  flex-1, scrollable
│                         │
├─────────────────────────┤
│  Home | Add | Settings  │  sticky bottom nav
└─────────────────────────┘
```

### Bottom navigation

| Label | Route | Icon |
|-------|-------|------|
| Home | `/home` | `Home` |
| Add | `/friends/add` | `UserPlus` |
| Settings | `/settings` | `Settings` |

## Page inventory

| Page | Shell | Auth |
|------|-------|------|
| `/login` | Standalone centered card | Public |
| `/onboarding` | Standalone centered | Auth (no shell) |
| `/home` | AppShell "Contacts" | Protected |
| `/friends/add` | AppShell "Add Friend" | Protected |
| `/chat/[id]` | AppShell (friend name) | Protected |
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

Font: Geist Sans via `next/font/google` in root layout.

## PWA metadata (partial)

`apps/web/public/manifest.json` exists with:
- `name`, `short_name`, `description`
- `start_url: /home`
- `display: standalone`
- Theme/background colors
- Icon references (`icon-192.png`, `icon-512.png`)

Service worker not implemented — see [pwa.md](../plans/phase3/pwa.md).

## Chat-specific layout

`ChatView` uses `h-[calc(100dvh-7rem)]` to account for shell header + bottom nav within the chat page.

## Extension guidelines

| Need | Approach |
|------|----------|
| New tab | Add to `navItems` in `app-shell.tsx` |
| Toasts | Add sonner or similar; wrap in root layout |
| Loading states | `loading.tsx` per route segment |
| Error boundaries | `error.tsx` per route segment |
| Responsive desktop | Widen `max-w-lg` or add sidebar at `md:` breakpoint |