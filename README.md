# CallingApp

Free, web-first **1-on-1 chat** app. Sign in with Google, get a shareable user ID, add friends, and exchange real-time text messages.

## Features

- **Google authentication** — OAuth via Supabase
- **Profiles** — Display name + unique public ID (e.g. `CA7K9M2X`)
- **Friends** — Add by public ID, accept/reject requests
- **Realtime chat** — 1-on-1 text messaging with live delivery
- **Contacts home** — Friends sorted by recent activity

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | Supabase (Postgres, Auth, Realtime) |
| Monorepo | pnpm workspaces |

## Quick start

### Prerequisites

- Node.js 20+
- pnpm
- Supabase project

### 1. Clone and install

```bash
git clone https://github.com/mustafafoisol/CallingApp.git
cd CallingApp
pnpm install
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/20250625000001_initial_schema.sql` in the SQL editor
3. Enable **Google** under Authentication → Providers
4. Add redirect URL: `http://localhost:3000/auth/callback`

### 3. Environment

Copy `.env.example` to `apps/web/.env.local` and fill in your Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=optional-for-local-dev
```

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm lint` | ESLint |

## Project structure

```
CallingApp/
├── apps/web/              Next.js application
├── packages/core/         Shared types and utilities
├── supabase/migrations/   Database schema
└── architecture/          Feature docs, plans, and test guides
```

## Documentation

- [Architecture overview](architecture/README.md)
- [Completed features](architecture/features/)
- [Rollout plans (phased)](architecture/plans/)
- [Chat manual testing](architecture/feature-tests/chat/manual-testing.md)
- [Chat troubleshooting](architecture/feature-tests/chat/troubleshooting.md)

## Testing chat locally

Use two browsers (or normal + incognito) with two Google accounts. Add each other as friends, then open a contact from Home. See the [manual testing guide](architecture/feature-tests/chat/manual-testing.md).

## License

Private — all rights reserved.