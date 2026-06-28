# Feature Tests

Manual and scenario-based test documentation for CallingApp features. Use these guides to verify behavior before releases and when implementing phase plans.

| Feature | Architecture | Test plan | Manual guide |
|---------|--------------|-----------|--------------|
| Realtime Chat | [chat/architecture.md](./chat/architecture.md) | [chat/test-plan.md](./chat/test-plan.md) | [chat/manual-testing.md](./chat/manual-testing.md) |

**Broken chat?** → [chat/troubleshooting.md](./chat/troubleshooting.md)

## How to use

1. Read the **architecture** doc to understand data flow and constraints.
2. Use the **test plan** for scenario coverage and priority.
3. Execute the **manual testing** checklist with two real accounts (two browsers or one normal + one incognito).

## Prerequisites for chat tests

- Supabase project running with migration `20250625000001_initial_schema.sql`
- `apps/web/.env.local` configured
- App running: `pnpm dev` → http://localhost:3000
- **Two Google accounts** (User A and User B), each onboarded with display name and public ID
- User A and User B are **accepted friends** (conversation auto-created on accept)

## Conventions

| Symbol | Meaning |
|--------|---------|
| **P0** | Must pass — blocks release |
| **P1** | Should pass — important UX |
| **P2** | Nice to verify — edge or polish |
| User A / User B | Two distinct authenticated users in a friendship |