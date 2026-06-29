# Voice Call — Task Index

Work top-to-bottom. Check `[x]` when task **Verify** section passes.

| # | Task | Milestone | Depends | Est. | Status |
|---|------|-----------|---------|------|--------|
| 00 | [00-scope-and-spec](./00-scope-and-spec.md) | M0 | — | 1h | [x] |
| 01 | [01-restore-calls-schema](./01-restore-calls-schema.md) | M1 | 00 | 2h | [ ] |
| 02 | [02-core-types-state-machine](./02-core-types-state-machine.md) | M2 | 01 | 3h | [ ] |
| 03 | [03-turn-credentials-api](./03-turn-credentials-api.md) | M3 | 00 | 2h | [ ] |
| 04 | [04-signaling-layer](./04-signaling-layer.md) | M3 | 01, 02 | 4h | [ ] |
| 05 | [05-webrtc-audio-session](./05-webrtc-audio-session.md) | M4 | 03, 04 | 5h | [ ] |
| 06 | [06-call-session-orchestrator](./06-call-session-orchestrator.md) | M4 | 05 | 4h | [ ] |
| 07 | [07-outgoing-call-flow](./07-outgoing-call-flow.md) | M5 | 06 | 3h | [ ] |
| 08 | [08-call-overlay-ui](./08-call-overlay-ui.md) | M5 | 07 | 4h | [ ] |
| 09 | [09-incoming-call-listener](./09-incoming-call-listener.md) | M6 | 04, 08 | 4h | [ ] |
| 10 | [10-in-call-controls](./10-in-call-controls.md) | M7 | 08, 09 | 3h | [ ] |
| 11 | [11-edge-cases-hardening](./11-edge-cases-hardening.md) | M8 | 10 | 4h | [ ] |
| 12 | [12-docs-and-manual-tests](./12-docs-and-manual-tests.md) | M9 | 11 | 2h | [ ] |

## Milestone checkpoints

### M0 — Scope
- [x] Task 00 complete

### M1 — Schema
- [ ] Task 01 complete
- [ ] `calls` in `supabase_realtime` on remote

### M2 — Core libs
- [ ] Task 02 complete
- [ ] `pnpm test` passes in `packages/core`

### M3 — Signaling
- [ ] Tasks 03–04 complete
- [ ] Callee sees ring event without WebRTC

### M4 — WebRTC audio
- [ ] Tasks 05–06 complete
- [ ] Two tabs hear each other

### M5 — Outgoing UI
- [ ] Tasks 07–08 complete
- [ ] Call from chat header works (caller side)

### M6 — Incoming UI
- [ ] Task 09 complete
- [ ] Callee can answer from any page

### M7 — In-call UX
- [ ] Task 10 complete
- [ ] Mute + hang up both sides

### M8 — Hardening
- [ ] Task 11 complete
- [ ] Missed / reject / timeout manual scenarios pass

### M9 — Ship
- [ ] Task 12 complete
- [ ] Feature doc + manual test guide in `architecture/`

## Global exit criteria (v1 voice)

- [ ] Voice call between two accepted friends
- [ ] Outgoing + incoming + in-call UI
- [ ] Mute and hang up
- [ ] Calls work across NAT (TURN verified)
- [ ] `pnpm test` and `pnpm build` pass
- [ ] No regressions to E2EE chat