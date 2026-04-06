import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import mealFamilyDinner from "@/assets/meal-family-dinner.jpg";
import mealVariety from "@/assets/meal-variety.jpg";
import mealCollege from "@/assets/meal-college.jpg";
import mealSnapFriendly from "@/assets/meal-snap-friendly.jpg";

const plans = [
  { title: "Feed a Family on $50", desc: "7 days of balanced meals for a family of 4 on a tight budget.", budget: "$50 / week grocery budget", store: "Aldi / Walmart", tag: "Most Popular", slug: "feed-a-family-50", image: mealFamilyDinner },
  { title: "More Variety at $75", desc: "Nutritious options with flexible recipes and extra variety.", budget: "$75 / week grocery budget", store: "Kroger / Safeway", tag: null, slug: "more-variety-75", image: mealVariety },
  { title: "College Eats on $35", desc: "Quick, easy meals for dorm life and small kitchens.", budget: "$35 / week grocery budget", store: "Aldi / Walmart", tag: "Student Fav", slug: "college-eats-35", image: mealCollege },
  { title: "SNAP-Friendly Meals", desc: "Optimized for SNAP benefits with maximum nutritional value.", budget: "$45 / week grocery budget", store: "Walmart / WinCo", tag: "SNAP Eligible", slug: "snap-friendly-meals", image: mealSnapFriendly },
];

export function MealPlanSection() {
  return (
    <section id="meal-plan-examples" className="py-12 md:py-16 bg-card scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Meal Plan Examples
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Explore sample plans designed for different budgets and lifestyles.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            * Prices shown are based on California grocery averages. Your actual costs may vary by region.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl bg-background shadow-card border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300 flex flex-col overflow-hidden"
            >
              {plan.tag && (
                <span className="absolute top-3 left-3 z-10 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-honey text-primary-foreground">
                  {plan.tag}
                </span>
              )}
              <div className="h-40 overflow-hidden">
                <img
                  src={plan.image}
                  alt={plan.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={640}
                  height={640}
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{plan.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{plan.desc}</p>
                <div className="text-sm font-medium text-primary mb-1">{plan.budget}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Best at: {plan.store}</span>
                </div>
                <Button variant="heroOutline" size="sm" asChild>
                  <Link to={`/sample-plan/${plan.slug}`}>View Plan</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
