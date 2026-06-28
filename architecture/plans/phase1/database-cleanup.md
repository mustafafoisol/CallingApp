# Plan: Database Cleanup

Remove legacy calling schema left over after voice/video feature removal.

## Phase

**Phase 1** — Small effort, reduces confusion for future development.

## Problem

Initial migration created a `calls` table with RLS policies and realtime publication. Migrations 002–003 added call realtime and SDP columns. No application code references these anymore.

Orphaned artifacts:
- Table `public.calls`
- Columns `offer_sdp`, `answer_sdp` (migration 003)
- RLS policies on `calls`
- `calls` in `supabase_realtime` publication
- Migrations `20250625000002_realtime_calls.sql`, `20250625000003_call_signaling.sql`

## Scope

### In scope
- New migration `20250627000001_drop_calls.sql` that:
  - Removes `calls` from realtime publication
  - Drops `calls` table (CASCADE policies)
- Update [data-model-and-security.md](../../features/data-model-and-security.md) to remove legacy notes
- Archive or delete migrations 002–003 from docs (files can remain for history)

### Out of scope
- Changing `messages`, `friendships`, or other active tables

## Migration sketch

```sql
-- Remove from realtime publication
alter publication supabase_realtime drop table if exists public.calls;

-- Drop table (policies drop with it)
drop table if exists public.calls;
```

## Acceptance criteria

- [x] Migration runs cleanly on fresh and existing databases
- [x] `pnpm build` passes
- [x] No code references `calls` table
- [x] Feature doc updated

## Risks

| Risk | Mitigation |
|------|------------|
| Existing production has call history | Confirm no data worth keeping; export first if needed |
| Migration order on fresh install | New migration only; 002–003 become no-ops if 001+drop run |

## Estimated effort

**1–2 hours**