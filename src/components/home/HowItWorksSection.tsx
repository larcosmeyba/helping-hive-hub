import { motion } from "framer-motion";
import { Calendar, Home, ShoppingCart, Check } from "lucide-react";
import todaysDashboard from "@/assets/todays-dashboard.png.asset.json";
import mealPlanScreen from "@/assets/meal-plan-screen.png.asset.json";
import groceryListScreen from "@/assets/grocery-list-screen.png.asset.json";

const phones = [
  {
    src: mealPlanScreen.url,
    alt: "Help The Hive Meal Plan screen showing a week of meals",
    rotate: "-5deg",
    translateY: "40px",
    z: 10,
    scale: 0.85,
    float: [0, -6, 0],
  },
  {
    src: todaysDashboard.url,
    alt: "Help The Hive Today dashboard screen",
    rotate: "0deg",
    translateY: "0px",
    z: 20,
    scale: 1.15,
    float: [0, -10, 0],
  },
  {
    src: groceryListScreen.url,
    alt: "Help The Hive Grocery List screen with estimated total and categories",
    rotate: "5deg",
    translateY: "40px",
    z: 10,
    scale: 0.85,
    float: [0, -6, 0],
  },
];

const captions = [
  {
    icon: Calendar,
    title: "Meal Planning",
    desc: "Personalized weekly plans built around your budget.",
  },
  {
    icon: Home,
    title: "Today Dashboard",
    desc: "Your complete savings hub with AI-powered recommendations.",
  },
  {
    icon: ShoppingCart,
    title: "Grocery Lists",
    desc: "Automatically organized lists ready for Instacart checkout.",
  },
];

const metrics = [
  { value: "50,000+", label: "Meals Generated" },
  { value: "$1M+", label: "Estimated Savings" },
  { value: "100%", label: "Free To Use" },
  { value: "Powered By", label: "Instacart" },
];

const trustItems = [
  "Pantry-aware meal planning",
  "Grocery lists organized automatically",
  "Instacart checkout integration",
  "AI-powered household savings",
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 md:py-20 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-[0.15em] uppercase rounded-full bg-primary/15 text-primary">
            Everything In One App
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-charcoal mb-4">
            One App For Your Entire Grocery Budget
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Generate meal plans, manage your pantry, build grocery lists, shop through Instacart, and discover savings opportunities—all in one place.
          </p>
        </motion.div>

        {/* Metrics row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto mb-12 md:mb-10"
        >
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <div className="font-display text-2xl md:text-3xl font-bold text-primary">
                {m.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1 uppercase tracking-wider">
                {m.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Phone mockups */}
        <div className="max-w-6xl mx-auto">
          {/* Desktop / tablet: overlapping with glow */}
          <div className="relative hidden md:block mb-12">
            {/* Warm glow backdrop */}
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-[680px] h-[420px] rounded-full blur-3xl opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse at center, #D8A84C 0%, #FAF6EF 55%, transparent 75%)",
                }}
              />
            </div>

            <div className="relative flex items-end justify-center gap-0 px-4">
              {phones.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{
                    opacity: 1,
                    y: p.float,
                  }}
                  viewport={{ once: true }}
                  transition={{
                    opacity: { delay: i * 0.12, duration: 0.6 },
                    y: {
                      delay: i * 0.12,
                      duration: 4 + i * 0.3,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut",
                    },
                  }}
                  style={{
                    transform: `translateY(${p.translateY}) rotate(${p.rotate}) scale(${p.scale})`,
                    zIndex: p.z,
                    filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.22))",
                  }}
                  className={`w-[280px] lg:w-[320px] shrink-0 transition-transform duration-500 hover:scale-105 ${
                    i === 0 ? "-mr-14 lg:-mr-24" : i === 2 ? "-ml-14 lg:-ml-24" : ""
                  }`}
                >
                  <img
                    src={p.src}
                    alt={p.alt}
                    className="w-full h-auto"
                    width={1080}
                    height={1320}
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden -mx-4 px-4 mb-10 relative">
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-[320px] h-[280px] rounded-full blur-3xl opacity-60"
                style={{
                  background:
                    "radial-gradient(ellipse at center, #D8A84C 0%, #FAF6EF 55%, transparent 75%)",
                }}
              />
            </div>
            <div className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
              {phones.map((p, i) => (
                <div
                  key={i}
                  className="snap-center shrink-0 w-[72%]"
                  style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.18))" }}
                >
                  <img
                    src={p.src}
                    alt={p.alt}
                    className="w-full h-auto"
                    width={1080}
                    height={1320}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Trust statement */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 max-w-4xl mx-auto">
            {trustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-charcoal/80">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Captions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto px-2">
            {captions.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1F5A2C] mb-1">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
