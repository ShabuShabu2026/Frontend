# Frontend adapter boundary

This is a frontend adapter interface, **not an invented backend HTTP contract**. Map the actual backend response fields to these presentation objects once its API is provided. Wire the adapter with `<App services={services} />` in `src/main.jsx`.

```js
const services = {
  // Called initially and when mission-dependent inputs or importance sliders change.
  async getWeights(inputs, { signal }) {
    // Return { priorities: { Communication, Flatness, Roughness, Sunlight, Other },
    //          weights: { Communication, Flatness, Roughness, Sunlight, Other } }
    // Excluded Other values are null. Weights are fractions, not percentages.
  },
  async analyze(config) {
    // Return { analysisId, warnings, priorities, weights, candidates, mapSites, mapImageUrl }.
    // candidates: actual returned number of candidates; never pad to 10.
    // Site: { id, rank, latitude, longitude, suitability, status, tags,
    //         passed, exclusionReasons, bestLandingDate }.
    // suitability: 0–100; passed: boolean; tags/exclusionReasons: string[].
    // mapSites: same site fields plus mapXPercent and mapYPercent from the
    // actual map projection and mapImageUrl: the matching georeferenced image URL.
    // Markers are hidden without that image. Do not map physical x/y meters directly to %.
  },
  async getSiteDetails({ analysisId, siteId, latitude, longitude, landingDate }, { signal }) {
    // Return { suitability, passed, exclusionReasons, scores, priorities, weights,
    //          slope, roughness, bestLandingDate, sunVisibility, earthVisibility,
    //          longestDarkness, longestBlackout, hourly, terrain }.
    // scores/weights: named objects with the five score keys, fractions 0–1.
    // priorities: named object of integers 1–5 (Other may be null).
    // slope: degrees; roughness: meters; longest durations: hours.
    // hourly: [{ time, sunVisible, earthVisible, sunAzimuth, sunElevation,
    //            earthAzimuth, earthElevation, sunDiskFraction }].
    // time: ISO 8601 UTC; angles: degrees; sunDiskFraction: 0–1.
    // terrain: { elevations: number[][], spacing, coordinateSystem }.
    // terrain spacing: meters. Elevation values must share consistent units.
  },
}
```

Every configuration value is controlled and sent together to `analyze`. Landing date changes rerun analysis after a result exists. A changed non-date input invalidates the previous result. An alternate date within the site's search range reloads site details using the original analysis ID. The original candidate score remains tied to the original landing date.

Default values and option lists are centralized in `src/lib/mission.js` and follow the supplied document. A future server configuration adapter must preserve these semantics. Backend geometry, scientific scoring, threshold interpretation, viewport recommendations and finer-grid computation remain backend/map responsibilities; they are not simulated by the UI.

## Percentage slider update

The user's later UI instruction supersedes the original 1–5 slider presentation. Interactive sliders now display normalized weights on a 0–100% scale. Moving one slider fixes its requested share and redistributes the remainder proportionally among the other active weights; excluded Other stays null. When all other weights are zero, the remaining share is distributed equally. Mission inputs still provide the specified 1–5 starting priorities. Changing a mission-dependent input restores its automatic weighting.

`config.manualWeights` (also supplied to `getWeights`) contains the explicit fractional override after a drag. The adapter must forward these overrides using the real backend contract; it must not silently ignore them or approximate them as integer priorities. No backend endpoint contract has been assumed.
