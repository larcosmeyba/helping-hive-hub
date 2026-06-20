// Shop Groceries — Kroger-only, flag-gated (`new-meal-plan-algorithm`).
// Loads the active meal plan's grocery_list_items, splits by store_section
// bucket prefix, runs Kroger live pricing on Need-To-Buy, audits the
// weekly budget, suggests + applies Fix-My-Budget swaps, persists all
// edits via grocery-list-item-update, opens Kroger checkout via
// ShopGroceriesButton, then optionally bulk-adds purchased items to pantry.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, ShoppingCart, AlertTriangle, Wand2, Trash2, CheckCircle2, PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useKrogerConnection } from "@/hooks/useKrogerConnection";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { ShopGroceriesButton } from "@/components/dashboard/ShopGroceriesButton";
import { PricingDisclaimer } from "@/components/PricingDisclaimer";
import {
  computeBudgetFix,
  type FixItem,
  type FixSuggestion,
} from "../../../supabase/functions/_shared/budgetFix";

type Bucket = "use_first" | "already_have" | "need_to_buy";

interface ListItem {
  id: string;
  ingredient_name: string;
  quantity: string;
  unit: string | null;
  category: string | null;
  estimated_price: number | null;
  already_have: boolean | null;
  needed_for_meals: string[] | null;
  store_section: string | null;
  recipe_id: string | null;
  bucket: Bucket;
  parsedQty: number;
  // Kroger live-match enrichment
  matched_name?: string;
  brand?: string | null;
  unit_price?: number;
  availability?: string | null;
  confidence?: number;
}

interface KrogerMatch {
  ingredient_name: string;
  status: "matched" | "no_match";
  matched_name?: string;
  brand?: string | null;
  unit_price?: number;
  confidence?: number;
  availability?: string | null;
}

const TARGET_BUDGET_RATIO = 0.95;

