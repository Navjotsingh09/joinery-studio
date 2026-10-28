# Designer workspace release — 28 October 2026

## Revamp

A shared sage, charcoal and warm-white visual language now spans the project launcher, room setup and editing workspace. Four design stages expose room/survey, layout, materials and proposal review. The searchable command dialog opens tools, exports and component placement, supports keyboard entry and native modal focus handling. The review panel uses actual project data and separates geometry checks from designer sign-off.

Snap and automatic wall rotation are independent, saved settings. Disabling snap turns off both grid rounding and 2D neighbour alignment; room/collision safeguards remain active. X/Y/Z and V constrain movement, including keyboard nudges. Wall units default to Y. New blank kitchens start with connected worktops enabled; existing projects retain their settings. Aluminium glass fronts now pass backup validation.

## Requested feature status

| Request | Implementation | Verification boundary |
| --- | --- | --- |
| Blank kitchen | Available at project start, exact room dimensions | Scenario tests |
| Top plan | Measured 2D planner | Geometry and interaction tests |
| Two-phase assembly | Room/openings then units/surfaces | Workflow controls retained |
| Wall, base, larder, appliance and accessory assembly | Component library and measured placement | Placement and actual scene geometry tests |
| Matt materials | PBR roughness / texture mapping | Automated material tests; desktop appearance acceptance remains |
| Wall units / aluminium-profile glass fronts | Configurable, now backup-compatible | Backup and geometry checks |
| Elevation dimensions | Wall elevations and drawing packs | Drawing tests |
| One-action opening | Selected-unit button and opening slider | Supported cabinet fronts; manufacturer mechanisms are not simulated |
| Modern interface | New launcher/editor theme, design stages, review and command search | Production build; live UI check recorded separately |
| Polygon / surface selection | Shift-click named model parts | Named joinery surfaces, not arbitrary mesh polygon editing |
| Alt-copy | Existing click / drag and keyboard copy | Automated interaction coverage; physical Alt-drag acceptance remains |
| Standard worktops / continuity | Connected generation and undo; on by default for new blank kitchens | Connected-worktop tests |
| Snap / auto-rotate | Independent saved controls; unsnapped movement supported | Regression coverage and live control check |
| High-resolution export | Existing 4096-pixel browser export and workstation render kit retained | Browser GPU download and visual quality acceptance remain |
| CAD / PDF import | Measured DWG / DXF references and calibrated PDF overlays | Existing decoder, CAD, backup tests; not editable CAD solids |
| Sink / hob cutouts | Shared aperture geometry in generated slabs | Actual Three.js geometry and drawing tests |
| XYZ movement | Toolbar, inspector, X/Y/Z shortcuts; wall units default to height | Axis/bounds regression coverage |
| Floor materials | Built-in picker plus uploaded custom textures | Existing material and backup tests |
| Plinth | Thin exposed-side panels; configurable sides, recess and height | Actual geometry tests; entered overall unit height includes plinth |

## Remaining external acceptance / provisioning

These cannot honestly be marked completed by source changes: physical tablet interaction, GPU-backed desktop image export and visual approval, the user's missing Video 1 / Video 3 references, actual survey comparison, production Supabase configuration and real account/email tests, billing activation, community invitation and tutorial destinations. Shared cloud accounts were previously deferred by the owner and are not provisioned by this UI update. Earlier historical unsupported-format notes are superseded for 2D DWG reference import by the 8 October implementation.

## Validation

241 tests across 40 files passed and production build passed including live-discovered cabinet placement and neighbouring slab overhang regressions. Live command placement, measured blank-room setup, wall-unit Y defaults and snap controls were exercised on production. Final deployment evidence is recorded in the release response. No physical tablet or GPU-quality sign-off is inferred from tests.

Live testing found a front/back placement preference that could generate overlapping worktop overhangs. Library additions now extend matching cabinet runs first; generated overhangs stop at neighbouring cabinet rows. Two regression cases cover these conditions.
