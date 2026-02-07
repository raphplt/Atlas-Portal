# Atlas Portal

Atlas Portal is a premium multi-tenant client portal for freelance projects.

## Monorepo structure

- `apps/web`: Next.js 16 frontend (FR/EN, shadcn-style UI, Tailwind v4)
- `apps/api`: NestJS 11 API (TypeORM, Postgres, JWT, RBAC, Stripe, R2, Brevo email)
- `packages/shared`: shared enums/contracts
- `infra/`: deployment files (Docker/Nginx)

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Start Postgres in Docker:

```bash
docker compose up -d --build
```

4. Start API + frontend with Turbo:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

## Database migrations

```bash
pnpm --filter api migration:run
pnpm --filter api migration:revert
```

## Quality checks

```bash
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web lint
pnpm --filter web check-types
pnpm build
```

## Production deployment

### API (VPS)

- Build image using `apps/api/Dockerfile`
- Run with `infra/docker/docker-compose.prod.yml`
- Put Nginx reverse proxy config from `infra/nginx/atlas-portal.conf`
- Configure TLS with Let's Encrypt/certbot

### Web (Vercel)

- Deploy `apps/web`
- Set `NEXT_PUBLIC_API_BASE_URL=https://atlas-portal.raphael-plassart.com`
- Ensure locale routes (`/fr/*`, `/en/*`) are enabled

## Core security and domain guarantees

- Password hashing with `argon2`
- DTO validation (`class-validator`) + strict backend guards
- RBAC: `ADMIN` / `CLIENT`
- Workspace isolation on all core resource access
- Ticket workflow with backend-enforced status transitions
- Stripe webhook signature verification + idempotency table (`stripe_events`)
- File uploads via signed URLs (Cloudflare R2)
