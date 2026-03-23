import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Utensils, PiggyBank, Leaf, Eye } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-warm">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
              Smart Meal Planning
            </span>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
              Affordable Meal Planning for{" "}
              <span className="text-gradient-honey">Real Families</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Help The Hive helps households generate grocery lists and meal plans that
              stay within their real grocery budget.
            </p>

            <div className="flex flex-col items-center gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
              <a href="#meal-plan-examples" className="text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors">
                <Eye className="w-4 h-4 inline mr-1" /> Check out our free meal plan examples
              </a>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { icon: ShoppingCart, label: "Smart Grocery Lists", desc: "Auto-generated" },
              { icon: Utensils, label: "Balanced Meals", desc: "Nutrition optimized" },
              { icon: PiggyBank, label: "Budget Friendly", desc: "Stay on budget" },
              { icon: Leaf, label: "Less Waste", desc: "Use what you have" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center p-4 rounded-xl bg-card shadow-card">
                <item.icon className="w-8 h-8 text-primary mb-2" />
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
