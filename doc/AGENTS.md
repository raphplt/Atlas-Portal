# Atlas Portal — AGENTS.md

> **Purpose**: This document defines the engineering standards and non-negotiable constraints for all AI agents (and humans) contributing code to **Atlas Portal**.  
> Goal: **professional-grade**, **clean**, **secure**, **scalable**, **evolutive**, and **deployment-ready** code.  
> **No mocks, no half implementations, no “TODO later” in critical paths.**

---

## 0) Product Context (1-liner)

Atlas Portal is a premium client portal for freelance projects: project dashboard, kanban (core tasks + ticket-driven tasks), tickets, files, messaging, payments, and email notifications — **multi-admin ready**.

---

## 1) Non-Negotiables (Read first)

### 1.1 Professional readiness

- Every merged feature must be **production-ready**:
  - no mock data
  - no placeholder logic
  - no incomplete “later” branches
  - error handling must be real
  - permissions must be enforced server-side

### 1.2 Frontend constraints

- **Internationalization (i18n)** is mandatory.
  - Languages supported initially: **FR** and **EN**
  - All user-facing strings must be translatable (no hardcoded UI text).
- UI must be based on:
  - **shadcn/ui**
  - **Tailwind CSS**
  - The theme defined in the **global CSS** must be respected (no ad-hoc colors).
- **No pagination in frontend**.
  - If a list can grow, implement backend-side filtering/limits/search/sorting.
  - Frontend should use **infinite scroll** or **“Load more”** only if needed (still no numbered pagination UI).
- Business logic should live in the **backend** whenever possible and relevant.
  - Frontend = presentation + minimal orchestration.
  - Backend = validation, invariants, calculations, permissions, workflows, status transitions.

### 1.3 Backend constraints

- Security is first-class:
  - Use **argon2** (not bcrypt) for password hashing.
  - Use well-known, maintained, standard libs and best practices.
- Strict authorization:
  - Multi-tenant boundaries **must** be enforced (workspace isolation).
  - Always validate `workspace_id` access on every relevant operation.
- Everything must be **dockerized**, especially the API, and **deployment-ready**.

### 1.4 Deployment constraints

- Frontend: **Vercel**
- API: hosted on existing **VPS**
- Domain/subdomain target:
  - preferred: `atlas-portal.raphael-plassart.com`
  - alternative if needed: `portal.raphael-plassart.com`
- Code must include deployment configs:
  - Dockerfiles
  - docker-compose (dev/prod as needed)
  - environment variable templates
  - healthchecks

---

## 2) Architecture & Code Quality Standards

### 2.1 Monorepo recommendation (preferred)

A monorepo is recommended for shared types and consistency:

- `apps/web` (Next.js)
- `apps/api` (NestJS)
- `packages/shared` (types, zod schemas, constants)
- `infra/` (docker, nginx, scripts)

If not monorepo, shared contracts must still be versioned and consistent.

### 2.2 Strong typing & validation

- Prefer **TypeScript everywhere**.
- Backend DTOs must be validated using:
  - `class-validator` + `class-transformer` (Nest best practice)
- Frontend should validate forms with **zod** (optional but recommended).
- No “any” types unless justified and isolated.

### 2.3 Clean code expectations

- Small focused modules, clear naming, no “god files”.
- Prefer composition over cleverness.
- Every feature must include:
  - clear domain models
  - clear API contracts
  - clear error cases
- Avoid duplication; create shared utilities where appropriate.

### 2.4 Testing expectations

- Backend:
  - Unit tests for core services (status transitions, permission checks)
  - Integration tests for critical flows (auth, payments webhooks, file upload auth)
- Frontend:
  - At least smoke tests for critical pages/components if feasible.
- No merging critical features without tests unless explicitly waived.

---

## 3) Data Model / Domain Rules (Must respect)

### 3.1 Multi-tenant model

Everything is scoped by `workspace_id`.

- A **Workspace** contains admins, clients, projects.
- Every resource must be linked to workspace:
  - projects, tickets, tasks, messages, files, payments, audit events

**Rule**: No cross-tenant access is possible by design.

### 3.2 Tasks vs Tickets (critical distinction)

There are **two categories**:

1. **Core Project Tasks**

- created by admin
- exist from the start
- represent project phases/work items
- client can only view

2. **Ticket-derived Tasks**

- created only after a client ticket is accepted (and paid if required)
- typically after delivery / out-of-scope improvements

**Implementation rule**:

- Use a unified `tasks` entity (for kanban) with `source = CORE | TICKET`
- Tickets are separate and can be converted to tasks.

### 3.3 Status machines (enforce in backend)

- Tickets have explicit states (ex: `OPEN`, `NEEDS_INFO`, `ACCEPTED`, `REJECTED`, `PAYMENT_REQUIRED`, `PAID`, `CONVERTED`)
- Tasks have explicit states/columns (kanban): backlog, in_progress, blocked_by_client, done, etc.
- Only backend can change statuses; frontend only requests.

---

## 4) Frontend Requirements (Next.js)

### 4.1 i18n (FR/EN)

- Must support locale routing and switching.
- All copy must use translation keys.
- Date/number formatting must be locale-aware.

**No hardcoded strings** in UI components.

### 4.2 UI/UX

