import { useState } from "react";
import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { BULK_BUYING_ITEMS } from "@/data/bulkBuyingItems";
import { SendToInstacartButton } from "@/components/dashboard/SendToInstacartButton";
import { Checkbox } from "@/components/ui/checkbox";

export default function BulkBuyingGuide() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (slug: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const allLineItems = BULK_BUYING_ITEMS.map((item) => ({
    name: item.instacartName,
    quantity: item.instacartQty,
    unit: item.instacartUnit,
  }));

  const selectedLineItems =
    checked.size === 0
      ? allLineItems
      : BULK_BUYING_ITEMS.filter((i) => checked.has(i.slug)).map((item) => ({
          name: item.instacartName,
          quantity: item.instacartQty,
          unit: item.instacartUnit,
        }));

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-12">
      <ResourceBackButton fallback="/dashboard/resources" label="Resources" />
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">What Families Should Buy in Bulk</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save money by buying these items that last longer.
        </p>
      </div>

      {/* Instructional Banner */}
      <div className="bg-primary/[0.06] border border-primary/20 rounded-2xl px-4 py-3.5">
        <p className="text-sm md:text-base font-bold text-foreground text-center leading-snug">
          Select the items you want to shop for, then send items to Instacart to complete your purchase.
        </p>
        <p className="text-xs text-muted-foreground text-center mt-1.5">
          {checked.size > 0
            ? `${checked.size} item${checked.size === 1 ? "" : "s"} selected to send to Instacart`
            : "No items selected — sending all items"}
        </p>
      </div>

      {/* Shop on Instacart CTA */}
      <div className="bg-card rounded-2xl border border-border p-4" style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}>
        <SendToInstacartButton
          title="Bulk Buying — Help The Hive"
          lineItems={selectedLineItems}
          label="Shop on Instacart"
        />
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Instacart handles checkout, substitutions, payment, and delivery. Help The Hive may earn a small affiliate fee that helps keep the app free.
        </p>
      </div>

      <div className="space-y-3">
        {BULK_BUYING_ITEMS.map((item) => {
          const isChecked = checked.has(item.slug);
          return (
            <label
              key={item.slug}
              className="block bg-card border border-border rounded-2xl p-4 cursor-pointer hover:bg-muted/20 transition-colors"
              style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(item.slug)}
                    className="rounded-full"
                  />
                </div>
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {item.shelfLife}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.why}</p>
                  {isChecked && (
                    <p className="text-[11px] font-semibold text-primary mt-2">
                      Added to shopping cart
                    </p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Pricing & availability shown after you tap Checkout. Help The Hive may earn a small affiliate fee that keeps the app free.
      </p>
    </div>
  );
}