function parseQty(s: string): number {
  const m = String(s ?? "").match(/[\d.]+/);
  const n = m ? Number(m[0]) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function splitSection(s: string | null, alreadyHave: boolean | null): { bucket: Bucket; category: string } {
  if (s && s.includes(":")) {
    const [b, c] = s.split(":", 2);
    if (b === "use_first" || b === "already_have" || b === "need_to_buy") {
      return { bucket: b, category: c || "Other" };
    }
    return { bucket: alreadyHave ? "already_have" : "need_to_buy", category: s };
  }
  return { bucket: alreadyHave ? "already_have" : "need_to_buy", category: s ?? "Other" };
}

export default function ShopGroceriesPage() {
  const flagOn = useFeatureFlag("new-meal-plan-algorithm");
  const { user, profile } = useAuth();
  const kroger = useKrogerConnection();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [shopping, setShopping] = useState(false);
  const [showPantryPrompt, setShowPantryPrompt] = useState(false);
  const [showFix, setShowFix] = useState(false);

  const weeklyBudget = Number(profile?.weekly_budget ?? 0);

  // ---- Load active plan + items -------------------------------------------------
  useEffect(() => {
    if (!flagOn || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!plan) { setLoading(false); return; }
      setPlanId(plan.id);

      const { data: rows } = await supabase
        .from("grocery_list_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("meal_plan_id", plan.id);
      if (cancelled) return;
      const parsed: ListItem[] = (rows ?? []).map((r: any) => {
        const { bucket, category } = splitSection(r.store_section, r.already_have);
        return {
          id: r.id,
          ingredient_name: r.ingredient_name,
          quantity: r.quantity,
          unit: r.unit,
          category: category ?? r.category ?? "Other",
          estimated_price: r.estimated_price,
          already_have: r.already_have,
          needed_for_meals: r.needed_for_meals,
          store_section: r.store_section,
          recipe_id: r.recipe_id,
          bucket,
          parsedQty: parseQty(r.quantity),
        };
      });
      setItems(parsed);
      setLoading(false);
      void trackEvent("shop_groceries_opened", {
        meal_plan_id: plan.id,
        item_count: parsed.length,
        algorithm_version: "algo_v2",
      });
      const alreadyHaveCount = parsed.filter((i) => i.bucket === "already_have").length;
      const alreadyHaveSaved = parsed
        .filter((i) => i.bucket === "already_have")
        .reduce((s, i) => s + (i.estimated_price ?? 0) * i.parsedQty, 0);
      if (alreadyHaveCount > 0) {
        void trackEvent("pantry_items_removed_from_total", {
          count: alreadyHaveCount,
          dollars_saved: Math.round(alreadyHaveSaved * 100) / 100,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [flagOn, user?.id]);

  // ---- Kroger pricing ----------------------------------------------------------
  const needToBuy = useMemo(() => items.filter((i) => i.bucket === "need_to_buy"), [items]);

  const runMatch = async (opts: { skipCache?: boolean } = {}) => {
    if (!kroger.ready || !kroger.locationId || !needToBuy.length) return;
    setMatching(true);
    void trackEvent("kroger_product_match_started", { count: needToBuy.length, live: !!opts.skipCache });
    try {
      const payload = needToBuy.map((i) => ({ id: i.id, name: i.ingredient_name, quantity: i.parsedQty }));
      const { data, error } = await supabase.functions.invoke("kroger-match-grocery-list", {
        body: { items: payload, locationId: kroger.locationId, skipCache: !!opts.skipCache },
      });
      if (error) throw error;
      const matches: KrogerMatch[] = data?.matches ?? [];
      const byName = new Map(matches.map((m) => [m.ingredient_name, m]));
      setItems((prev) => prev.map((it) => {
        if (it.bucket !== "need_to_buy") return it;
        const m = byName.get(it.ingredient_name);
        if (!m) return it;
        return {
          ...it,
          matched_name: m.matched_name,
          brand: m.brand,
          unit_price: m.unit_price,
          availability: m.availability,
          confidence: m.confidence,
        };
      }));
      const matched = matches.filter((m) => m.status === "matched");
      const avgConf = matched.length
        ? matched.reduce((s, m) => s + (m.confidence ?? 0), 0) / matched.length
        : 0;
      void trackEvent("kroger_product_match_completed", {
        matched: matched.length,
        failed: matches.length - matched.length,
        avg_confidence: Math.round(avgConf * 100) / 100,
      });
    } catch (e: any) {
      toast({ title: "Kroger pricing unavailable", description: e?.message ?? "Showing estimates.", variant: "default" });
    } finally {
      setMatching(false);
    }
  };

  useEffect(() => {
    if (kroger.ready && needToBuy.length && !matching && !needToBuy.some((i) => i.unit_price != null)) {
      void runMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kroger.ready, kroger.locationId, needToBuy.length]);

  // ---- Totals + audit ----------------------------------------------------------
  const total = useMemo(
    () => Math.round(needToBuy.reduce((s, i) => s + (i.unit_price ?? i.estimated_price ?? 0) * i.parsedQty, 0) * 100) / 100,
    [needToBuy],
  );
  const target = Math.round(weeklyBudget * TARGET_BUDGET_RATIO * 100) / 100;
  const over = weeklyBudget > 0 && total > weeklyBudget;
  const remaining = Math.round((weeklyBudget - total) * 100) / 100;
  const avgConfidence = useMemo(() => {
    const conf = needToBuy.map((i) => i.confidence).filter((c): c is number => typeof c === "number");
    return conf.length ? Math.round((conf.reduce((s, c) => s + c, 0) / conf.length) * 100) / 100 : null;
  }, [needToBuy]);

  useEffect(() => {
    if (!weeklyBudget || loading) return;
    if (over) {
      void trackEvent("grocery_budget_audit_failed", { total, weekly_budget: weeklyBudget, over_by: Math.abs(remaining) });
      setShowFix(true);
    } else {
      void trackEvent("grocery_budget_audit_passed", { total, weekly_budget: weeklyBudget });
      setShowFix(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, weeklyBudget, over]);

  // ---- Budget Fix --------------------------------------------------------------
  const fix = useMemo(() => {
    const fixItems: FixItem[] = needToBuy.map((i) => ({
      id: i.id,
      name: i.ingredient_name,
      category: i.category,
      quantity: i.parsedQty,
      unit_price: i.unit_price ?? i.estimated_price ?? 0,
      brand: i.brand ?? null,
      recipe_id: i.recipe_id,
    }));
    return computeBudgetFix({
      items: fixItems,
      pantry: items.filter((i) => i.bucket === "already_have").map((i) => ({ name: i.ingredient_name })),
      weeklyBudget: weeklyBudget || 0,
      storeBrandName: "Kroger",
    });
  }, [needToBuy, items, weeklyBudget]);

  const reloadItems = async () => {
    if (!user || !planId) return;
    const { data: rows } = await supabase
      .from("grocery_list_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("meal_plan_id", planId);
    const parsed: ListItem[] = (rows ?? []).map((r: any) => {
      const { bucket, category } = splitSection(r.store_section, r.already_have);
      return {
        id: r.id,
        ingredient_name: r.ingredient_name,
        quantity: r.quantity,
        unit: r.unit,
        category: category ?? r.category ?? "Other",
        estimated_price: r.estimated_price,
        already_have: r.already_have,
        needed_for_meals: r.needed_for_meals,
        store_section: r.store_section,
        recipe_id: r.recipe_id,
        bucket,
        parsedQty: parseQty(r.quantity),
      };
    });
    setItems(parsed);
  };

  const applySuggestion = async (s: FixSuggestion): Promise<boolean> => {
    try {
      if (s.type === "drop_optional") {
        await supabase.functions.invoke("grocery-list-item-update", {
          body: { item_id: s.item_id, action: "remove" },
        });
        setItems((p) => p.filter((i) => i.id !== s.item_id));
      } else if (s.type === "use_more_pantry") {
        await supabase.functions.invoke("grocery-list-item-update", {
          body: { item_id: s.item_id, action: "mark_already_have", already_have: true },
        });
        setItems((p) => p.map((i) => i.id === s.item_id ? { ...i, already_have: true, bucket: "already_have" } : i));
      } else if (s.type === "cheaper_recipe") {
        // Recipe swap is suggested only — invoke existing swap-meal then reload list.
        await supabase.functions.invoke("swap-meal", { body: { recipe_id: s.item_id } }).catch(() => null);
        await reloadItems();
      } else {
        await supabase.functions.invoke("grocery-list-item-update", {
          body: {
            item_id: s.item_id, action: "substitute",
            ingredient_name: s.to_name, estimated_price: s.new_unit_price,
          },
        });
        setItems((p) => p.map((i) => i.id === s.item_id
          ? { ...i, ingredient_name: s.to_name, estimated_price: s.new_unit_price ?? i.estimated_price, unit_price: s.new_unit_price, matched_name: undefined }
          : i));
        void trackEvent("item_substituted", {
          item_id: s.item_id,
          from_name: s.from_name,
          to_name: s.to_name,
          dollars_saved: s.dollars_saved,
          source: "budget_fix",
          strategy: s.type,
        });
      }
      return true;
    } catch (e: any) {
      toast({ title: "Could not apply swap", description: e?.message ?? "", variant: "destructive" });
      return false;
    }
  };

  const fixMyBudget = async () => {
    void trackEvent("fix_my_budget_clicked", { suggestions: fix.best_combo.length });
    const applied: FixSuggestion[] = [];
    for (const s of fix.best_combo) {
      if (await applySuggestion(s)) applied.push(s);
    }
    void trackEvent("budget_fix_applied", {
      strategies: applied.map((s) => s.type),
      total_saved: applied.reduce((sum, s) => sum + s.dollars_saved, 0),
    });
    toast({ title: "Budget adjusted", description: `Saved $${applied.reduce((s, x) => s + x.dollars_saved, 0).toFixed(2)}.` });
    await runMatch({ skipCache: true });
  };


  // ---- Manual edits ------------------------------------------------------------
  const removeItem = async (item: ListItem) => {
    await supabase.functions.invoke("grocery-list-item-update", {
      body: { item_id: item.id, action: "remove" },
    });
    setItems((p) => p.filter((i) => i.id !== item.id));
    void trackEvent("item_removed", { item_id: item.id });
  };
  const toggleAlreadyHave = async (item: ListItem) => {
    const next = item.bucket !== "already_have";
    await supabase.functions.invoke("grocery-list-item-update", {
      body: { item_id: item.id, action: "mark_already_have", already_have: next },
    });
    setItems((p) => p.map((i) => i.id === item.id
      ? { ...i, already_have: next, bucket: next ? "already_have" : "need_to_buy" }
      : i));
    void trackEvent("marked_already_have", { item_id: item.id, already_have: next });
  };

  const substituteItem = async (item: ListItem) => {
    const raw = window.prompt(`Substitute "${item.ingredient_name}" with:`, item.ingredient_name);
    if (!raw) return;
    const to = raw.trim().slice(0, 200);
    if (!to || to === item.ingredient_name) return;
    const priceRaw = window.prompt("Estimated unit price (USD)?", String(item.unit_price ?? item.estimated_price ?? ""));
    const newPrice = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : undefined;
    if (newPrice != null && (!Number.isFinite(newPrice) || newPrice < 0 || newPrice > 10000)) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    const { error } = await supabase.functions.invoke("grocery-list-item-update", {
      body: { item_id: item.id, action: "substitute", ingredient_name: to, estimated_price: newPrice },
    });
    if (error) {
      toast({ title: "Could not substitute", description: error.message, variant: "destructive" });
      return;
    }
    setItems((p) => p.map((i) => i.id === item.id
      ? { ...i, ingredient_name: to, estimated_price: newPrice ?? i.estimated_price, unit_price: newPrice, matched_name: undefined }
      : i));
    void trackEvent("item_substituted", {
      item_id: item.id,
      from_name: item.ingredient_name,
      to_name: to,
      dollars_saved: 0,
      source: "manual",
    });
  };

  // ---- Checkout ----------------------------------------------------------------
  const markShopped = async () => {
    if (!planId) return;
    const { error } = await supabase.functions.invoke("update-grocery-status", {
      body: { meal_plan_id: planId, status: "shopped" },
    });
    if (error) {
      toast({ title: "Couldn't mark shopped", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const checkout = async () => {
    setShopping(true);
    // Final price check (live, skipping cache)
    await runMatch({ skipCache: true });
    void trackEvent("shop_with_kroger_clicked", { item_count: needToBuy.length, algorithm_version: "algo_v2" });
    // Persist "shopped" up front so dismissing the pantry prompt still records the action.
    await markShopped();
    setShowPantryPrompt(true);
    setShopping(false);
  };

  const addBoughtToPantry = async () => {
    if (!planId) return;
    void trackEvent("pantry_update_after_shop_clicked", { meal_plan_id: planId, count: needToBuy.length });
    // Status already persisted in checkout(); just sync the pantry.
    const payload = needToBuy.slice(0, 100).map((i) => ({
      item_name: i.matched_name ?? i.ingredient_name,
      quantity: i.parsedQty, unit: i.unit, category: i.category,
    }));
    const { error } = await supabase.functions.invoke("pantry-bulk-add", { body: { items: payload } });
    if (error) {
      toast({ title: "Couldn't update pantry", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pantry updated", description: `Added ${payload.length} item(s).` });
    }
    setShowPantryPrompt(false);
    navigate("/dashboard/pantry");
  };


  // ---- Render ------------------------------------------------------------------
  if (!flagOn) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Shop Groceries is rolling out. Use your existing grocery list for now.
        </p>
        <Button className="mt-4" onClick={() => navigate("/dashboard/grocery-list")}>Open Grocery List</Button>
      </div>
    );
  }
  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;
  }
  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <h1 className="text-xl font-bold mb-2">No active grocery list</h1>
        <p className="text-sm text-muted-foreground mb-4">Generate a meal plan to build one.</p>
        <Button onClick={() => navigate("/dashboard/meal-plan")}>Go to Meal Plan</Button>
      </div>
    );
  }

  const useFirst = items.filter((i) => i.bucket === "use_first");
  const alreadyHave = items.filter((i) => i.bucket === "already_have");
  const alreadyHaveSaved = alreadyHave.reduce((s, i) => s + (i.estimated_price ?? 0) * i.parsedQty, 0);

  const byCategory = needToBuy.reduce<Record<string, ListItem[]>>((acc, it) => {
    const k = it.category ?? "Other";
    (acc[k] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Shop Groceries</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">algo_v2</Badge>
      </div>

      {/* Budget audit */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Weekly budget</span>
          <span className="font-semibold">${weeklyBudget.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Target spend (95%)</span>
          <span>${target.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Grocery total</span>
          <span className="font-bold text-lg">${total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{over ? "Over budget" : "Remaining"}</span>
          <span className={`font-bold ${over ? "text-destructive" : "text-emerald-700"}`}>
            {over ? `-$${Math.abs(remaining).toFixed(2)}` : `$${remaining.toFixed(2)}`}
          </span>
        </div>
        {avgConfidence !== null && (
          <p className="text-[11px] text-muted-foreground pt-1">Price confidence: {(avgConfidence * 100).toFixed(0)}%</p>
        )}
        {!kroger.ready && (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => kroger.connect("/dashboard/grocery/shop")}>
            Connect Kroger for live pricing
          </Button>
        )}
      </div>

      {/* Fix My Budget */}
      {showFix && fix.suggestions.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="font-semibold text-sm">Over budget by ${Math.abs(remaining).toFixed(2)} — try these swaps</p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {fix.suggestions.slice(0, 6).map((s, i) => (
              <li key={i} className="flex items-center gap-2 justify-between">
                <span className="truncate">
                  <span className="text-muted-foreground">{s.from_name}</span> → <span className="font-medium">{s.to_name}</span>
                </span>
                <span className="text-emerald-700 font-semibold shrink-0">save ${s.dollars_saved.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={fixMyBudget} className="w-full">
            <Wand2 className="h-4 w-4 mr-1.5" /> Fix My Budget — save ${fix.combo_total_saved.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Use First */}
      {useFirst.length > 0 && (
        <Section title="Use First (expiring)" subtitle="From your pantry, used by this plan.">
          {useFirst.map((i) => <Row key={i.id} item={i} onRemove={removeItem} onToggleHave={toggleAlreadyHave} onSubstitute={substituteItem} />)}
        </Section>
      )}

      {/* Already Have */}
      {alreadyHave.length > 0 && (
        <Section
          title={`Already Have (${alreadyHave.length})`}
          subtitle={`$0 — saved ~$${alreadyHaveSaved.toFixed(2)}`}
        >
          {alreadyHave.map((i) => <Row key={i.id} item={i} onRemove={removeItem} onToggleHave={toggleAlreadyHave} onSubstitute={substituteItem} />)}
        </Section>
      )}

      {/* Need To Buy by category */}
      {Object.entries(byCategory).map(([cat, list]) => (
        <Section key={cat} title={cat} subtitle={`${list.length} item(s)`}>
          {list.map((i) => <Row key={i.id} item={i} onRemove={removeItem} onToggleHave={toggleAlreadyHave} onSubstitute={substituteItem} />)}
        </Section>
      ))}

      <PricingDisclaimer />

      {/* Checkout */}
      <div className="sticky bottom-2 z-10 rounded-2xl border border-border bg-card p-3 shadow-md space-y-2">
        <ShopGroceriesButton
          title="Shop Groceries"
          lineItems={needToBuy.map((i) => ({
            name: i.matched_name ?? i.ingredient_name,
            quantity: i.parsedQty,
            unit: i.unit ?? undefined,
          }))}
          fullWidth
          label={shopping ? "Re-pricing…" : `Shop at Kroger — $${total.toFixed(2)}`}
        />
        <Button variant="outline" className="w-full" onClick={checkout} disabled={shopping || matching}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Mark as shopped
        </Button>
      </div>

      {showPantryPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4" onClick={() => setShowPantryPrompt(false)}>
          <div className="bg-card rounded-2xl p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Add these groceries to your pantry?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              We'll add {needToBuy.length} item(s) with estimated expirations so Cook What I Have and Food Waste Alerts stay accurate.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPantryPrompt(false)}>Not now</Button>
              <Button className="flex-1" onClick={addBoughtToPantry}>Add to pantry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 flex items-center gap-2">
        <p className="text-sm font-bold">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground ml-auto">{subtitle}</p>}
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

function Row({ item, onRemove, onToggleHave, onSubstitute }: {
  item: ListItem;
  onRemove: (i: ListItem) => void;
  onToggleHave: (i: ListItem) => void;
  onSubstitute: (i: ListItem) => void;
}) {
  const price = item.unit_price ?? item.estimated_price ?? 0;
  const lineTotal = price * item.parsedQty;
  const isHave = item.bucket === "already_have";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.matched_name ?? item.ingredient_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {item.quantity}{item.unit ? ` ${item.unit}` : ""}
          {item.brand ? ` · ${item.brand}` : ""}
          {item.availability && ` · ${item.availability.toLowerCase()}`}
          {typeof item.confidence === "number" && ` · ${(item.confidence * 100).toFixed(0)}% match`}
        </p>
        {item.needed_for_meals?.length ? (
          <p className="text-[10px] text-muted-foreground truncate">used in: {item.needed_for_meals.slice(0, 2).join(", ")}</p>
        ) : null}
      </div>
      <span className={`text-sm font-semibold shrink-0 ${isHave ? "line-through text-muted-foreground" : ""}`}>
        ${lineTotal.toFixed(2)}
      </span>
      <div className="flex flex-col gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => onToggleHave(item)}>
          {isHave ? "Need" : "Have"}
        </Button>
        {!isHave && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => onSubstitute(item)}>
            Sub
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => onRemove(item)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

