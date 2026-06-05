import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Archive, ShoppingCart, Wallet, Heart, PlayCircle, Check } from "lucide-react";
import { DownloadAppButtons } from "@/components/DownloadAppButtons";

const heroFamily = "/hero-family.jpg";

const pills = [
  { icon: Sparkles, label: "AI Meal Planning" },
  { icon: Archive, label: "Pantry Tracking" },
  { icon: ShoppingCart, label: "Grocery Lists" },
  { icon: Wallet, label: "Budget Insights" },
  { icon: Heart, label: "Family Assistance" },
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
      {/* Background image layer */}
      <div className="absolute inset-0">
        <img
          src={heroFamily}
          alt=""
          className="w-full h-full object-cover"
          width={1200}
          height={1500}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          {/* Top badge: light green bg, dark green text */}
          <span
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full"
            style={{ backgroundColor: "#E6F4E6", color: "#1F5A2C" }}
          >
            <Heart className="w-3.5 h-3.5" fill="#1F5A2C" stroke="#1F5A2C" />
            Free For Every Family
          </span>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-5">
            Save Money On Groceries.{" "}
            <span className="text-primary block mt-2">Feed Your Family Smarter.</span>
          </h1>

          <p className="text-base md:text-lg text-white/80 mb-7 max-w-xl leading-relaxed">
            Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {pills.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium text-white shadow-sm"
              >
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <DownloadAppButtons source="hero" />
            <Button
              variant="outline"
              size="lg"
              className="text-base px-7 h-12 border-2 border-white text-white bg-transparent hover:bg-white/10 font-semibold"
              asChild
            >
              <a href="#how-it-works">
                <PlayCircle className="w-5 h-5 mr-2" />
                Watch Demo
              </a>
            </Button>
          </div>

          {/* Trust Row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
            {trustItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80"
              >
                <Check className="w-4 h-4" style={{ color: "#90EE90" }} />
                {item}
              </span>
            ))}
          </div>

          <p className="text-sm font-semibold" style={{ color: "#90EE90" }}>
            Built for every family.
          </p>
          <p className="text-sm text-white/70">
            Especially helpful for SNAP, EBT, and budget-conscious households.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
