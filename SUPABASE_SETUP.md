# Supabase setup

The earlier schema may already be installed, but this change adds `design_snapshot`, `save_version`, the transactional `save_design` RPC and a Basic project-limit trigger. Apply the current `supabase/schema.sql` in staging and verify it before production.

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and browser-safe publishable/anon key.
3. Enable Email authentication and disable public signup for the provisioned-account rollout.
4. Create the initial account through the dashboard and send its invitation securely.
5. Configure the site URL and allowlisted `/reset-password` redirect URL.
6. Test recovery email delivery, account separation, a complete save/reload and stale-tab conflicts using staging accounts.

The RPC stores each whole design in one transaction. Legacy project/item/revision rows remain readable until the next save writes a complete snapshot. Row-level security remains enabled and owner-based. No service-role key is needed in the browser; never commit one.

See `SHOWROOM_READINESS.md` for the full acceptance sequence. The implementation does not claim the live migration or account provisioning has been performed.
