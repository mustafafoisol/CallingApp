# Plan: Progressive Web App (PWA)

Make CallingApp installable and usable offline-aware on mobile devices.

## Phase

**Phase 3** — Medium effort; manifest already exists.

## Current state

| Piece | Status |
|-------|--------|
| `manifest.json` | Done — name, icons, theme, `start_url` |
| App icons | Referenced (`icon-192.png`, `icon-512.png`) — verify files exist |
| Service worker | Not implemented |
| Offline support | Not implemented |
| Install prompt | Not implemented |

## Scope

### Phase A — Installable (MVP)
- Add `next-pwa` or custom service worker via `@serwist/next`
- Cache static assets (JS, CSS, fonts, icons)
- Verify manifest links in root layout (already has `manifest: "/manifest.json"`)
- Test "Add to Home Screen" on iOS Safari and Android Chrome

### Phase B — Offline shell
- Cache app shell (login, home layout) for offline viewing
- Show offline banner when `navigator.onLine === false`
- Queue outbound messages in IndexedDB; flush on reconnect (optional stretch)

### Out of scope (initial)
- Full offline chat history
- Background sync for messages

## Implementation steps

1. **Audit icons** — Ensure `apps/web/public/icon-192.png` and `icon-512.png` exist.
2. **Choose library** — `@serwist/next` recommended for Next.js 15 App Router.
3. **Configure** — `next.config.ts` wrapper; exclude API routes from precache.
4. **Register SW** — Client component in root layout or dedicated provider.
5. **Test** — Lighthouse PWA audit score ≥ 90.
6. **Document** — Update [infrastructure.md](../../features/infrastructure.md).

## Files to touch

| File | Change |
|------|--------|
| `apps/web/next.config.ts` | PWA plugin config |
| `apps/web/src/app/layout.tsx` | SW registration |
| `apps/web/public/` | Icons, optional `sw.js` |
| `apps/web/package.json` | Add PWA dependency |

## Acceptance criteria

- [ ] Lighthouse "Installable" passes
- [ ] App opens from home screen to `/home` (or login if logged out)
- [ ] Static assets load from cache on repeat visits
- [ ] API routes and Supabase realtime still work online
- [ ] No stale auth session issues after deploy (versioned cache bust)

## Dependencies

None.

## Estimated effort

**1–2 days** (Phase A)