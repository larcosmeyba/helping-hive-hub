import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-12 md:py-16 bg-hive-black relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-honey-cream mb-6 leading-tight">
            Plan a week of meals that fits your budget.
          </h2>
          <p className="text-honey-cream/60 text-lg mb-10 leading-relaxed">
            Free forever for SNAP &amp; WIC families.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <Button variant="hero" size="lg" className="text-base px-8 h-12" asChild>
              <Link to="/signup">
                Join the Waitlist <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 h-12 border-2 border-primary text-primary bg-transparent hover:bg-primary/10 hover:text-primary font-semibold"
              asChild
            >
              <a href="#meal-plan-examples">
                View Sample Plans <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
