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
  "Shop at Kroger",
  "AI-Powered",
  "Built For Real Families",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a1a1a] min-h-[600px]">
      {/* Food image anchored to the right, fades into dark on the left */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[65%] lg:w-[60%] pointer-events-none">
        <img
          src={heroBowl}
          alt="Skillet of stir-fried chicken with broccoli, peppers and snap peas"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        {/* Smooth fade from dark into the image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #1a1a1a 0%, rgba(26,26,26,0.85) 25%, rgba(26,26,26,0.35) 55%, rgba(26,26,26,0) 90%)",
          }}
        />
      </div>
      {/* Mobile readability overlay */}
      <div className="absolute inset-0 bg-[#1a1a1a]/70 md:hidden pointer-events-none" />


      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        {/* LEFT — copy */}
        <div className="px-6 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl w-full"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full bg-white/[0.08] text-white"
            >
              <Heart className="w-3.5 h-3.5" fill="#ffffff" stroke="#ffffff" />
              Free For Every Family
            </span>

            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.05] mb-6">
              Save Money On Groceries.{" "}
              <span className="text-primary block mt-2">Feed Your Family Smarter.</span>
            </h1>

            <p className="text-base md:text-lg text-white/80 mb-7 leading-relaxed">
              Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {pills.map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-sm text-[12px] font-semibold text-white leading-tight whitespace-pre-line"
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90"
                >
                  <Check className="w-4 h-4 text-accent" strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
        {/* RIGHT — intentionally empty so the image shows through */}
        <div aria-hidden />
      </div>
    </section>

  );
}
