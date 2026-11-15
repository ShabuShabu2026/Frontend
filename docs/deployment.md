# GitHub and Vercel deployment

Repository: `https://github.com/ShabuShabu2026/Frontend`

Vercel project: `nasa-space-apps-seoul`

Production URL: `https://nasa-space-apps-seoul-two.vercel.app`

## Connect automatic deployment

1. Open the Vercel project's Settings → Git.
2. Allow the Vercel GitHub App to access `ShabuShabu2026/Frontend`. Organization approval may be required.
3. Connect this repository and set Production Branch to `main`.
4. Keep Root Directory as the repository root, Framework Preset as Vite, Build Command as `npm run build`, and Output Directory as `dist`. These build settings are also tracked in `vercel.json`.

After connection, pushes to `main` deploy production. Pull requests receive preview deployments, subject to the account's permissions and plan. Check each deployment's build status in Vercel before sharing its URL.

## Updates

```sh
npm run build
npm run lint
node --test src/lib/mission.test.js
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

The GitHub App connection is independent of this computer's Git credentials. Being able to push from a terminal does not grant Vercel access to the repository.

## Backend integration later

Replace the presentation service adapter in `src/main.jsx` with the real backend adapter when its API is available. The GitHub → Vercel deployment flow stays the same. Configure any public frontend API URL in Vercel's environment settings for Production and Preview, and allow those frontend origins in the backend's CORS configuration. Frontend-exposed variables must never contain server secrets. `.env` files and `.vercel` account metadata are ignored by Git.

The backend itself needs its own hosting; connecting this React repository to Vercel does not deploy an external backend automatically.
