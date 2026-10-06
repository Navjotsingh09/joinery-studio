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
