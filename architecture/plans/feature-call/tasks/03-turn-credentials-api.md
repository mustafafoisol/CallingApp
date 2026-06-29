# Task 03 — TURN Credentials API

**Milestone:** M3 · **Depends on:** 00 · **Est.:** 2h

## Goal

Server route that returns short-lived ICE server config (STUN + TURN).

## Checklist

- [ ] `GET /api/turn` (or POST) — authenticated only
- [ ] Read `METERED_TURN_API_KEY` from env (server-only)
- [ ] Return `{ iceServers: RTCIceServer[] }` JSON
- [ ] Cache credentials client-side ~1h (Metered TTL)
- [ ] Document env in `.env.example` and `architecture/features/infrastructure.md`
- [ ] Graceful error when key missing (dev: STUN-only fallback with console warning)

## Response shape

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "turn:...", "username": "...", "credential": "..." }
  ]
}
```

## Verify

- [ ] Logged-in fetch returns 200 with `iceServers`
- [ ] Unauthenticated returns 401
- [ ] Missing API key: dev STUN-only still allows same-machine test

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/api/turn/route.ts` | Create |
| `.env.example` | Update |