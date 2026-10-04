# Joinery Studio

Next.js + TypeScript bespoke joinery design application.

## Included
- Shared millimetre geometry model
- Front, plan, side and 3D views
- Component editing, snapping, validation and materials
- Undo/redo, JSON backup, shortcuts and context menu
- Revision snapshots with restore
- PDF drawing pack
- Account-provisioned Supabase login, recovery and transactional cloud snapshots
- Account-specific local recovery storage
- Public marketing, use-case, product, enterprise, resources and pricing pages
- Vitest geometry/validation tests

## Commands

```bash
npm ci
npm run check
npm run dev
```

## Supabase
Copy `.env.example` to `.env.local` and add the project URL and browser-safe publishable key.

The database schema is in `supabase/schema.sql`.

Never commit a service-role key.

## Routes and rollout

`/` is the public website. `/studio` opens for local team testing while Supabase is unconfigured, with a visible browser-only saving notice. Once Supabase is configured, it requires authentication. `/login`, `/forgot-password`, `/reset-password` and `/signup` provide account entry and access requests.

See [SHOWROOM_READINESS.md](SHOWROOM_READINESS.md) for completed work, configuration requirements and the remaining live acceptance checks. Apply the updated schema before enabling cloud saves; do not assume the previous database setup includes the new snapshot RPC. Paid billing, advanced CAD imports, OCR, AR/VR and collaboration are not active.

## Production Node host

Run `npm ci`, `npm run build`, then `npm start`. The start script includes public images and Next static assets in the standalone output. Configure `PORT` and `HOSTNAME` for your host. Cloud saving requires the public Supabase variables at build time and the applied migration; without them the studio runs in local team testing mode.
