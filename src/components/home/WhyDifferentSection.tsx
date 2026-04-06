import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisons = [
  { feature: "Built around your real grocery budget", us: true, them: false },
  { feature: "Practical grocery list with pricing", us: true, them: false },
  { feature: "Pantry-aware meal suggestions", us: true, them: false },
  { feature: "Household size and dietary personalization", us: true, them: true },
  { feature: "Store-specific pricing data", us: true, them: false },
  { feature: "Designed for budget-conscious households", us: true, them: false },
  { feature: "Recipe collection", us: true, them: true },
];

export function WhyDifferentSection() {
  return (
    <section className="py-12 md:py-16 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            Why Help The Hive
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            More than just another meal planner
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Most meal planning apps focus on recipes. We focus on your budget, your pantry, and your real life.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-2xl border border-border bg-background overflow-hidden shadow-card"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center px-6 py-4 border-b border-border bg-muted/30">
            <span className="text-sm font-semibold text-foreground">Feature</span>
            <span className="w-24 text-center text-xs font-bold text-primary uppercase tracking-wider">Hive</span>
            <span className="w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Others</span>
          </div>

          {/* Rows */}
          {comparisons.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto] items-center px-6 py-3.5 ${
                i < comparisons.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="text-sm text-foreground">{row.feature}</span>
              <span className="w-24 flex justify-center">
                {row.us ? (
                  <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                )}
              </span>
              <span className="w-24 flex justify-center">
                {row.them ? (
                  <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                )}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
