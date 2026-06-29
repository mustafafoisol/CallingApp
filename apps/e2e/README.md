# E2EE Local Chat — Implementation Plan

End-to-end encrypted, local-only chat for CallingApp. This folder holds the full architecture plan and task breakdown for the migration away from server-stored plaintext messages.

## Status

| Item | State |
|------|-------|
| Architecture | Documented — [architecture/features/e2ee-local-chat.md](../../architecture/features/e2ee-local-chat.md) |
| Implementation | **In progress** — crypto, vault, relay libs, partial session (tasks 00–04 partial; 05–06 pending) |
| Production UI | Still plaintext `messages` until task 05 (UI rewire) |
| Multi-device | Deferred to v2 |

## Documents

| Doc | Description |
|-----|-------------|
| [PLAN.md](./PLAN.md) | Full architecture: crypto, storage, sessions, images, threat model |
| [tasks/README.md](./tasks/README.md) | Task index with dependencies and exit criteria |
| [architecture/features/e2ee-local-chat.md](../../architecture/features/e2ee-local-chat.md) | Shipped vs pending feature doc |

## Summary

- **Today:** Messages live as plaintext in Postgres; server is source of truth.
- **After E2EE:** Decrypted history lives in IndexedDB on the active device only. Server holds public keys and short-lived ciphertext envelopes (relay, not history).
- **Key agreement:** Elliptic Curve Diffie-Hellman (X25519) — only public keys on server.
- **v1:** Single active device. Logout or new login wipes local data. No legacy import.
- **v2 (later):** Multi-device login with encrypted backup or QR transfer.

## Implementation order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
 purge     crypto    vault     session   relay     UI        images    docs
  ~done     done      done      partial   partial   pending   partial   active
```

See [tasks/README.md](./tasks/README.md) for per-task detail.