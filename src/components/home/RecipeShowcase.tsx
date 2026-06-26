import { motion } from "framer-motion";
import { Users, ShoppingCart, Wallet, PiggyBank, Store } from "lucide-react";

const results = [
  {
    family: "Family of 4",
    budget: "$75",
    meals: 18,
    total: "$73",
    savings: "$12",
    store: "Local pricing",
  },
  {
    family: "Single Adult",
    budget: "$40",
    meals: 12,
    total: "$38",
    savings: "$8",
    store: "Local pricing",
  },
  {
    family: "Couple",
    budget: "$55",
    meals: 14,
    total: "$53",
    savings: "$10",
    store: "Local pricing",
  },
];

export function BudgetResultsSection() {
  return (
    <section className="py-12 md:py-16 bg-honey-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Real Budget Results
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            See how families use Help The Hive to stay on budget.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-card shadow-card border border-border overflow-hidden"
            >
              <div className="p-6 space-y-5">
                {/* Family header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {r.family}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Store className="w-3 h-3" /> {r.store}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="w-4 h-4 text-primary" /> Weekly Budget
                    </span>
                    <span className="font-semibold text-foreground">{r.budget}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShoppingCart className="w-4 h-4 text-primary" /> Meals Generated
                    </span>
                    <span className="font-semibold text-foreground">{r.meals}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShoppingCart className="w-4 h-4 text-primary" /> Est. Grocery Total
                    </span>
                    <span className="font-semibold text-foreground">{r.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PiggyBank className="w-4 h-4 text-olive" /> Pantry Savings
                    </span>
                    <span className="font-semibold text-olive">{r.savings}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
