import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function MissionSection() {
  return (
    <section className="py-10 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
            <Heart className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            Our Mission
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Helping households reduce grocery costs and simplify meal planning.
            We believe every family deserves nutritious meals without the stress
            of overspending. Help The Hive combines smart technology with real
            grocery data to make affordable eating effortless.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
