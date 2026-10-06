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

The public homepage and a dedicated kitchen page rendered successfully. A temporary development-only editor route was used for UI testing and removed from the final change. Local 2D editing, revision saving, locked-position rejection and square worktop-edge persistence across reload were verified. The annual/monthly pricing toggle was verified. Four PDF samples, including an 80-item schedule, were rendered and checked for wrapping and pagination. The browser download event could not be confirmed, so JSON/recovery downloads still require a normal-browser check. Real cloud/account tests remain separate. The cloud browser cannot initialize WebGL; 3D has a working 2D fallback, but visual 3D acceptance still needs a browser with hardware acceleration.

## Honest feature boundary

Supported: joinery concepts, measured 2D views, 3D previews, surfaces, revisions, JSON backups, PDF drawing packs. Not supported: X_T/STEP/IGES/DWG/STL import, paper sketch OCR, automatic 3D reconstruction, AR/VR, real-time collaboration, advanced CAD modelling, manufacturing/CNC output, paid checkout, activated subscriptions or company tenancy. These remain roadmap work.

## Continued verification — 4 October 2026

The GitHub Actions failure is now diagnosed. Run 37232514313/check 111525024463 reports: “The job was not started because your account is locked due to a billing issue.” The account owner must resolve GitHub billing; changing build commands cannot repair this. The runner migration annotation is a notice, not the cause.

Vercel automatically produced a READY preview for branch commit 6eacb4732e15ea65032057b0ce5fc284bc0a40bd in the existing joinery-studio project. This is not a production rollout. Its environment-variable listing is empty. The connection cannot read the protected preview because the required team/project scope is not authorized. No authentication protection was changed.

The SQL migration was executed twice in a local PostgreSQL 18.3/PGlite instance with emulated auth.uid() and authenticated role. Eleven checks passed for complete snapshots, increasing versions, stale-save rejection, failed-write rollback, project isolation, Basic limits through RPC and direct inserts, and deleted-project conflicts. The pgcrypto extension declaration was omitted for this local harness; PostgreSQL built-in UUID generation was used. This validates SQL behavior locally, not Supabase hosting, Auth email delivery, real network concurrency or production RLS grants. The harness is now included in the test suite.

The continued suite passes 116 tests across 22 files; the production build also passes. `npm start` now packages the public directory and Next static assets for standalone Node hosting. A recursive smoke check found 51 linked routes/assets and all returned HTTP 200. Three alternate hosting projects were checked: two list no environment variables, while joinery-studio-isvf lists public Supabase variables marked sensitive whose values cannot be recovered through this connection. Their presence alone does not establish a working database or migration.

## Temporary team testing access

At the owner’s request, `/studio` opens without login when Supabase is not configured. A persistent notice explains that projects save only in the current browser and JSON backups should be exported. No database calls or shared account data are exposed by this mode. Configuring both public Supabase variables restores the existing authentication gate automatically. Team members can test kitchens, bedrooms and stairs directly; browser data is not shared between team members or devices. This temporarily replaces the previous closed-until-configured deployment behavior.

## Customer drawing and presentation update — 6 October 2026

Implemented: separate base-unit, wall-unit and worktop plans; one sheet per wall elevation; dimension chains and zero datum; stable unit/surface/service references; colour legends; item/material and service schedules; slab and Shaker fronts; cornice, wine rack and stool components; corrected floor-relative plinths and cabinet front depths; wall apertures for windows/doors; worktop sections grouped by connected runs, island overhangs, thickness, edge-finish annotations and shared sink/hob aperture geometry. Worktop regeneration is atomic and reversible.

Saved customer cameras and lighting settings persist in local recovery, JSON backups and revisions. Design mode uses lower render resolution; presentation exports target a 4096-pixel long edge. The downloadable Cycles ZIP contains the actual scene GLB, camera, embedded textures, settings and Blender 4.x script. It runs on a workstation; there is no remote render service or automated Blender installation. The script is syntax-checked and ZIP integrity is verified. A Blender render has not been executed in this environment.

Validation: 145 tests pass across 24 files; production build passes. The nine-sheet reference PDF was rendered through PDF.js and visually inspected. Live browser verification is recorded separately after deployment. The supplied cloud browser has WebGL disabled, so 3D manipulation, saved-camera capture, GLB export and visual realism require acceptance on a WebGL-capable browser. No claim of reference-level photorealism is made. Native editable CAD import and a premium rendering service remain future integrations.

