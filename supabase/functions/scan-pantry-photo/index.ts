import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

// ---- SSRF guard ----
// Only allow https URLs OR data: URIs. Reject any URL whose hostname resolves
// to a private/loopback/link-local IP, or is a bare IP literal in those ranges.
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^::1$/i,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
];

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function isAllowedImage(input: string): { ok: true } | { ok: false; reason: string } {
  if (!input || typeof input !== "string") return { ok: false, reason: "empty" };

  // data: URIs (base64 inline images) are accepted — no outbound fetch occurs.
  if (input.startsWith("data:image/")) return { ok: true };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid url" };
  }

  if (url.protocol !== "https:") return { ok: false, reason: "non-https url" };

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return { ok: false, reason: "blocked host" };

  // Reject IP literals in private ranges
  for (const pat of PRIVATE_IP_PATTERNS) {
    if (pat.test(host)) return { ok: false, reason: "private ip" };
  }

  // Reject .local / .internal hostnames
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "internal hostname" };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { image, mode } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- H1 SSRF check ----
    const check = isAllowedImage(image);
    if (!check.ok) {
      console.warn("[scan-pantry-photo] rejected image url:", check.reason);
      return new Response(JSON.stringify({ error: `Invalid image URL: ${check.reason}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = mode === "fridge-chef"
      ? `You are a food identification AI for Help The Hive's FridgeChef feature. Look at this photo of a fridge or pantry and identify ALL food items you can see.

Return ONLY valid JSON:
{
  "items": ["item1", "item2", "item3"],
  "summary": "Brief description of what you see"
}

Rules:
- List every distinct food item you can identify
- Use common grocery names (e.g. "Eggs" not "Grade A Large Eggs")
- Include condiments, sauces, and beverages
- Be specific but concise (e.g. "Cheddar Cheese" not just "Cheese" if you can tell)
- If you see multiple of something, list it once
- Do NOT include non-food items
- If you can't identify specific items, make reasonable guesses based on packaging/appearance`
      : `You are a food identification AI for Help The Hive's pantry tracking system. Look at this photo and identify ALL food items visible.

Return ONLY valid JSON:
{
  "items": [
    {"name": "Item Name", "category": "category_key", "quantity": "estimated quantity"},
  ],
  "summary": "Brief description of what you see"
}

Categories (use these exact keys): grains, proteins, vegetables, fruits, dairy, pantry_staples, frozen_foods, canned_goods

Rules:
- List every distinct food item you can identify
- Use common grocery names
- Estimate quantity when possible (e.g. "1 bag", "2 lbs", "half gallon")
- Assign the most appropriate category
- If you can't identify specific items, make reasonable guesses
- Do NOT include non-food items`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify all food items in this photo." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let result;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scan pantry photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
