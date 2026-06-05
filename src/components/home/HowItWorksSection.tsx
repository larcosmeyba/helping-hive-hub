import { motion } from "framer-motion";
import { Calendar, Home, ShoppingCart } from "lucide-react";
import todaysDashboard from "@/assets/todays-dashboard.png.asset.json";
import mealPlanScreen from "@/assets/meal-plan-screen.png.asset.json";
import groceryListScreen from "@/assets/grocery-list-screen.png.asset.json";

const phones = [
  {
    src: mealPlanScreen.url,
    alt: "Help The Hive Meal Plan screen showing a week of meals",
    rotate: "-6deg",
    translateY: "30px",
    z: 10,
    scale: 0.92,
  },
  {
    src: todaysDashboard.url,
    alt: "Help The Hive Today dashboard screen",
    rotate: "0deg",
    translateY: "0px",
    z: 20,
    scale: 1.04,
  },
  {
    src: groceryListScreen.url,
    alt: "Help The Hive Grocery List screen with estimated total and categories",
    rotate: "6deg",
    translateY: "30px",
    z: 10,
    scale: 0.92,
  },
];

const captions = [
  {
    icon: Calendar,
    title: "Meal Plan",
    desc: "Generate personalized meal plans based on your budget, family size, and preferences.",
  },
  {
    icon: Home,
    title: "Today's Dashboard",
    desc: "Your complete savings hub with meal planning, Hive AI, family assistance, and grocery management.",
  },
  {
    icon: ShoppingCart,
    title: "Grocery List",
    desc: "Automatically organized grocery lists with estimated totals and Instacart checkout.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-[0.15em] uppercase rounded-full bg-primary/15 text-primary">
            Everything In One App
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-charcoal mb-3">
            Everything You Need To Plan, Shop, And Save
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Meal planning, pantry tracking, grocery lists, and AI-powered budgeting in one app.
          </p>
        </motion.div>

        {/* Phone mockups */}
        <div className="max-w-6xl mx-auto">
          {/* Desktop / tablet: overlapping */}
          <div className="hidden md:flex items-end justify-center gap-0 mb-12 px-4">
            {phones.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                style={{
                  transform: `translateY(${p.translateY}) rotate(${p.rotate}) scale(${p.scale})`,
                  zIndex: p.z,
                  filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.18))",
                }}
                className="w-[280px] lg:w-[320px] shrink-0"
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

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden -mx-4 px-4 mb-10">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
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
