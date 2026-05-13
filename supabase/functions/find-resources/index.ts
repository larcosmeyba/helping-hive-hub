// Live nationwide resource finder by ZIP + category.
// Uses free public APIs (no API keys) and falls back to authoritative
// ZIP-prefilled deep-links so no category is ever empty.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Resource {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  website?: string | null;
  tags?: string[];
  is_national?: boolean;
  is_link?: boolean; // pure deep-link card
  about?: string | null;
  distance_mi?: number | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; city?: string; state?: string } | null> {
  try {
    // Census Geocoder (free, no key)
    const url = `https://geocoding.geo.census.gov/geocoder/locations/address?street=&city=&state=&zip=${encodeURIComponent(zip)}&benchmark=Public_AR_Current&format=json`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0];
    if (!m) return null;
    return {
      lat: m.coordinates?.y,
      lng: m.coordinates?.x,
      city: m.addressComponents?.city,
      state: m.addressComponents?.state,
    };
  } catch {
    return null;
  }
}

function distMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

// ---------- Live providers ----------

async function hrsaHealthCenters(loc: { lat: number; lng: number }): Promise<Resource[]> {
  // HRSA public ArcGIS: Health Center Service Delivery Sites
  // Filter by distance using a bbox ~ 0.5deg (~35mi)
  const d = 0.5;
  const where = `1=1`;
  const url =
    `https://services1.arcgis.com/4yjifSiIG17X0gW4/arcgis/rest/services/HRSA_HC_Sites/FeatureServer/0/query` +
    `?where=${encodeURIComponent(where)}` +
    `&geometry=${loc.lng - d},${loc.lat - d},${loc.lng + d},${loc.lat + d}` +
    `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=Site_Name,Site_Address,Site_City,Site_State_Abbreviation,Site_Postal_Code,Site_Telephone_Number,Site_Web_Address` +
    `&returnGeometry=true&outSR=4326&f=json&resultRecordCount=25`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const features: any[] = j?.features ?? [];
    return features
      .map((f, i) => {
        const a = f.attributes ?? {};
        const g = f.geometry ?? {};
        const dist = g.x && g.y ? distMi(loc, { lat: g.y, lng: g.x }) : null;
        return {
          id: `hrsa-${a.Site_Name}-${i}`,
          name: a.Site_Name,
          address: a.Site_Address,
          city: a.Site_City,
          state: a.Site_State_Abbreviation,
          phone: a.Site_Telephone_Number,
          website: a.Site_Web_Address,
          tags: ["Health Center", "Sliding Scale"],
          distance_mi: dist,
        } as Resource;
      })
      .filter((r) => r.name)
      .sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999))
      .slice(0, 15);
  } catch {
    return [];
  }
}

async function snapRetailers(loc: { lat: number; lng: number }): Promise<Resource[]> {
  // USDA SNAP Retailer Locator (public ArcGIS)
  const d = 0.15; // ~10mi
  const url =
    `https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/Store_Locations/FeatureServer/0/query` +
    `?where=1=1&geometry=${loc.lng - d},${loc.lat - d},${loc.lng + d},${loc.lat + d}` +
    `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=Store_Name,Address,City,State,Zip5,Store_Type` +
    `&returnGeometry=true&outSR=4326&f=json&resultRecordCount=25`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const features: any[] = j?.features ?? [];
    return features
      .map((f, i) => {
        const a = f.attributes ?? {};
        const g = f.geometry ?? {};
        const dist = g.x && g.y ? distMi(loc, { lat: g.y, lng: g.x }) : null;
        return {
          id: `snap-${i}-${a.Store_Name}`,
          name: a.Store_Name,
          address: a.Address,
          city: a.City,
          state: a.State,
          tags: ["Accepts SNAP/EBT", a.Store_Type].filter(Boolean) as string[],
          distance_mi: dist,
          about: "This store accepts SNAP/EBT benefits.",
        } as Resource;
      })
      .filter((r) => r.name)
      .sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999))
      .slice(0, 15);
  } catch {
    return [];
  }
}

