import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { legalPages } from "../src/pages/legal/legalPagesData";

const BASE = "https://helpthehive.com";
const today = new Date().toISOString().split("T")[0];

interface Route {
  loc: string;
  priority: number;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

const staticRoutes: Route[] = [
  { loc: "/", priority: 1.0, changefreq: "weekly" },
  { loc: "/partners", priority: 0.7, changefreq: "monthly" },
  { loc: "/partnerships", priority: 0.7, changefreq: "monthly" },
  { loc: "/press", priority: 0.6, changefreq: "monthly" },
  { loc: "/signup", priority: 0.8, changefreq: "monthly" },
  { loc: "/login", priority: 0.4, changefreq: "monthly" },
  { loc: "/privacy", priority: 0.3, changefreq: "yearly" },
];

// Sample plans (public, indexable preview pages)
const samplePlanSlugs = [
  "feed-a-family-50",
  "more-variety-75",
  "college-eats-35",
  "snap-friendly-meals",
];
const sampleRoutes: Route[] = samplePlanSlugs.map((slug) => ({
  loc: `/sample-plan/${slug}`,
  priority: 0.9,
  changefreq: "weekly",
}));

// Legal / informational pages
const legalRoutes: Route[] = legalPages.map((p) => ({
  loc: `/page/${p.slug}`,
  priority: 0.3,
  changefreq: "yearly",
}));

const routes: Route[] = [...staticRoutes, ...sampleRoutes, ...legalRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${BASE}${r.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const outPath = resolve("public/sitemap.xml");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, xml);
console.log(`Wrote sitemap.xml with ${routes.length} URLs`);
