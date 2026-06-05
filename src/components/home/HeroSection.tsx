import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Archive, ShoppingCart, Wallet, Heart, PlayCircle, Check } from "lucide-react";
import { DownloadAppButtons } from "@/components/DownloadAppButtons";
import phoneHome from "@/assets/phone-home.jpg.asset.json";
import phoneGrocery from "@/assets/phone-grocery.jpg.asset.json";
import phoneHive from "@/assets/phone-hive.jpg.asset.json";

const pills = [
  { icon: Sparkles, label: "AI Meal Planning" },
  { icon: Archive, label: "Pantry Tracking" },
  { icon: ShoppingCart, label: "Grocery Lists" },
  { icon: Wallet, label: "Budget Insights" },
  { icon: Heart, label: "Family Assistance" },
];

const trustItems = [
  "Free Forever",
  "Powered By Instacart",
  "Personalized With AI",
  "Uses What You Already Have",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-honey-cream">
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* LEFT: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full"
              style={{ backgroundColor: "#E6F4E6", color: "#1F5A2C" }}
            >
              <Heart className="w-3.5 h-3.5" fill="#1F5A2C" stroke="#1F5A2C" />
              Free For Every Family
            </span>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-[#1F5A2C] leading-[1.05] mb-5">
              Save Money On Groceries.{" "}
              <span className="text-primary block mt-2">Feed Your Family Smarter.</span>
            </h1>

            <p className="text-base md:text-lg text-charcoal/80 mb-7 max-w-xl leading-relaxed">
              Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {pills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#E8E0CC] text-sm font-medium text-[#1F5A2C] shadow-sm"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <DownloadAppButtons source="hero" />
              <Button
                variant="outline"
                size="lg"
                className="text-base px-7 h-12 border-2 border-[#1F5A2C] text-[#1F5A2C] bg-transparent hover:bg-[#1F5A2C]/5 font-semibold"
                asChild
              >
                <a href="#how-it-works">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  See How It Works
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/75"
                >
                  <Check className="w-4 h-4 text-[#1F5A2C]" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: 3 iPhone mockups */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            {/* Desktop / tablet: overlapping layout */}
            <div className="hidden sm:block relative h-[560px] md:h-[640px] lg:h-[680px]">
              {/* Left phone */}
              <div
                className="absolute left-0 top-10 w-[42%] origin-bottom"
                style={{ transform: "rotate(-6deg)", filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.18))" }}
              >
                <img src={phoneGrocery.url} alt="Help The Hive grocery list screen" className="w-full h-auto" />
              </div>
              {/* Right phone */}
              <div
                className="absolute right-0 top-10 w-[42%] origin-bottom"
                style={{ transform: "rotate(6deg)", filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.18))" }}
              >
                <img src={phoneHive.url} alt="Help The Hive Hive Assistant screen" className="w-full h-auto" />
              </div>
              {/* Center phone (front, larger) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-[50%] z-10"
                style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.25))" }}
              >
                <img src={phoneHome.url} alt="Help The Hive Today home screen" className="w-full h-auto" />
              </div>
            </div>

            {/* Mobile: horizontal scroll */}
            <div className="sm:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 snap-x snap-mandatory pb-2">
                {[phoneHome, phoneGrocery, phoneHive].map((p, i) => (
                  <div key={i} className="snap-center shrink-0 w-[70%]" style={{ filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.18))" }}>
                    <img src={p.url} alt="Help The Hive app screen" className="w-full h-auto" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
