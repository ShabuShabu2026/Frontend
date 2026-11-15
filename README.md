# NASA Space Apps Seoul — Frontend

React application based on `docs/archi.md`. UI text is English. The existing gray/black palette, restrained purple accents, viewport-fitting layout capped at 990px and pinned analysis button are preserved.

## Run

```sh
cd /Users/zzimin/Develop/2026-NASA/Frontend
npm install
npm run dev
```

Open the Local URL printed in the terminal. `npm run build` creates the production bundle; `npm run lint` checks the source.

## Screen review

- `/`: mission configuration and reference lunar image
- `/?preview=candidates`: empty candidate list layout
- `/?preview=details`: detail layout with Overview, 3D Terrain and Sun & Earth tabs

The presentation adapter in `src/data/presentation.js` is connected by default. Analyze shows 10 candidate sites, map markers and populated sidebar details with terrain and hourly visibility. Values are illustrative presentation fixtures, not scientific analysis results. The UI has no mode badge. Replace the adapter with the actual API using `docs/frontend-integration.md` when it is available.

## React basics

A component is a function that returns JSX (HTML-like markup). `App` combines the configuration, candidate list, map and site details. Props pass values and functions to child components. `useState` remembers input values and the selected screen; changing state updates the UI. `useEffect` synchronizes automatic weight and detail requests with a supplied service adapter. Ordinary CSS controls the layout.

## Files

- `src/App.jsx`: navigation, result state and service integration
- `src/components/Configuration.jsx`: controlled inputs and collapsed settings
- `src/components/SiteDetails.jsx`: detail tabs, data-driven DEM surface and visibility timeline
- `src/lib/mission.js`: specified options, defaults, dependent input rules and validation
- `src/App.css`: screen styles and independent scrolling
- `docs/frontend-review.md`: specification comparison, corrections, verification and remaining integration work
- `docs/frontend-integration.md`: frontend adapter interface; no backend URLs or endpoint paths are assumed

## Deployment

Production: https://nasa-space-apps-seoul-two.vercel.app

Hosting: Vercel, project `nasa-space-apps-seoul`. Build settings are in `vercel.json` (`npm run build`, output `dist`). Update the linked deployment from this folder with `npx vercel --prod`.

The first deployment uploaded local source directly. Automatic GitHub deployment is not connected because Vercel could not access `ShabuShabu2026/Frontend`; configure the repository connection in Vercel to enable deployment on push.
