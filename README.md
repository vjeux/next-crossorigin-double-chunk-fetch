# Next.js: with `crossOrigin: "anonymous"`, a client navigation downloads every chunk twice

Minimal reproduction for the Next.js bug report. App Router, `next@canary`
(16.5.0-canary.8 at the time of writing), Turbopack (the default bundler).

`next.config.mjs` sets `crossOrigin: "anonymous"`. `/about` is a dynamic page
with a client component of its own, so a client-side navigation to it loads
one JS chunk.

## Steps

```bash
pnpm install
pnpm build && pnpm start          # http://localhost:3300
pnpm exec playwright install chromium
node count-duplicates.mjs http://localhost:3300
```

## What the script prints (bug)

```
boot: 6 chunk URLs requested, 0 requested twice or more
navigation to /about: 1 chunk URLs requested, 1 requested twice or more
  2x /_next/static/chunks/1xog4xgtre__a.js
script tags: 1 chunk URLs with two or more <script> tags
  /_next/static/chunks/1xog4xgtre__a.js: async=false crossorigin=anonymous | async=true crossorigin=null
```

Two `<script>` tags for the one chunk, and two network requests:

1. the Turbopack chunk loader's tag, `crossorigin="anonymous"` (from the
   config) and no `async` attribute (a dynamically inserted script is async
   by default, so the loader never sets one);
2. React's hoistable `<script async src>` for the rendered segment's chunk
   (`get-layer-assets.tsx` / `create-component-styles-and-scripts.tsx`),
   which Next renders WITHOUT the config's `crossOrigin`. React deduplicates
   hoistable scripts against `script[async][src="…"]` only, so it never
   recognises the loader's tag and inserts its own.

A CORS request and a no-CORS request for the same URL have different HTTP
cache keys, so the second tag downloads the chunk again.

## Control

Remove `crossOrigin` from `next.config.mjs`, rebuild, rerun: still two tags
(React still does not adopt the loader's tag), but one network request (the
second tag hits the cache, same key).

## Expected

One `<script>` per chunk, or at least one download: the hoistable carries the
same `crossOrigin` the loader uses (and the loader's tag could carry `async`
so React adopts it instead of adding a twin).
