# gitflex

Evidence-based developer profiles built from GitHub repositories. See [`.docs/spec.md`](.docs/spec.md) for the product and architecture specification.

## Stack

- **Bun** workspaces + **Turborepo**
- **Next.js** (App Router) web app, including Better Auth route handlers and server actions
- **Worker** — independent Bun process for background analysis (BullMQ)
- **Better Auth** with GitHub OAuth, OAuth tokens encrypted at rest
- **Drizzle ORM** + **PostgreSQL**, migrations only
- **Redis** for queues
- **Varlock** for typed, validated environment configuration
- **Biome** via Ultracite for linting and formatting
- **shadcn/ui** primitives in `packages/ui`

## Getting Started

```bash
bun install
```

### Infrastructure

Use hosted Postgres/Redis, or start local ones:

```bash
docker compose up -d
```

### Environment

Schemas (`.env.schema`) are committed; values live in git-ignored `.env` files next to them.

| File | Variables |
| --- | --- |
| `.env` (root) | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL` |
| `apps/web/.env` | `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

Apps import shared values from the root schema with `@import(../../, pick=[...])`. Validate with `bunx varlock load` from the app directory.

Create a GitHub OAuth app with the callback URL `http://localhost:3001/api/auth/callback/github`.

### Database

```bash
bun run db:migrate
```

After changing the schema, run `bun run db:generate` and commit the generated migration. Migrations use `DATABASE_URL_UNPOOLED`.

### Run

```bash
bun run dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- Worker health: [http://localhost:3002/health](http://localhost:3002/health)

## Project Structure

```
gitflex/
├── apps/
│   ├── web/         # Next.js app (UI, auth routes, server actions)
│   └── worker/      # Background worker (queues, analysis)
├── packages/
│   ├── auth/        # Better Auth configuration
│   ├── config/      # Shared TypeScript config
│   ├── db/          # Drizzle schema, relations, migrations
│   └── ui/          # Shared shadcn/ui components and styles
```

## Scripts

- `bun run dev` — start web and worker
- `bun run dev:web` / `bun run dev:worker` — start one app
- `bun run build` — build all apps
- `bun run check-types` — type-check all packages
- `bun run check` / `bun run fix` — lint and format
- `bun run db:generate` — generate a migration from schema changes
- `bun run db:migrate` — apply migrations
- `bun run db:studio` — open Drizzle Studio
- `bun run auth:generate` — regenerate the Better Auth schema after changing auth options

## UI

Shared primitives live in `packages/ui`. Add more with:

```bash
npx shadcn@latest add dialog table -c packages/ui
```

```tsx
import { Button } from "@gitflex/ui/components/button";
```
