import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { BULK_BUYING_ITEMS } from "@/data/bulkBuyingItems";
import { SendToInstacartButton } from "@/components/dashboard/SendToInstacartButton";

export default function BulkBuyingGuide() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-12">
      <ResourceBackButton fallback="/dashboard/resources" label="Resources" />
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">What Families Should Buy in Bulk</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save money by buying these items that last longer.
        </p>
      </div>

      <div className="space-y-3">
        {BULK_BUYING_ITEMS.map((item) => (
          <div
            key={item.slug}
            className="bg-card border border-border rounded-2xl p-4"
            style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}
          >
            <div className="flex items-start gap-3">
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
                <div className="mt-3">
                  <SendToInstacartButton
                    title={`${item.name} — Bulk Buy`}
                    lineItems={[{ name: item.instacartName, quantity: item.instacartQty, unit: item.instacartUnit }]}
                    size="sm"
                    label="Checkout with Instacart"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Pricing & availability shown after you tap Checkout. Help The Hive may earn a small affiliate fee that keeps the app free.
      </p>
    </div>
  );
}
