import { motion } from "framer-motion";
import { UserPlus, CalendarDays, ShoppingCart } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Tell us about your household",
    desc: "Enter your household size, weekly grocery budget, dietary preferences, and food allergies. We use this to personalize everything.",
  },
  {
    icon: CalendarDays,
    step: "02",
    title: "Get a personalized meal plan",
    desc: "Our engine generates a full weekly meal plan tailored to your budget, preferences, and what you already have in your pantry.",
  },
  {
    icon: ShoppingCart,
    step: "03",
    title: "Shop smarter with your grocery list",
    desc: "Receive a budget-optimized grocery list organized by store section, with real pricing data to keep you on track.",
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
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Three steps to smarter meals
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No complicated setup. Just practical meal planning that saves you time and money.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center p-8 rounded-2xl bg-card border border-border shadow-card"
            >
              {/* Step number */}
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold tracking-wider uppercase rounded-full bg-primary text-primary-foreground">
                Step {item.step}
              </span>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 mt-2">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>

              {/* Connector arrow (hidden on last item and mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-[2px] bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
