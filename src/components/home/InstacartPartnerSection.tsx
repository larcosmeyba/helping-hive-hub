import instacartLogo from "@/assets/instacart/logo-cashew.png.asset.json";

export function InstacartPartnerSection() {
  return (
    <section aria-labelledby="instacart-partner-heading" className="py-16 bg-white">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-[#003D29] p-8 md:p-12 text-center shadow-sm">
          <img
            src={instacartLogo.url}
            alt="Instacart"
            className="h-10 md:h-12 w-auto mx-auto mb-6"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-[#FAF1E5]/70 mb-3">
            Integrated with the Instacart Developer Platform
          </p>

          <h2 id="instacart-partner-heading" className="text-2xl md:text-3xl font-bold text-[#FAF1E5]">
            Shop smarter with the Instacart<sup>®</sup> app
          </h2>
        </div>
      </div>
    </section>
  );
}
