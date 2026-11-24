# Analytics console

The React pages in `src/` use Vite's multi-page build. The dashboard uses Tailwind CSS and the existing authenticated, same-origin Workers API. Each page's controller handles its existing analytics, session or settings operations.

From the repository root, run `npm run dev:console` for the local Worker API and `npm run dev:frontend` in another terminal for Vite. Vite proxies `/api` to port 8787. Open the sites page and choose a site.

Run `npm run build:console` for a production build. Wrangler also runs it before deploying the console. The output in `workers/console/dist/` includes the built pages, the server-rendered homepage template and static files from `workers/console/public/`, including the deployed tracking SDK. The existing page URLs and OAuth callbacks stay the same.
