import { ShoppingBag } from "lucide-react";

export function InstacartPartnerSection() {
  return (
    <section aria-labelledby="instacart-partner-heading" className="py-16 bg-white">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-[hsl(43_100%_96%)] p-8 md:p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#003D29] mb-5">
            <ShoppingBag className="w-7 h-7 text-[#FAF1E5]" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Official Partner
          </p>
          <h2 id="instacart-partner-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Proudly partnered with Instacart
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn your weekly meal plan into a ready-to-checkout cart in one tap.
            Help The Hive sends your full grocery list straight to Instacart for
            same-day delivery or pickup from the stores you already shop at.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            Help The Hive may earn a commission from qualifying Instacart orders.
            This supports keeping the app 100% free for every family.
          </p>
        </div>
      </div>
    </section>
  );
}
