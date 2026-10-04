# Joinery Studio implementation and release checks

This change adds the public website and shared reliability safeguards. It is not a claim that a production account, billing or advanced CAD capabilities have been provisioned.

## Implemented

- Public homepage; kitchen, bedroom, stair and showroom pages.
- Product overview and dedicated 2D, 3D, materials, project/revision and import/export pages.
- Enterprise and white-label information; help, community, tutorials and content library pages.
- Monthly/annual pricing presentation (£0 Basic, £21/month Pro or £249/year excluding tax, Enterprise enquiry).
- Login, password recovery and password update forms. Signup requests access; no public registration UI.
- Auth-gated editor at `/studio`. No configured authentication means access stays closed.
- Starter-specific links and actual PNG plan examples rendered from the app's starter data.
- Complete JSON cloud snapshots, including worktop edges and revisions, through one transactional RPC.
- Optimistic server versions, serialized saves/deletes and cancellation after account switching.
- Account-specific local storage, no implicit guest imports, local recovery downloads.
- Atomic group/batch placement, locks at the store boundary, no-space paste rejection, rear appliance service gaps.
- Basic project limit in creation/duplication/import UI and database inserts; existing projects are retained.
- Wrapped PDF schedules, stable object references, pagination, export date and more restrained drawing labels.
- Dependency lockfile, `npm ci`, Node 22 and pull-request build checks.

## Production configuration still required

1. Apply `supabase/schema.sql` to the intended Supabase project. Existing rows retain their legacy data; new saves use `design_snapshot` and `save_version`. Back up the database first. Test the migration in a staging project before production.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and the public publishable/anon key in the deployment. Do not put a service-role key in the client.
3. Disable **Allow new users to sign up** in Supabase Auth. Removing the signup UI alone does not disable the public Auth API.
4. Provision the initial user through the Supabase dashboard; send the account invitation securely. No credentials are stored in the repository.
5. Configure the site URL and allowlisted `/reset-password` redirect. Check email delivery and recovery using a test account.
6. Configure `ENQUIRY_WEBHOOK_URL` for access/sales enquiries. Without it the form explicitly reports that no enquiry was sent. The receiver should add rate limiting and spam protection before a public launch.
7. Supply the actual Discord invitation and YouTube tutorial links. Current pages clearly state these are pending; Discord's platform homepage is not presented as a community invitation.
8. Deploy with a Node-compatible host using the standalone Next build. Billing, trials, paid project allowances and company-level branding are not active.

## Cloud acceptance sequence

Use two staging accounts and two tabs. Confirm that project listing and every database table are private across accounts, including direct REST attempts. Create a worktop with rounded edges, custom textures, a group, a locked item and a saved revision. Save, close the tab, sign in again and compare every field. Attempt overlapping saves from both tabs; the stale tab must show a conflict and retain a local recovery copy. Disconnect, edit and reconnect. Delete a project while a save is pending and confirm it stays deleted. Switch accounts while a save is queued; confirm it is cancelled. Verify the Basic limit cannot be bypassed through direct REST inserts. Test recovery email links.

## Browser verification

The public homepage and a dedicated kitchen page rendered successfully. The local development-only route `/qa/studio` allows UI testing without exposing a production bypass: it returns 404 in production and when Supabase is configured. Local 2D editing, revision saving, locked-position rejection and square worktop-edge persistence across reload were verified. The annual/monthly pricing toggle was verified. Four PDF samples, including an 80-item schedule, were rendered and checked for wrapping and pagination. The browser download event could not be confirmed, so JSON/recovery downloads still require a normal-browser check. Real cloud/account tests remain separate. The cloud browser cannot initialize WebGL; 3D has a working 2D fallback, but visual 3D acceptance still needs a browser with hardware acceleration.

## Honest feature boundary

Supported: joinery concepts, measured 2D views, 3D previews, surfaces, revisions, JSON backups, PDF drawing packs. Not supported: X_T/STEP/IGES/DWG/STL import, paper sketch OCR, automatic 3D reconstruction, AR/VR, real-time collaboration, advanced CAD modelling, manufacturing/CNC output, paid checkout, activated subscriptions or company tenancy. These remain roadmap work.
