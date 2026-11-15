# Frontend specification review

Source of truth: `docs/archi.md`. Reference `docs/detail.png` supplies information hierarchy only; colors, borders, controls and typography follow the existing application.

## Corrections

| Area | Previous implementation | Specification implementation |
| --- | --- | --- |
| Landing date | 2026-11-15 | 2027-03-05; validates the entire date ± search range + stay within 2027 |
| Stay duration | 14 days | 6 days; positive integer |
| Mission type | Uncrewed | Crewed; Flatness / Roughness start at 5 / 5 or 3 / 3 |
| Objective | 3 invented options | General and all 7 English NASA objectives from the specification |
| Other | Always included | Included for the 3 specified objectives; excluded from normalization otherwise |
| Power | Low / Medium / High | Low / Normal / High; Sunlight 1 / 3 / 5; required sunlight 30 / 50 / 80% |
| Communication | Low / Medium / High | Independent / Normal / Critical; importance 1 / 3 / 5 |
| Slope | 15°, up to 90° | Enabled, 5°, 0–15°; relaxation warning |
| Crewed sunlight | Always enabled and applicable | Enabled by default; applicable only to Crewed; relaxation warning |
| Uncrewed constraints | Enabled with invented 48h / 24h defaults | Off by default; applicable only to Uncrewed; hours required when enabled, no invented defaults |
| Sun criterion | Darkness Criterion / Low / Medium / High | Sun Visibility Criterion / Partial / Half Disk / Full; default Half Disk |
| Earth criterion | Low / Medium / High | Upper Edge / Center + Δ / Full; default Center + Δ |
| Height | 5 m | 1 m; options 1 / 5 / 10 m |
| Search range | 20 days | ±7 days; 0–30 days |
| Advanced settings | No change count | Collapsed by default, changed item count; automatic mission-dependent defaults are the baseline |
| Candidate data | Repeated fabricated ID and 79% scores | Supplied analysis results only; ID, coordinates, suitability, status, tags, constraint outcome and exclusion reasons |
| Detail | Site name only | Overview / 3D Terrain / Sun & Earth; scores, applied weights and priorities, constraints, terrain metrics, visibility timeline, hourly positions and Best Landing Date |

## Layout

- The layout is capped at 990px and fits shorter browser windows using 100dvh; the header remains 64px.
- Settings scroll independently; the Analyze Landing Sites button is outside the scrolling region.
- Both settings disclosures initially remain closed.
- Candidate selection replaces the candidate list inside the left sidebar with site details; the lunar map remains on the right.
- The detail sidebar content scrolls independently above the permanently visible shared analysis footer. On mobile the map stays above the sidebar.
- All application labels, messages, options and empty states are English.

## Result integrity and integration limits

The repository has no backend URL, endpoint contract, analysis response example, DEM dataset or georeferenced map projection. No endpoint paths, returned scores, coordinates, warnings or terrain have been invented. No requests are sent to guessed endpoints.

`App` accepts an explicit `services` adapter. Until it is connected, the form works and local weights use the documented normalization formula; Analyze reports that analysis is not connected. Automatic weights and final analysis weights use server responses when the adapter exists. Failed weight requests produce an error rather than silently claiming successful API synchronization.

The reference moon / terrain images are decorative reference imagery, not scientific geospatial layers. Map markers are rendered only when the adapter supplies projected positions and a matching georeferenced image. Viewport pan/zoom, recommendation updates and refined grid sampling still require a real map/projection integration and backend. The UI does not pretend to implement scientific analysis using static imagery.

The 3D tab renders a surface from supplied DEM elevations. Without DEM it shows an empty state, not an invented crater. Time series, best date and hourly celestial positions likewise come exclusively from supplied data.

Unresolved scientific parameters listed in the source document (Earth Δ, slope-zero treatment, marginal threshold and objective scoring details) are not decided in frontend code.

## Review URLs

With `npm run dev` running:

- `/`: configuration
- `/?preview=candidates`: candidate list empty state
- `/?preview=details`: detail layout with empty data and working tabs

Preview URLs are for layout review only; they do not create candidates or analysis results.

## Validation

- Production build and lint.
- Pure specification checks for defaults, all 8 objectives, Other inclusion for exactly 3 objectives, dependent priorities, normalization, date boundaries, invalid inputs, uncrewed required fields and change counts.
- Chrome checks at 1440×990 and 390×990: initial collapse, correct defaults, internal scroll, pinned button, unconnected analysis message, all detail tabs, no fabricated scores and no horizontal mobile overflow.

- Injected-adapter Chrome test: automatic weight calls, exact returned candidate count, selection → detail fetch, four DEM mesh cells, hourly visibility values and alternate-date detail requests. These fixtures exist only in the test process; no fabricated response is shipped in the application.

## Presentation wiring (latest user instruction)

The user subsequently requested a populated presentation with no mode label. `src/main.jsx` now supplies `presentationServices` from `src/data/presentation.js`. The UI displays illustrative candidate, terrain and visibility values and supports Analyze → candidate/map selection → sidebar details. This overrides the earlier unconnected empty-state behavior. These are local presentation fixtures; no scientific backend or geographic accuracy is claimed. No mode badge is displayed.

## Map callouts and selection

Restored a callout over every site with its ID, status and suitability. Callouts use the existing charcoal palette with small status accents. Selecting either a point, its callout or its candidate row opens sidebar details, outlines the callout in the point's status color and animates the map camera to 1.7×. Labels retain their screen size during zoom. Reset view restores the full candidate map. Reduced-motion preferences disable animation.

Chrome verification covered all 10 callouts, marker and callout selection, matching amber border, camera transform, constant label width, sidebar placement, reset, mobile overflow and persistent analysis button.
