# Atlas Portal - Happy Path / TODO

## Happy Path implemented

- [x] Admin registration (`POST /auth/register-admin`) with auto-generated workspace slug if omitted.
- [x] Login without workspace slug (email + password).
- [x] Admin dashboard with KPIs and quick actions.
- [x] Client management page (list clients + list invitations).
- [x] Complete invitation flow:
  - [x] `POST /invitations` (admin creates invite)
  - [x] `GET /invitations` (admin list)
  - [x] `POST /invitations/:id/revoke` (admin revoke)
  - [x] `GET /invitations/public/:token` (public details)
  - [x] `POST /invitations/public/:token/accept` (public accept + account creation + auth session)
- [x] Projects page with admin project creation.
- [x] Project detail operational for admin/client:
  - [x] Task board (create + status updates for admin)
  - [x] Tickets (create + admin workflow actions)
  - [x] Messaging thread
  - [x] File upload via signed URL + complete upload + download URL
  - [x] Payments (admin request + checkout redirect)
  - [x] Milestone validation
  - [x] Audit timeline
  - [x] Private admin notes

## Remaining TODO (next iterations)

- [ ] Add dedicated onboarding UI for first admin registration (currently API-first).
- [ ] Add optimistic UI + toasts for all write actions.
- [ ] Add resend invitation endpoint and rate limits on invitation creation.
- [ ] Add richer permissions for future secondary admins/collaborators.
- [ ] Add integration tests for invitation flow and project happy path.
- [ ] Add web smoke/e2e tests for admin/client journeys.
- [ ] Add real-time messaging (WebSocket/SSE) for better UX.
- [ ] Add robust file previews (image/PDF) and file version UX.
- [ ] Add Stripe success/cancel pages with payment state refresh.
- [ ] Harden production settings (`synchronize=false` + migration-only deploy workflow).
