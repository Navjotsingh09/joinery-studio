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

## Customer drawings and final renders

Export → PDF drawing pack produces separate base, wall and worktop plans, four wall elevations, unit/material and service schedules. References remain consistent as units are removed or reordered. Tools → Joinery intelligence regenerates connected worktop sections; Undo restores the previous tops.

Use Present for a customer view with editing controls and editing shortcuts hidden. Escape returns to the editor. In the 3D view, Views & lighting saves customer views and adjusts exposure/daylight. Download final render package includes the scene, saved camera, materials, HDR lighting and launchers for Windows, Mac and Linux. Model, material and lighting download failures show a Retry loading button. Final exports wait for the original assets rather than exporting a simplified fallback. Retrying keeps the current camera. Choose a 2K preview or a 4K customer image. Extract the ZIP and install Blender 4.x; double-click run-render.bat on Windows or run run-render.command on Mac/Linux. You can also run:

```bash
blender --background --disable-autoexec --python render.py -- scene.glb settings.json final.png
```

This is a workstation workflow using the exported model and camera, not a hosted rendering queue. The current browser renderer and generic parametric assets should not be presented as equivalent to fully art-directed photorealistic examples.


## Measured CAD reference import

Export → Import CAD / PDF drawing opens the tools panel. Upload an ASCII DXF under 8 MB, check the detected mm/cm/m/in units, choose layers and add the measured reference. Lines, polylines with bulges, arcs, circles and nested block inserts are supported. Unsupported annotations are reported. The example plan is 4200 × 3400 mm. The reference is stored with the project and JSON backups; it does not turn CAD entities into editable cabinets. DWG, 3D solids and general editable CAD import remain unsupported.

## Reproducible Blender showroom rendering

With Blender 4.x installed, render the same JoineryModel geometry and locally served CC0 models without a browser GPU:

```bash
npm run render:customer -- --design kitchen-backup.json --output customer.png --quality customer
```

Use `--project-index 0` to select a project from a JSON backup, `--blender /path/to/blender` for a non-standard install and `--threads 2` to limit CPU usage. Omit `--design` to render the Sage & oak starter. Draft is 2048 pixels wide / 96 samples; customer is 4096 pixels wide / 256 samples. This command uses the same GLB exporter and render package as the browser and writes a PNG, a packed editable Blender scene and a reusable render ZIP. Textures and lighting are packed into the Blender file so it can be moved to another workstation. Uploaded embedded textures are supported; external texture URLs need to be downloaded and embedded first. The headless command is a workstation tool, not a remote rendering service.
