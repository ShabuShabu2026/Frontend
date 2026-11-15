# Lunar Landing Site Analysis Frontend

React frontend for configuring lunar south pole missions and reviewing landing sites, terrain, and Sun and Earth visibility.

Live: https://nasa-space-apps-seoul-two.vercel.app

## Features

- **Mission configuration**: Set the landing date, stay duration, mission type, science objective, power and communication needs, slope limit, Sun and Earth visibility criteria, and landing-date search range.
- **Importance weighting**: Rate Communication, Flatness, Roughness, Sunlight and objective-specific criteria from 1 to 5 and review the resulting weights.
- **Candidate sites**: Analyze the configuration to get ranked landing sites and a suitability grid on a south pole map. Zooming and panning refresh the recommendations for the visible region.
- **Site details**: Review each site in three tabs: Overview for scores, exclusion reasons and the best landing date; 3D Terrain for the surrounding DEM surface; and Sun & Earth for the hourly visibility timeline.
- **Moon locator**: See where the selected area lies on a lunar globe.

## Stack

- React 19
- Vite 8
- Three.js
- NASA Moon Trek basemap tiles and LROC WAC globe imagery

## Requirements

- Node.js 22.12 or later and npm
- macOS or Linux shell for the local commands below
- Internet access to reach the backend API and the map imagery
- A running Lunar Landing Site Analysis Backend

## 1. Install

Run the following commands in a terminal from the repository root:

```sh
npm install
```

## 2. Configure the environment

Create a local environment file:

```sh
cp .env.example .env.local
open -e .env.local
```

Set `VITE_API_BASE_URL` to the backend address. For a local backend, a minimal example is:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the dev server after changing this value. Do not commit `.env.local`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API. |

## 3. Start and verify

```sh
npm run dev
```

Open the Local URL printed in the terminal (normally http://localhost:5173), configure a mission and select Analyze.
