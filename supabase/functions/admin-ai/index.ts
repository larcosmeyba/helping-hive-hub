import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!role) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "generate_recipe") {
      return await handleGenerateRecipe(body, LOVABLE_API_KEY, supabase);
    } else if (action === "generate_marketing") {
      return await handleGenerateMarketing(body, LOVABLE_API_KEY);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Admin AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGenerateRecipe(
  body: any,
  apiKey: string,
  supabase: any
) {
  const { prompt, saveToDb } = body;

  const systemPrompt = `You are a professional recipe creator for Help The Hive, a budget-friendly meal planning platform. Create detailed, budget-conscious recipes.

You must respond with ONLY valid JSON, no markdown, no explanation:
{
  "title": "Recipe Title",
  "description": "Brief description",
  "category": "Budget Friendly",
  "cook_time_minutes": 30,
  "serving_size": 4,
  "cost_estimate": 8.50,
  "calories": 450,
  "protein_g": 28,
  "carbs_g": 45,
  "fats_g": 14,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["Step 1: Do this", "Step 2: Do that"],
  "is_public": true
}`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt || "Create a budget-friendly dinner recipe under $10 that feeds 4 people" },
      ],
      temperature: 0.8,
    }),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error(`AI gateway error: ${status}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from AI");

  let recipe;
  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    recipe = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse recipe from AI");
  }

  if (saveToDb) {
    const { error } = await supabase.from("recipes").insert({
      title: recipe.title,
      description: recipe.description || null,
      category: recipe.category || null,
      cook_time_minutes: recipe.cook_time_minutes || null,
      serving_size: recipe.serving_size || 4,
      cost_estimate: recipe.cost_estimate || null,
      calories: recipe.calories || null,
      protein_g: recipe.protein_g || null,
      carbs_g: recipe.carbs_g || null,
      fats_g: recipe.fats_g || null,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      is_public: recipe.is_public !== false,
    });
    if (error) throw error;
  }

  return new Response(JSON.stringify(recipe), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleGenerateMarketing(body: any, apiKey: string) {
  const { prompt, platform } = body;

  const systemPrompt = `You are a social media marketing expert for Help The Hive — a budget-friendly meal planning platform that helps families save money on groceries. Create engaging social media content.

You must respond with ONLY valid JSON, no markdown:
{
  "title": "Campaign Title",
  "caption": "The full social media caption with hashtags",
  "platform": "${platform || "instagram"}",
  "notes": "Additional notes or strategy tips",
  "suggestedImagePrompt": "A description of an ideal image to use"
}`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt || "Create an engaging social media post about saving money on groceries" },
      ],
      temperature: 0.9,
    }),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    throw new Error(`AI gateway error: ${status}`);
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from AI");

  let result;
  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    result = JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse marketing content from AI");
  }

  return new Response(JSON.stringify(result), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
