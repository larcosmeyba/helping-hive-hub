import { motion } from "framer-motion";
import { Sparkles, Archive, ShoppingCart, Wallet, Heart, Check } from "lucide-react";
import { DownloadAppButtons } from "@/components/DownloadAppButtons";
import heroBowl from "@/assets/recipe-stir-fry.jpg";

const pills = [
  { icon: Sparkles, label: "AI Meal\nPlanning", color: "text-primary" },
  { icon: Archive, label: "Pantry\nTracking", color: "text-primary" },
  { icon: ShoppingCart, label: "Grocery\nLists", color: "text-accent" },
  { icon: Wallet, label: "Budget\nInsights", color: "text-violet-500" },
  { icon: Heart, label: "Family\nAssistance", color: "text-rose-500" },
];

const trustItems = [
  "Free To Use",
  "Powered By Instacart",
  "AI-Powered",
  "Built For Real Families",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-honey-cream">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        {/* LEFT — copy */}
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl w-full"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full"
              style={{ backgroundColor: "#E6F4E6", color: "#1F5A2C" }}
            >
              <Heart className="w-3.5 h-3.5" fill="#1F5A2C" stroke="#1F5A2C" />
              Free For Every Family
            </span>

            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-charcoal leading-[1.05] mb-6">
              Save Money On Groceries.{" "}
              <span className="text-primary block mt-2">Feed Your Family Smarter.</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-7 leading-relaxed">
              Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {pills.map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl bg-white border border-border shadow-sm text-[12px] font-semibold text-charcoal leading-tight whitespace-pre-line"
                >
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  {label}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="mb-6">
              <DownloadAppButtons source="hero" />
            </div>

            {/* Trust Row */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal"
                >
                  <Check className="w-4 h-4 text-accent" strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT — food image */}
        <div className="relative min-h-[320px] md:min-h-0">
          <img
            src={heroBowl}
            alt="Healthy family meal bowl with grilled salmon, green beans, cherry tomatoes, couscous and pesto"
            className="absolute inset-0 w-full h-full object-cover"
            width={1280}
            height={1280}
          />
          {/* Soft fade from cream into image on the left edge for seamless blend */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-honey-cream to-transparent pointer-events-none hidden md:block" />
        </div>
      </div>
    </section>
  );
}
