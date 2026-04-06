import { motion } from "framer-motion";
import { PiggyBank, ShoppingCart, Refrigerator, Users, Utensils, Leaf } from "lucide-react";

const features = [
  {
    icon: PiggyBank,
    title: "Budget-Based Meal Planning",
    desc: "Enter your weekly grocery budget and get a complete meal plan that fits. No guesswork, no overspending.",
  },
  {
    icon: ShoppingCart,
    title: "Smart Grocery Lists",
    desc: "Auto-generated grocery lists organized by store section with real pricing data to keep your trip fast and on budget.",
  },
  {
    icon: Refrigerator,
    title: "Pantry-Aware Recommendations",
    desc: "Tell us what you already have and we'll build meals around it — reducing waste and saving you money.",
  },
  {
    icon: Users,
    title: "Household Personalization",
    desc: "Plans adapt to your household size, dietary needs, allergies, cooking style, and food preferences.",
  },
  {
    icon: Utensils,
    title: "Practical Recipes",
    desc: "Every recipe is realistic, affordable, and designed for busy households — not aspirational food photography.",
  },
  {
    icon: Leaf,
    title: "Reduce Food Waste",
    desc: "Use what you have, buy what you need. Our system helps households waste less food and stretch every dollar.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built around how people actually eat
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Not another recipe app. Help The Hive is a complete food planning system designed for real budgets and real households.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group p-6 rounded-2xl bg-background border border-border hover:border-primary/20 hover:shadow-elevated transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
