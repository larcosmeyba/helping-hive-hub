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
            Shop Smarter with Instacart
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Help The Hive partners with Instacart to make grocery shopping simple
            and stress-free. Once your personalized grocery list is created, you
            can send it directly to Instacart for pickup or delivery. By shopping
            only for the items on your list, you’ll avoid impulse purchases, stay
            within your grocery budget, and make healthy eating easier than ever.
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
