# Kitchen design requirements — 6 October 2026

## Implemented in this release

- A direct **Start a blank kitchen** action on the initial workspace, with exact room dimensions and an empty Top plan.
- Two guided assembly phases in Add: room, floor, walls, doors, windows, then base cabinets, wall cabinets, larders, islands, worktops and backsplashes. Every step remains accessible.
- Shift + click in 3D selects a named material surface. Ordinary clicks select the unit. This is surface selection, not individual mesh-triangle editing.
- Alt + click in 3D duplicates a unit; Alt + drag in 2D duplicates and moves the copy. Ctrl/Cmd + D also duplicates. Copies use clear placement and retain the source configuration.
- Aluminium-profile glass fronts are available alongside slab, shaker, slim shaker, raised panel and fluted fronts.
- One-click open/close plus a continuous slider for supported cabinet doors and drawers.
- Matt fronts now use high roughness without clearcoat or a texture roughness map overriding the selected finish.
- **Keep worktops connected as units change** in Tools. Enabling it generates the current runs. Adding, resizing, moving or deleting units rebuilds those runs in the same undoable change. Thickness, configured overhang and matching section finishes are preserved. Automatic worktops are optional; turning them off retains manual management.
- Adjacent-unit attraction during floor-plane movement supplements the existing grid and nearest-wall rotation. Dedicated 3D axes retain their axis restriction.
- Browser image export preserves its drawing buffer, checks model/texture readiness and respects the device renderbuffer/texture limit up to 4096 pixels.

## Existing functionality retained

- Editable base, wall, larder, appliance, island and accessory components; exact unit sizes, undo/redo and local autosave.
- Dimensioned Top plans, front/side views and four live wall elevations, plus coordinated PDF drawing packs.
- Separate units/worktops/backsplashes/uploaded-texture collections; floor materials can include uploaded textures.
- ASCII DXF reference import and PDF/image reference import with measurement calibration. DWG and binary DXF are not supported.
- Automatic sink/hob cutouts in worktop geometry, plans and drawing exports.
- X, Y, Z and floor-plane movement; nearest-wall automatic facing and clearance checks.
- High-quality customer render packages for Blender Cycles. Rendering takes place on a workstation, not automatically on Vercel.

## Acceptance still needed

- Real-device WebGL checks for 3D selection, door animations, reflections, transform smoothness and high-resolution PNG output. The cloud browser available for verification cannot render WebGL; automated scene/geometry tests do not replace this check.
- Exact interface/behaviour comparisons with **Video 1** and **Video 3**. Those videos were referenced in the requirements but their contents were not attached to this request.
- Team walkthroughs on target desktop and tablet hardware. Public browser-local team testing remains the current mode; shared accounts and cloud project storage remain deferred.


## Chrome test follow-up — 6 October 2026

The customer reported successful real-device checks for exact blank rooms, guided phases, 3D duplication and surface selection, glass fronts, doors, matt fronts, connected worktops and 3D snapping. These are customer observations, not a complete release certification.

This follow-up fixes canvas pointer capture and focus, Alt duplication during plan movement, 50 mm adjacency snapping, transient placement warnings, camera prop identity, persistent 3D view mounting, oak floor clearcoat, plan annotations, selection list alignment, missing panel thumbnails, copy names and inspector material scopes. Existing project data is retained. Existing out-of-scope finishes stay available as the current selection; new choices are scoped. Painted board colours remain valid cabinet finishes.

Regression checks exercise actual plan pointer handlers for Alt at pointer-down and after pointer-down, one-copy movement, canvas capture and focus, drag completion, and single undo checkpoint. Geometry checks cover the reported 50 mm gap. Hardware checks still required after this release: camera stability, context lifetime and switch latency, oak floor appearance, full-resolution PNG inspection, tablet interaction, PDF packs, CAD/PDF imports, Blender package and video comparisons.


## Export and import verification — 7 October 2026

- Production L-shaped kitchen: PDF drawing pack downloaded successfully as nine A3 pages. All pages were rasterised and inspected: separate base, wall and worktop plans; four wall elevations; unit/material and service/appliance schedules. Sink and hob cutouts appear on the worktop sheet.
- Production PDF import: the exported nine-page pack loaded, the page count was detected and switching from page 1 to page 3 replaced the reference without replacing kitchen units. PDF imports now retain the original viewport aspect ratio instead of deriving it from rounded raster pixels; this avoids scale drift during calibration. A regression covers a 420 × 297 page rasterised to 2048 × 1449 pixels.
- Production DXF example: millimetres detected; all layers measured 4200 × 3400 mm; island-only selection measured 1800 × 800 mm; changing the declared units to inches converted to 106680 × 86360 mm; restoring mm and placing the reference retained exactly 4200 × 3400 mm. This verifies the supplied example and layer/unit controls, not every customer CAD file.
- Blender 4.2 loaded the package generated from the actual sage/oak scene (317 meshes and six imported components), embedded textures and camera, and saved a packed editable project. The customer profile was confirmed as 4096 pixels and 256 samples. The verification PNG uses 16 samples at the same 4096-pixel resolution; it does not certify completed 256-sample rendering or the browser PNG export.
- Tablet hardware, browser WebGL/camera retests and Videos 1/3 comparisons remain open. The required videos are not available in this conversation.
