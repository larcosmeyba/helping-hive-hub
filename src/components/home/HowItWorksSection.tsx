import { motion } from "framer-motion";
import { Check } from "lucide-react";
import todaysDashboard from "@/assets/todays-dashboard.png.asset.json";
import mealPlanScreen from "@/assets/meal-plan-screen.png.asset.json";
import groceryListScreen from "@/assets/grocery-list-screen.png.asset.json";

const phones = [
  {
    src: todaysDashboard.url,
    alt: "Help The Hive Today dashboard screen",
    label: "Today Dashboard",
  },
  {
    src: groceryListScreen.url,
    alt: "Help The Hive Grocery List screen",
    label: "Grocery List",
  },
  {
    src: mealPlanScreen.url,
    alt: "Help The Hive Meal Plan screen",
    label: "Meal Plan",
  },
];

const badges = [
  "AI Meal Planning",
  "Pantry Tracking",
  "Grocery Lists",
  "Family Assistance Resources",
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 md:py-16 bg-white scroll-mt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 md:mb-10"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-charcoal leading-[1.05] mb-4">
            Plan Meals. Build Grocery Lists. Shop Smarter.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Help The Hive creates budget-friendly meal plans, builds your grocery list, and gets you ready to shop in minutes.
          </p>
        </motion.div>

        {/* Phones */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-5xl mx-auto mb-8 md:mb-10">
          {phones.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div
                className="w-full"
                style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.15))" }}
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
              <p className="mt-3 text-xs md:text-sm font-semibold text-charcoal/80 text-center">
                {p.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2.5 md:gap-3"
        >
          {badges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E6F4E6] border border-[#1F5A2C]/15 text-sm font-semibold text-[#1F5A2C]"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              {b}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
