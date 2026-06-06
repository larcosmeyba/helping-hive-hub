import { motion } from "framer-motion";
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

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* LEFT — copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4"
          >
            <span className="inline-block mb-5 text-[11px] font-extrabold tracking-[0.18em] uppercase text-[#1F5A2C]">
              See How It Works
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-charcoal leading-[1.05] mb-5">
              Plan. Shop. Save.<br />All in one app.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Create personalized meal plans, get smart grocery lists, and shop instantly with Instacart.
            </p>
          </motion.div>

          {/* RIGHT — 3 phones */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-3 gap-3 md:gap-6">
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
                  <p className="mt-4 text-xs md:text-sm font-semibold text-charcoal/80 text-center">
                    {p.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
