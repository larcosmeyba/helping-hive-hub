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
      <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Top badge: light green bg, dark green text */}
            <span
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full"
              style={{ backgroundColor: "#E6F4E6", color: "#1F5A2C" }}
            >
              <Heart className="w-3.5 h-3.5" fill="#1F5A2C" stroke="#1F5A2C" />
              Free For Every Family
            </span>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.05] mb-5">
              Save Money On Groceries.{" "}
              <span className="text-primary block mt-2">Feed Your Family Smarter.</span>
            </h1>

            <p className="text-base md:text-lg text-foreground/75 mb-7 max-w-xl leading-relaxed">
              Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {pills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-foreground/10 text-sm font-medium text-foreground/80 shadow-sm"
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
                className="text-base px-7 h-12 border-2 border-primary text-primary bg-white hover:bg-primary/5 font-semibold"
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70"
                >
                  <Check className="w-4 h-4" style={{ color: "#1F5A2C" }} />
                  {item}
                </span>
              ))}
            </div>

            <p className="text-sm font-semibold" style={{ color: "#1F5A2C" }}>
              Built for every family.
            </p>
            <p className="text-sm text-foreground/60">
              Especially helpful for SNAP, EBT, and budget-conscious households.
            </p>
          </motion.div>

          {/* RIGHT - Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] lg:aspect-auto lg:h-[640px]"
          >
            <img
              src={heroFamily}
              alt="Real family planning a weekly grocery budget at home"
              className="w-full h-full object-cover"
              width={1200}
              height={1500}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
