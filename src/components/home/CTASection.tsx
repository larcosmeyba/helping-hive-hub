import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-dark">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <span className="text-5xl mb-6 block">🐝</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-honey-cream mb-6">
            Ready to Start Saving?
          </h2>
          <p className="text-honey-cream/70 text-lg mb-10 leading-relaxed">
            Join Help The Hive and let our smart engine plan your meals,
            optimize your grocery list, and keep your family fed — on budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button variant="heroDark" size="lg" asChild>
              <Link to="/meal-plans">Explore Plans</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
