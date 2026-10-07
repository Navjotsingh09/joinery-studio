# Acceptance defect fixes — 7 October 2026

The editor uses immutable undo snapshots shared between projects. View changes do not enter or restore edit history. A drag creates one checkpoint; completed single changes also record history. Local storage serializes once after an editing burst, skips unchanged project collections, and flushes on page exit/account changes. Cabinet geometry and project thumbnails avoid unnecessary rebuilds.

Measurement fields retain drafts until blur/Enter, explain invalid values, and support exact millimetres/centimetres/inches. Room input limits are enforced in both UI and store. Top-plan axis movement preserves other coordinates after guide snapping.

New taps follow sinks; wall cabinets, copies, windows, doors and wall segments remain wall mounted. Backsplashes require a suitable worktop span, reject tall-unit intersections, and have an explicit reposition action for older saved designs. Placement searches are bounded. Islands require circulation space when added; validation flags tight existing layouts. Breakfast seating can be placed on either side without resetting integrated fixtures when switching style. Hidden objects do not block placement or validation.

Connected worktops bridge adjacent lower dishwashers without changing appliance dimensions, retain their IDs/finishes and accept thickness changes. Cutout slab edge UVs include physical thickness; matt/gloss worktop finishes use consistent roughness.

PDF cabinet chains exclude appliance clearances and worktop overhangs. Small horizontal dimensions use staggered leaders rather than disappearing. Keys include each object's W/H/D. Elevations require actual wall proximity. Side view shows a wall elevation instead of superimposing both opposing runs. Service schedules include integrated sink/hob/oven/fridge and island fixtures, explicitly referencing their host cabinets; host dimensions are not represented as precise appliance connection positions.

Verification: typecheck, full regression suite, production Next build; generated A3 elevation and service sheets visually inspected. Automated scene checks cover slab dimensions, edge UVs, and gloss roughness. Browser checks are recorded during deployment verification.

The earlier acceptance run's blocked items remain separate: actual tablet, Safari/Edge, printer output, customer CAD samples, Videos 1/3, and customer acceptance of presentation realism. Existing saved layouts are not silently rearranged. Use the backsplash reposition action where needed. Hardware WebGL performance requires the original real-device workflow to be repeated; code improvements alone do not certify the previously reported 30-second freezes as eliminated on every device.
