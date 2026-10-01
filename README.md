# Joinery Studio

Next.js + TypeScript bespoke joinery design application.

## Included
- Shared millimetre geometry model
- Front, plan, side and 3D views
- Component editing, snapping, validation and materials
- Undo/redo, JSON backup, shortcuts and context menu
- Revision snapshots with restore
- PDF drawing pack
- Supabase auth and cloud CRUD with local-storage fallback
- Vitest geometry/validation tests

## Commands

```bash
npm install
npm run check
npm run dev
```

## Supabase
Copy `.env.example` to `.env.local` and add the project URL and browser-safe publishable key.

The database schema is in `supabase/schema.sql`.

Never commit a service-role key.
