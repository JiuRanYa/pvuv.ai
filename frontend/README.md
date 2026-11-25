# Analytics console

The Tally console in `src/` uses React, TypeScript, Tailwind CSS and Vite. The browser router supports the original dashboard URLs and the newer site and share links. The console uses the authenticated, same-origin Workers API.

From the repository root, run `npm run dev:console` for the local Worker API and `npm run dev:frontend` in another terminal for Vite. Vite proxies `/api` to port 8787. Open the sites page and choose a site.

Run `npm run build:console` for a production build. Wrangler also runs it before deploying the console. The output in `workers/console/dist/` includes the console entry point, homepage template and static files from `workers/console/public/`, including the tracking SDK.
