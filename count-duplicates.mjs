// Counts, for one client-side navigation, how many /_next/static/chunks/*.js
// URLs the browser requested more than once, and how many <script> tags per
// chunk URL the document holds afterwards.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3300";
const browser = await chromium.launch();
const page = await browser.newPage();
const requests = new Map();
page.on("request", (request) => {
  const url = new URL(request.url());
  if (!url.pathname.includes("/_next/static/chunks/")) return;
  const key = url.pathname;
  requests.set(key, (requests.get(key) ?? 0) + 1);
});
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const ssrTags = await page.evaluate(() => {
  const tags = [...document.querySelectorAll("script[src]")].filter((s) =>
    new URL(s.getAttribute("src"), location.href).pathname.includes("/_next/static/chunks/"),
  );
  return { total: tags.length, missing: tags.filter((s) => !s.hasAttribute("crossorigin")).length };
});
console.log(`server-rendered chunk <script> tags on /: ${ssrTags.total}, ${ssrTags.missing} without crossorigin`);
const bootDoubles = [...requests].filter(([, n]) => n > 1);
console.log(`boot: ${requests.size} chunk URLs requested, ${bootDoubles.length} requested twice or more`);
requests.clear();
await page.click("#to-about");
await page.waitForSelector("main h1:has-text('About')");
await page.waitForLoadState("networkidle");
const navDoubles = [...requests].filter(([, n]) => n > 1);
console.log(`navigation to /about: ${requests.size} chunk URLs requested, ${navDoubles.length} requested twice or more`);
for (const [url, n] of navDoubles) console.log(`  ${n}x ${url}`);
const tags = await page.evaluate(() => {
  const byUrl = new Map();
  for (const script of document.querySelectorAll("script[src]")) {
    const src = new URL(script.getAttribute("src"), location.href).pathname;
    if (!src.includes("/_next/static/chunks/")) continue;
    const list = byUrl.get(src) ?? [];
    list.push(`async=${script.hasAttribute("async")} crossorigin=${script.getAttribute("crossorigin")}`);
    byUrl.set(src, list);
  }
  return [...byUrl].filter(([, list]) => list.length > 1).map(([src, list]) => `${src}: ${list.join(" | ")}`);
});
console.log(`script tags: ${tags.length} chunk URLs with two or more <script> tags`);
for (const line of tags) console.log(`  ${line}`);
const direct = await browser.newPage();
await direct.goto(`${base}/about`, { waitUntil: "networkidle" });
const directTags = await direct.evaluate(() =>
  [...document.querySelectorAll("script[src]")]
    .filter((s) => new URL(s.getAttribute("src"), location.href).pathname.includes("/_next/static/chunks/"))
    .map((s) => `${new URL(s.getAttribute("src"), location.href).pathname} async=${s.hasAttribute("async")} crossorigin=${s.getAttribute("crossorigin")}`),
);
const directMissing = directTags.filter((t) => t.endsWith("crossorigin=null"));
console.log(`direct load of /about: ${directTags.length} chunk <script> tags, ${directMissing.length} without crossorigin`);
for (const line of directMissing) console.log(`  ${line}`);
await browser.close();
