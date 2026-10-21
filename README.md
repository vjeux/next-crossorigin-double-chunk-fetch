# Next.js (Turbopack): with `crossOrigin` set, a client navigation downloads the page's JS chunk twice

A minimal App Router reproduction. Verified on **2026-10-21** with `next@16.5.0-canary.21` (the latest canary), Node 24, Linux, and Chromium 156 (Playwright).

- `next.config.mjs` sets `crossOrigin: "anonymous"`. That's the documented option; we set it so JS Self-Profiling and LoAF attribution can read stacks inside our chunks.
- `/` is static text. `/about` is a dynamic page that renders one client component (`app/about/about-client.tsx`), so a client-side navigation to it loads exactly one JS chunk.
- `count-duplicates.mjs` is a small Playwright script. It loads `/`, clicks the link to `/about`, and counts the chunk requests and the `<script>` tags per chunk URL.

## Steps

1. `pnpm install`
2. `pnpm build` (Turbopack, the default)
3. `pnpm start` (serves http://localhost:3300)
4. In a second terminal: `pnpm exec playwright install chromium`
5. `node count-duplicates.mjs http://localhost:3300`

To check without the script:
1. Open http://localhost:3300 in Chrome with DevTools open.
2. Filter the Network tab on `chunks` and click **About**.
3. The `/about` chunk appears as two requests for the same URL.
4. In Elements, `<head>` holds two `<script>` tags with that `src`: one with `crossorigin="anonymous"` and no `async`, the other with `async` and no `crossorigin`.

## Expected

One download and one `<script>` tag per chunk:

```
navigation to /about: 1 chunk URLs requested, 0 requested twice or more
script tags: 0 chunk URLs with two or more <script> tags
```

## Actual (next@16.5.0-canary.21, Turbopack)

```
server-rendered chunk <script> tags on /: 7, 0 without crossorigin
boot: 6 chunk URLs requested, 0 requested twice or more
navigation to /about: 1 chunk URLs requested, 1 requested twice or more
  2x /_next/static/chunks/100o7vng8-xm4.js
script tags: 1 chunk URLs with two or more <script> tags
  /_next/static/chunks/100o7vng8-xm4.js: async=false crossorigin=anonymous | async=true crossorigin=null
direct load of /about: 8 chunk <script> tags, 0 without crossorigin
```

## Controls (same day, same version)

- **webpack** (`pnpm exec next build --webpack`, then steps 3–5): one download, one tag. Only Turbopack is affected.
- **No `crossOrigin`** (remove it from `next.config.mjs`, then steps 2–5): still two `<script>` tags for the chunk, but one download, because both requests now share a cache key.

## Why

1. The Turbopack chunk loader, called by the Flight client's module preload while it parses the navigation payload, inserts `<script crossorigin="anonymous" src="…">`. A dynamically inserted script is async by default, so the loader never sets the `async` attribute.
2. Next then renders the segment's hoistable `<script async src="…">` (`packages/next/src/server/app-render/get-layer-assets.tsx` and `create-component-styles-and-scripts.tsx`) without the config's `crossOrigin`. The CSS `<link>`s and the bootstrap scripts do carry it.
3. React deduplicates hoistable scripts against `script[async][src="…"]` only. It never recognises the loader's tag, so it inserts a second one.
4. A CORS request and a no-CORS request for the same URL have different HTTP cache keys, so the second tag downloads the chunk again.

## Fix

Two lines: pass `crossOrigin: ctx.renderOpts.crossOrigin` to the two `createElement('script', …)` calls. It's on https://github.com/vjeux/next.js/tree/vjeux/hoistable-script-crossorigin (commit d9ced766), with an e2e test (`test/e2e/app-dir/crossorigin-chunk-scripts/`) that fails without the two lines. Both lines are unchanged on today's canary (get-layer-assets.tsx:90, create-component-styles-and-scripts.tsx:38), so the commit applies as is.

_This reproduction was written by Christopher Chedeau's coding agent at his direction, and re-verified on the date above._
