# Task 12 — Docs and Manual Tests

**Milestone:** M9 · **Depends on:** 11 · **Est.:** 2h

## Goal

Ship documentation and a repeatable manual test guide.

## Checklist

- [ ] `architecture/features/voice-calling.md` — file map, flows, APIs, schema
- [ ] `architecture/feature-tests/call/manual-testing.md` — step-by-step two-browser tests
- [ ] Update `architecture/README.md` route/feature index
- [ ] Update `architecture/plans/phase4/voice-video-calling.md` — link to feature-call plan, note voice shipped
- [ ] Mark all tasks `[x]` in `tasks/README.md`
- [ ] Mark milestone exit criteria in [../README.md](../README.md)

## Manual test script (minimum)

1. **HP-1 Happy path** — call, answer, talk 30s, hang up
2. **HP-2 Decline** — callee rejects
3. **HP-3 Missed** — no answer 45s
4. **HP-4 TURN** — one side on hotspot
5. **HP-5 Mute** — mute/unmute during call
6. **HP-6 Chat regression** — send E2EE text after call ends

## Verify

- [ ] New developer can follow manual-testing.md without asking questions
- [ ] `pnpm test` + `pnpm build` pass
- [ ] PR description lists migrations + `METERED_TURN_API_KEY`

## Files

| File | Action |
|------|--------|
| `architecture/features/voice-calling.md` | Create |
| `architecture/feature-tests/call/manual-testing.md` | Create |
| `architecture/README.md` | Update |