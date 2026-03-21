import { motion } from "framer-motion";
import { DollarSign, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const plans = [
  { title: "Feed a Family on $50", desc: "7 days of balanced meals for a family of 4 on a tight budget.", budget: "$50 / week grocery budget", store: "Aldi / Walmart", tag: "Most Popular", slug: "feed-a-family-50" },
  { title: "More Variety at $75", desc: "Nutritious options with flexible recipes and extra variety.", budget: "$75 / week grocery budget", store: "Kroger / Safeway", tag: null, slug: "more-variety-75" },
  { title: "College Eats on $35", desc: "Quick, easy meals for dorm life and small kitchens.", budget: "$35 / week grocery budget", store: "Aldi / Walmart", tag: "Student Fav", slug: "college-eats-35" },
  { title: "SNAP-Friendly Meals", desc: "Optimized for SNAP benefits with maximum nutritional value.", budget: "$45 / week grocery budget", store: "Walmart / WinCo", tag: "SNAP Eligible", slug: "snap-friendly-meals" },
];

export function MealPlanSection() {
  return (
    <section id="meal-plan-examples" className="py-20 bg-card scroll-mt-20">
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
              className="relative p-6 rounded-2xl bg-background shadow-card border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300 flex flex-col"
            >
              {plan.tag && (
                <span className="absolute -top-3 left-4 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-honey text-primary-foreground">
                  {plan.tag}
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
