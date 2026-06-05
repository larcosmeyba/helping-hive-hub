import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Archive, ShoppingCart, Wallet, Heart, PlayCircle, Check } from "lucide-react";
import { DownloadAppButtons } from "@/components/DownloadAppButtons";
import screenToday from "@/assets/hero-screen-today.png.asset.json";
import screenGrocery from "@/assets/hero-screen-grocery.png.asset.json";
import screenAssistant from "@/assets/hero-screen-assistant.png.asset.json";

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

const phones = [
  { src: screenAssistant.url, label: "Hive Assistant" },
  { src: screenToday.url, label: "Today" },
  { src: screenGrocery.url, label: "Grocery List" },
];

// Realistic iPhone frame — bezel + notch + screen mask.
function PhoneFrame({
  src,
  label,
  className = "",
  style,
}: {
  src: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-[2.5rem] bg-neutral-900 p-[6px] shadow-[0_30px_60px_-15px_rgba(15,40,15,0.35),0_15px_30px_-10px_rgba(15,40,15,0.25)] ring-1 ring-black/10 ${className}`}
      style={style}
    >
      {/* Side button hints */}
      <span className="absolute -left-[3px] top-[88px] w-[3px] h-[34px] rounded-l-sm bg-neutral-700/80" />
      <span className="absolute -left-[3px] top-[140px] w-[3px] h-[58px] rounded-l-sm bg-neutral-700/80" />
      <span className="absolute -left-[3px] top-[210px] w-[3px] h-[58px] rounded-l-sm bg-neutral-700/80" />
      <span className="absolute -right-[3px] top-[170px] w-[3px] h-[90px] rounded-r-sm bg-neutral-700/80" />

      {/* Inner screen */}
      <div className="relative overflow-hidden rounded-[2.1rem] bg-white">
        {/* Dynamic island / notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-[22px] w-[88px] rounded-full bg-neutral-900" />
        <img
          src={src}
          alt={`${label} screen`}
          loading="lazy"
          className="block w-full h-auto select-none pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-honey-cream">
      {/* Soft brand wash */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT — copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6"
          >
            <span
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-extrabold tracking-[0.15em] uppercase rounded-full"
              style={{ backgroundColor: "#E6F4E6", color: "#1F5A2C" }}
            >
              <Heart className="w-3.5 h-3.5" fill="#1F5A2C" stroke="#1F5A2C" />
              Free For Every Family
            </span>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] mb-5" style={{ color: "#1F5A2C" }}>
              Save Money On Groceries.{" "}
              <span className="block mt-2 text-primary">Feed Your Family Smarter.</span>
            </h1>

            <p className="text-base md:text-lg text-foreground/75 mb-7 max-w-xl leading-relaxed">
              Help The Hive combines AI meal planning, pantry tracking, grocery lists, budget insights, and family assistance resources to help families spend less and waste less.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {pills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-border text-sm font-medium text-foreground shadow-sm"
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
                className="text-base px-7 h-12 border-2 font-semibold"
                style={{ borderColor: "#1F5A2C", color: "#1F5A2C" }}
                asChild
              >
                <a href="#how-it-works">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  See How It Works
                </a>
              </Button>
            </div>

            {/* Trust Row */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80"
                >
                  <Check className="w-4 h-4" style={{ color: "#1F5A2C" }} />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* RIGHT — 3 iPhone mockups */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:col-span-6"
          >
            {/* Desktop / tablet — overlapping composition */}
            <div className="relative hidden sm:block mx-auto" style={{ maxWidth: 560, height: 600 }}>
              {/* Soft ambient shadow behind phones */}
              <div
                aria-hidden
                className="absolute left-1/2 top-[58%] -translate-x-1/2 w-[78%] h-[60%] rounded-[50%] blur-3xl opacity-50"
                style={{ background: "radial-gradient(ellipse at center, rgba(31,90,44,0.25), transparent 70%)" }}
              />

              {/* Left phone — behind, tilted left */}
              <motion.div
                initial={{ opacity: 0, x: 40, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: -8 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="absolute left-0 top-[60px] z-10"
                style={{ width: 215 }}
              >
                <PhoneFrame src={phones[0].src} label={phones[0].label} />
              </motion.div>

              {/* Right phone — behind, tilted right */}
              <motion.div
                initial={{ opacity: 0, x: -40, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: 8 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute right-0 top-[60px] z-10"
                style={{ width: 215 }}
              >
                <PhoneFrame src={phones[2].src} label={phones[2].label} />
              </motion.div>

              {/* Center phone — front, larger */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="absolute left-1/2 -translate-x-1/2 top-0 z-20"
                style={{ width: 260 }}
              >
                <PhoneFrame src={phones[1].src} label={phones[1].label} />
              </motion.div>
            </div>

            {/* Mobile — horizontal scroll snap */}
            <div className="sm:hidden -mx-4 px-4">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {phones.map((p) => (
                  <div key={p.label} className="snap-center shrink-0" style={{ width: 220 }}>
                    <PhoneFrame src={p.src} label={p.label} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-foreground/60 mt-1">Swipe to see more →</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