- shadcn/ui components first.
- Tailwind utility classes.
- Use theme tokens from global CSS (e.g. `bg-background`, `text-foreground`, etc.).
- Consistent layout primitives:
  - responsive containers
  - predictable spacing
  - accessible components (aria labels where needed)

### 4.3 No frontend pagination

- Provide list endpoints with:
  - `limit` (reasonable default + max cap)
  - filters (status, type, date range)
  - sorting (created_at desc default)
  - optional cursor-based pagination internally (API), but the frontend should not expose “pages”.

### 4.4 Frontend should not contain business logic

Examples of logic that belongs in backend:

- whether a user can convert a ticket to a task
- payment status interpretation
- permissions (admin/client)
- derived statuses, progress %
- audit timeline generation rules

Frontend may do:

- UI state
- client-side form validation
- optimistic updates only when safe (and rollback on error)

---

## 5) Backend Requirements (NestJS)

### 5.1 Security baseline

Use standard security practices:

- Password hashing: **argon2**
- Input validation: DTO validation everywhere
- Authentication:
  - JWT access + refresh tokens (or session-based), secure defaults
- Authorization:
  - RBAC (ADMIN/CLIENT)
  - Workspace-based checks in guards/services
- Rate limiting:
  - login endpoints
  - upload endpoints
  - sensitive operations
- Secure headers (via reverse proxy or Nest middleware)
- Strict CORS config (Vercel domain + subdomain)

### 5.2 API design

- REST is fine (GraphQL optional but not required).
- Use consistent resource naming:
  - `/workspaces/:id/...` (optional in path) OR infer from token + enforce in backend.
- Prefer explicit “command endpoints” for transitions:
  - `POST /tickets/:id/accept`
  - `POST /tickets/:id/request-payment`
  - `POST /tickets/:id/convert-to-task`
- Always return typed error responses with clear codes.

### 5.3 File storage (Cloudflare)

- Private storage with signed URLs.
- Never expose raw bucket paths publicly.
- Enforce:
  - max file size
  - allowed MIME types
  - per-workspace isolation in object keys
- Keep metadata in DB:
  - owner, project, ticket/message linkage, size, contentType, checksum (optional)

### 5.4 Stripe

- Payments must be created server-side.
- Webhooks must be verified via Stripe signature.
- Payment status in DB must be updated from webhook events only.
- Never trust frontend “paid” state.

### 5.5 Email provider

- Use a provider suited for volume/deliverability: SendGrid/Mailgun/Postmark.
- Email templates must support i18n (FR/EN).
- Trigger emails from backend events (ticket/message/payment/file upload).

### 5.6 Observability

- Structured logs (JSON) preferred.
- Request IDs / correlation IDs recommended.
- Health endpoint required: `/health`
- Optional: metrics endpoint.

---

## 6) Docker & Deployment

### 6.1 Dockerization

- API must have:
  - `Dockerfile` (multi-stage preferred)
  - `docker-compose.yml` for local dev (API + Postgres + optional Redis)
- Provide `.env.example` for both apps.
- Healthchecks and restart policies where relevant.

### 6.2 VPS hosting (API)

- Provide production compose file or deployment docs:
  - `docker compose up -d`
  - Nginx reverse proxy config (recommended)
  - TLS via Let’s Encrypt (certbot) or equivalent
- Ensure:
  - CORS is correct
  - cookies/JWT security settings match HTTPS
  - webhook endpoints reachable from Stripe

### 6.3 Vercel (Web)

- Use environment variables (no secrets in repo).
- Set API base URL to the subdomain.
- Ensure i18n routing works with Vercel.

---

## 7) Conventions & Tooling

### 7.1 Formatting & linting

- ESLint + Prettier enforced.
- Strict TS config.
- Conventional commits recommended.

### 7.2 Git hygiene

- Small PRs.
- Every PR includes:
  - description
  - screenshots (frontend)
  - how to test locally
- No direct commits to main.

### 7.3 Naming conventions

- Domain-driven names:
  - `Ticket`, `Task`, `Project`, `Workspace`, `Payment`, `Message`, `FileAsset`
- Avoid ambiguous terms.

---

## 8) “Definition of Done” (DoD)

A feature is done only if:

- Backend:
  - validated inputs
  - auth + RBAC enforced
  - workspace isolation guaranteed
  - errors handled
  - logs present
- Frontend:
  - i18n strings complete (FR/EN)
  - UI uses shadcn + theme tokens
  - no hardcoded copy
  - accessible basics covered
- Infra:
  - docker builds succeed
  - env templates updated
  - deploy-ready

---

## 9) Extra Recommendations (High value)

- Add an **Audit Log** table for critical actions (ticket accepted, payment received, file uploaded).
- Add **idempotency** for Stripe and webhooks handling.
- Prefer **cursor-based** list endpoints even if frontend doesn’t show pagination.
- Add **soft delete** for files/tickets where relevant.
- Enforce **max limits** on list endpoints to prevent accidental huge payloads.

---

## 10) Open Questions (only if blocking)

If a decision is required, ask only when truly blocking:

- exact i18n library choice (next-intl vs next-i18next)
- auth strategy details (JWT refresh rotation vs sessions)
- storage choice detail (Cloudflare R2 vs Cloudflare Images)

Otherwise, implement reasonable defaults consistent with these standards.

---

**Remember**: This is a premium internal product. Treat every line like it will be audited by a senior engineer and used by real paying clients tomorrow.
