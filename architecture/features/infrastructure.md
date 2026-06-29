# Infrastructure

Build pipeline, deployment, environment, cron jobs, and testing.

## Monorepo scripts

Root `package.json`:

| Script | Command | Effect |
|--------|---------|--------|
| `dev` | `pnpm --filter @calling-app/web dev` | Next.js dev server (:3000) |
| `build` | `pnpm -r build` | Core tsc → Next production build |
| `test` | `pnpm -r test` | Vitest in core + web |
| `lint` | `pnpm -r lint` | ESLint |
| `typecheck` | `pnpm -r typecheck` | `tsc --noEmit` |

**Node requirement:** `>=20`

## Deployment target

**Vercel** — `apps/web` is the deployable app.

`apps/web/vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/keep-alive",
    "schedule": "0 12 * * 1"
  }]
}
```

Runs every Monday at 12:00 UTC.

## Keep-alive cron

**Purpose:** Ping Supabase on a schedule to prevent free-tier project pausing from inactivity.

**Endpoint:** `GET /api/cron/keep-alive`

**Auth:**
- If `CRON_SECRET` is set, requires `Authorization: Bearer {CRON_SECRET}`
- Vercel cron sends this header automatically when configured

**Logic:**
1. If `SUPABASE_SERVICE_ROLE_KEY` missing → return `{ ok: true, skipped: "missing supabase env" }`
2. Else create service-role Supabase client
3. `SELECT id FROM profiles LIMIT 1`
4. Return `{ ok: !error, error: null }`

**File:** `apps/web/src/app/api/cron/keep-alive/route.ts`

## Environment

Copy `.env.example` → `apps/web/.env.local`:

| Variable | Client exposure | Purpose |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | RLS-scoped client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Cron + admin operations |
| `CRON_SECRET` | Server only | Cron endpoint protection |
| `METERED_TURN_API_KEY` | Server only | Metered credential API key for `/api/turn` |
| `METERED_TURN_APP_NAME` | Server only | Metered app subdomain (e.g. `callingapp` → `callingapp.metered.live`) |

Never commit `.env.local`.

### Metered.ca TURN setup

1. Sign up at [metered.ca](https://www.metered.ca/).
2. Dashboard → create or open your TURN app → note the **app name** (subdomain before `.metered.live`).
3. Next to the TURN credential, click **Show API Key** — this is `METERED_TURN_API_KEY` (credential-scoped; safe to pass through the server proxy).
4. Add to `apps/web/.env.local`:
   ```
   METERED_TURN_API_KEY=<credential-api-key>
   METERED_TURN_APP_NAME=<app-name>
   ```
5. Do **not** use the Dashboard → Developers **Secret Key** in the browser; keep it server-side only if you use other Metered admin APIs.

**Endpoint:** `GET /api/turn` (authenticated). Returns `{ iceServers: RTCIceServer[] }`. Server fetches short-lived credentials from `https://<appname>.metered.live/api/v1/turn/credentials?apiKey=...` and merges Google STUN.

**Dev without keys:** Returns STUN-only with a `warning` field — same-LAN testing only.

**File:** `apps/web/src/app/api/turn/route.ts`

## Testing

### Core (`packages/core`)

Vitest tests for:
- `public-id.ts` — generation, validation, normalization
- `conversation.ts` — canonicalization, participant checks

### Web (`apps/web`)

Vitest tests for:
- `lib/profile.ts` — `generateUniquePublicId` with mocked exists check

**Run:** `pnpm test` from repo root.

## Build verification

```bash
pnpm build   # Must pass before deploy
pnpm lint    # ESLint via next lint
```

Production build output includes all app routes and API handlers, including `GET /api/turn` for voice-call ICE servers.

## Supabase setup checklist

1. Create Supabase project
2. Run `supabase/migrations/20250625000001_initial_schema.sql` in SQL editor
3. Enable Google auth provider
4. Add site URL and redirect URLs
5. Copy URL + anon key to `.env.local`
6. (Optional) Add service role key for cron

## Observability gaps

| Gap | Suggested plan |
|-----|----------------|
| No structured logging | Add pino or Vercel log drains |
| No error tracking | Sentry integration |
| No analytics | PostHog or Plausible |
| No uptime monitoring | Better Stack / Pingdom on `/api/cron/keep-alive` |

## CI recommendation (not yet implemented)

```yaml
# Suggested GitHub Actions
- pnpm install
- pnpm test
- pnpm build
- pnpm lint
```

Add to [plans](../plans/README.md) if implementing.