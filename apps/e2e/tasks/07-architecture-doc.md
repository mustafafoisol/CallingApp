# Task 07 — Architecture Documentation

## Goal

Canonical feature doc in `architecture/features/` reflecting shipped E2EE behavior. Link from `apps/e2e/`.

## Subtasks

### 7.1 Feature doc

- [ ] Create `architecture/features/e2ee-local-chat.md`
- [ ] Sections: overview, threat model, crypto, storage, sessions, images, deferred features
- [ ] Mermaid diagrams for send flow and session replace
- [ ] Document v1 limitations (no forward secrecy, no multi-device, no backup)

### 7.2 Update related docs

- [ ] Add deprecation note to `architecture/features/data-model-and-security.md` messages section
- [ ] Update `architecture/features/realtime-chat.md` for envelope-based delivery
- [ ] Update `architecture/README.md` with link to E2EE feature

### 7.3 Update apps/e2e status

- [ ] Mark tasks complete in `apps/e2e/tasks/README.md`
- [ ] Update `apps/e2e/README.md` status to "Implemented"

### 7.4 Manual test checklist

- [ ] Add `architecture/feature-tests/e2ee/manual-testing.md`
- [ ] Cases: send/receive, offline catch-up, logout wipe, new device, session replace, image expiry

## Files

| File | Action |
|------|--------|
| `architecture/features/e2ee-local-chat.md` | Create |
| `architecture/features/data-model-and-security.md` | Update |
| `architecture/features/realtime-chat.md` | Update |
| `architecture/feature-tests/e2ee/manual-testing.md` | Create |
| `apps/e2e/README.md` | Update status |

## Exit criteria

- [ ] Feature doc matches implemented behavior
- [ ] Threat model honestly states what is and isn't protected
- [ ] Manual test checklist covers all v1 flows
- [ ] No blocking `_TBD_` entries in open questions