async function samhsaTreatment(loc: { lat: number; lng: number }): Promise<Resource[]> {
  // SAMHSA findtreatment.gov has a public JSON endpoint
  try {
    const url = `https://findtreatment.gov/locator/exportsAsJson/v2?sType=SA&sCodes=&pageSize=20&page=1&sAddr=${loc.lat},${loc.lng}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const rows: any[] = j?.rows ?? j?.facilities ?? [];
    return rows.slice(0, 15).map((row: any, i: number) => ({
      id: `samhsa-${i}-${row.name1 ?? row.name}`,
      name: row.name1 ?? row.name ?? "Treatment Facility",
      address: row.street1 ?? row.street,
      city: row.city,
      state: row.state,
      phone: row.phone,
      website: row.website,
      tags: ["Mental Health", "Substance Use"],
      distance_mi: typeof row.miles === "number" ? Math.round(row.miles * 10) / 10 : null,
    }));
  } catch {
    return [];
  }
}

// ---------- Deep-link fallbacks (always returned) ----------
// These ensure a category is never empty: authoritative ZIP-prefilled finders.

function deepLinks(category: string, zip: string, state?: string): Resource[] {
  const ST = state ?? "";
  const links: Record<string, Resource[]> = {
    "food-bank": [
      { id: "fa-locator", name: "Feeding America — Find Your Local Food Bank", website: `https://www.feedingamerica.org/find-your-local-foodbank?zip=${zip}`, tags: ["Find Food", "By ZIP"], is_national: true, is_link: true, about: "Searchable directory of 200+ regional food banks and 60,000+ partner pantries nationwide." },
      { id: "foodpantries", name: "FoodPantries.org Directory", website: `https://www.foodpantries.org/zi/${zip}`, tags: ["Pantries", "Local"], is_national: true, is_link: true },
      { id: "211-food", name: "211 — Food Assistance Near You", website: `https://www.211.org/services/food`, phone: "211", tags: ["Call 211"], is_national: true, is_link: true },
    ],
    "diapers-formula-clothing": [
      { id: "ndbn", name: "National Diaper Bank Network — Find a Bank", website: "https://nationaldiaperbanknetwork.org/get-help/", tags: ["Diapers"], is_national: true, is_link: true },
      { id: "babies-haven", name: "Baby2Baby Partner Network", website: "https://baby2baby.org/our-network/", tags: ["Baby Supplies"], is_national: true, is_link: true },
      { id: "wic-formula", name: "WIC — Free Formula & Baby Food", website: "https://www.fns.usda.gov/wic/applicants-participants/how-apply", tags: ["Formula", "WIC"], is_national: true, is_link: true },
    ],
    "clean-water": [
      { id: "lihwap", name: "LIHWAP — Low-Income Water Assistance", website: "https://www.acf.hhs.gov/ocs/programs/lihwap", tags: ["Water Bill Help"], is_national: true, is_link: true },
      { id: "epa-water", name: "EPA — Find Your Water Provider", website: `https://www.epa.gov/ground-water-and-drinking-water/find-information-about-your-local-drinking-water`, tags: ["Water Quality"], is_national: true, is_link: true },
    ],
    "housing-shelter": [
      { id: "hud-locator", name: "HUD — Find Local Housing Help", website: `https://www.hud.gov/topics/rental_assistance/local`, tags: ["Rental Assistance"], is_national: true, is_link: true },
      { id: "hud-shelter", name: "HUD Shelter Locator", website: `https://resources.hud.gov/`, tags: ["Shelters"], is_national: true, is_link: true },
      { id: "211-housing", name: "211 — Housing & Shelter", phone: "211", website: "https://www.211.org/services/housing", tags: ["Call 211"], is_national: true, is_link: true },
    ],
    "snap-wic": [
      { id: "snap-state", name: "Apply for SNAP — Your State Office", website: "https://www.fns.usda.gov/snap/state-directory", tags: ["Apply for SNAP"], is_national: true, is_link: true },
      { id: "wic-apply", name: "Apply for WIC", website: "https://www.fns.usda.gov/wic/applicants-participants/how-apply", tags: ["WIC"], is_national: true, is_link: true },
      { id: "snap-prescreen", name: "SNAP Pre-Screening Tool", website: "https://www.snapscreener.com/", tags: ["Eligibility"], is_national: true, is_link: true },
    ],
    "utility": [
      { id: "liheap", name: "LIHEAP — Energy Bill Assistance", website: `https://liheapch.acf.hhs.gov/help`, tags: ["Heating/Cooling"], is_national: true, is_link: true },
      { id: "lifeline", name: "FCC Lifeline — Free/Discounted Phone & Internet", website: "https://www.lifelinesupport.org/", tags: ["Phone", "Internet"], is_national: true, is_link: true },
      { id: "acp", name: "Affordable Connectivity — Internet Discount", website: "https://www.affordableconnectivity.gov/", tags: ["Internet"], is_national: true, is_link: true },
    ],
    "free-meals": [
      { id: "summer-meals", name: "USDA Summer Meals for Kids", website: `https://www.fns.usda.gov/meals4kids`, tags: ["Kids Meals"], is_national: true, is_link: true },
      { id: "211-meals", name: "211 — Free Community Meals", phone: "211", website: "https://www.211.org/services/food", tags: ["Soup Kitchens"], is_national: true, is_link: true },
    ],
    "healthcare": [
      { id: "hrsa-fallback", name: "HRSA — Find a Health Center", website: `https://findahealthcenter.hrsa.gov/?zip=${zip}`, tags: ["Sliding Scale Clinics"], is_national: true, is_link: true },
      { id: "freeclinics", name: "Free Clinic Directory (NAFC)", website: "https://nafcclinics.org/find-clinic/", tags: ["Free Clinics"], is_national: true, is_link: true },
      { id: "rx-assist", name: "NeedyMeds — Free/Low-Cost Prescriptions", website: "https://www.needymeds.org/", tags: ["Medications"], is_national: true, is_link: true },
    ],
    "mental-health": [
      { id: "988", name: "988 Suicide & Crisis Lifeline", phone: "988", website: "https://988lifeline.org/", tags: ["24/7", "Crisis"], is_national: true, is_link: true },
      { id: "samhsa", name: "SAMHSA Treatment Locator", website: `https://findtreatment.gov/locator?sAddr=${zip}`, tags: ["Therapy", "Treatment"], is_national: true, is_link: true },
      { id: "openpath", name: "Open Path — Affordable Therapy ($30-80)", website: "https://openpathcollective.org/", tags: ["Therapy"], is_national: true, is_link: true },
    ],
    "employment": [
      { id: "careeronestop", name: "CareerOneStop — American Job Center Finder", website: `https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx?zip=${zip}`, tags: ["Job Centers"], is_national: true, is_link: true },
      { id: "dol", name: "Department of Labor — Apprenticeship Finder", website: "https://www.apprenticeship.gov/apprenticeship-job-finder", tags: ["Apprenticeships"], is_national: true, is_link: true },
    ],
    "transportation": [
      { id: "rides", name: "Rides in Sight — Senior/Disabled Transit Finder", website: `https://ridesinsight.org/`, tags: ["Senior Rides"], is_national: true, is_link: true },
      { id: "211-transit", name: "211 — Transportation Assistance", phone: "211", website: "https://www.211.org/services/transportation", tags: ["Call 211"], is_national: true, is_link: true },
    ],
    "student-family": [
      { id: "headstart", name: "Head Start — Free Preschool Locator", website: `https://eclkc.ohs.acf.hhs.gov/center-locator?zip=${zip}`, tags: ["Preschool"], is_national: true, is_link: true },
      { id: "fafsa", name: "FAFSA — Federal Student Aid", website: "https://studentaid.gov/h/apply-for-aid/fafsa", tags: ["College Aid"], is_national: true, is_link: true },
      { id: "211-fam", name: "211 — Family Services", phone: "211", website: "https://www.211.org/services/people", tags: ["Call 211"], is_national: true, is_link: true },
    ],
    "senior": [
      { id: "elder-locator", name: "Eldercare Locator — Senior Services by ZIP", website: `https://eldercare.acl.gov/Public/Index.aspx`, phone: "1-800-677-1116", tags: ["All Senior Services"], is_national: true, is_link: true },
      { id: "ssa", name: "Social Security Administration", website: "https://www.ssa.gov/", tags: ["Benefits"], is_national: true, is_link: true },
      { id: "medicare", name: "Medicare.gov", website: "https://www.medicare.gov/", tags: ["Healthcare"], is_national: true, is_link: true },
    ],
    "emergency": [
      { id: "911", name: "911 — Life-threatening Emergency", phone: "911", tags: ["24/7"], is_national: true, is_link: true },
      { id: "211-em", name: "211 — Local Emergency Help", phone: "211", website: "https://www.211.org/", tags: ["Call 211"], is_national: true, is_link: true },
      { id: "redcross", name: "Red Cross — Disaster Help", website: "https://www.redcross.org/get-help.html", tags: ["Disaster"], is_national: true, is_link: true },
      { id: "dv", name: "National Domestic Violence Hotline", phone: "1-800-799-7233", website: "https://www.thehotline.org/", tags: ["DV", "24/7"], is_national: true, is_link: true },
    ],
  };
  return links[category] ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { zip, category } = await req.json();
    if (!zip || !/^\d{5}$/.test(String(zip))) return json({ error: "valid 5-digit ZIP required" }, 400);
    if (!category || typeof category !== "string") return json({ error: "category required" }, 400);

    const loc = await geocodeZip(String(zip));
    let live: Resource[] = [];
    if (loc) {
      if (category === "healthcare") live = await hrsaHealthCenters(loc);
      else if (category === "snap-wic") live = await snapRetailers(loc);
      else if (category === "mental-health") live = await samhsaTreatment(loc);
    }

    const links = deepLinks(category, String(zip), loc?.state);

    return json({
      location: loc,
      live_count: live.length,
      resources: [...live, ...links],
    });
  } catch (e) {
    console.error("find-resources error", e);
    return json({ error: "internal error" }, 500);
  }
});