## Photographed materials and showroom — 6 October 2026

CC0 PBR oak, marble and floor textures replace the procedural patterns for the supported built-in surfaces. Colour maps use sRGB; normal and roughness maps use linear data. Physical texture dimensions apply to both panel and cutout worktop geometry. Shared texture resources avoid loading a separate copy for every cabinet panel; floor transformations have a separate resource scope. HDR environment lighting is served locally and included in the Cycles export kit. Presentation starts with an eye-level camera, and an existing design opens on refresh unless a new-design flow is explicitly requested.

The Sage & oak showroom is an editable, measured scenario with Shaker fronts, an oak island, a window, pendants and stools. Its preview is labelled as a Cycles reference render, not a screenshot of the browser renderer. The offline verification captures 351 meshes from the same JoineryModel React component, applies the same PBR maps and generates an actual Blender 4.2.3 Cycles image. This validates scene geometry and a workstation rendering example; it does not validate the browser GLB download end-to-end or provide a hosted rendering service. The cloud browser still cannot initialize WebGL.

Validation: 148 tests across 25 files and the production build pass. The measured showroom is checked at standard and minimum room sizes. The final live deployment is verified separately.


## Kitchen customer configuration — 6 October 2026

Added saved slab, shaker, slim shaker, raised panel and fluted fronts; bar, knob, cup and edge handles with five finishes and length; recessed, flush, exposed-leg and no-plinth configurations with editable height; shelf, full-height pull-out and internal-drawer larders; induction, gas, ceramic and grill hobs with two/four/five cooking zones. Existing sink and tap variants remain configurable, including an integrated island sink/tap. Fronts and handles can be applied throughout a kitchen in one undoable action.

Islands now have storage, breakfast, dining, extended-counter, hob and grill layouts; doors/drawers; slab thickness, edge, finish and overhang; seating overhang and extension length. Dining extensions are 740 mm high with support legs. Worktop geometry is derived from the saved island and shared by Three.js, 2D/PDF drawings, cutouts and validation. Linked generated slabs follow moves/rotations and are deleted with the island. Counter extensions outside the room are rejected.

Validation covers all layouts at four rotations, transformed appliance cutouts, worktop heights, backup recovery, atomic updates, undo/redo, drawing export and actual Three.js slab/front/handle/leg geometry. Detailed manufacturer appliance meshes are still a separate visual-quality gap. Browser WebGL acceptance cannot be claimed from the cloud test browser when it displays its 3D-unavailable fallback.

Free3D asset review: the listed Kitchen Tap (465868), Extractor Hood (216460), White Kitchen (787060), kitchen (97041) and Gas Stove (271895) were labelled Personal Use License when checked. No files from those listings were redistributed in this commercial editor. Choose assets with terms allowing commercial use and web-app redistribution, or obtain author permission. Generic editable appliance geometry is not claimed to be an imported manufacturer model.


## BlendSwap component integration — 6 October 2026

Downloaded three free CC0 source files with the owner-provided API key and converted six reusable GLBs: inset sink, square mixer, cross-handle mixer, four-zone gas hob, ceramic mug and cooking pot. The deployed editor serves these locally; no BlendSwap key is included in source control or client code. Source credits and repeatable Blender conversion scripts are included. Modifiers are baked and procedural source shaders replaced with browser PBR materials. Models are dimensioned by the saved item settings, load only when used, and have procedural loading fallbacks. Presentation/GLB exports wait for model loading.

The Sage & oak scenario uses the imported sink, square mixer, gas hob and mug. Existing stored designs are preserved. The reference Cycles image predates these component replacements and remains labelled a reference render. Six real binary GLBs are parsed by Three.js tests and checked for geometry, centred unit bounds, absence of cameras/lights and a size below 2 MB each. This is an incremental visual improvement, not completion of the entire customer-ready scope or manufacturer asset library.

Final local validation: 177 tests across 28 files pass, along with TypeScript and the production build. An actual Blender/Cycles inspection render of the six converted GLBs confirms the tap, sink, hob, mug and closed-lid pot shapes. Browser WebGL verification remains limited by the cloud browser.

Deployment correction: the Vercel production environment disables React act(), which the new geometry reconciler tests require. The test runner now explicitly uses NODE_ENV=test in its child process, while the application build retains production mode. The failure was reproduced locally before this correction.
