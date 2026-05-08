import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, ShoppingBasket, Truck } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Tell us your budget",
    desc: "Set your weekly grocery target and pick the store you shop at.",
  },
  {
    n: "02",
    icon: CalendarDays,
    title: "Get your weekly plan",
    desc: "We build a week of meals tailored to your household and budget.",
  },
  {
    n: "03",
    icon: ShoppingBasket,
    title: "Review your grocery list",
    desc: "Edit items, mark pantry staples, and confirm what you need.",
  },
  {
    n: "04",
    icon: Truck,
    title: "Check out via Instacart",
    desc: "One tap sends your full cart to Instacart for delivery or pickup.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 md:py-16 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            From budget to checkout in four steps
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No complicated setup. Just practical meal planning that saves you time and money.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-5 max-w-6xl mx-auto">
          {STEPS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center p-6 rounded-2xl bg-card border border-border shadow-card"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold tracking-wider uppercase rounded-full bg-primary text-primary-foreground">
                Step {item.n}
              </span>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 mt-2">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-base md:text-lg font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs md:text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
          Powered by Instacart for checkout — your delivery, your store, your schedule.
        </p>
      </div>
    </section>
  );
}
